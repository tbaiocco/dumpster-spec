import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../users/user.service';

export interface TelegramMessage {
  message_id: number;
  from: {
    id: number;
    first_name: string;
    username?: string;
    language_code?: string;
  };
  chat: {
    id: number;
    type: string;
  };
  date: number;
  text?: string;
  voice?: {
    file_id: string;
    duration: number;
    mime_type?: string;
    file_size?: number;
  };
  photo?: Array<{
    file_id: string;
    width: number;
    height: number;
    file_size?: number;
  }>;
  document?: {
    file_id: string;
    file_name?: string;
    mime_type?: string;
    file_size?: number;
  };
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

export interface TelegramSendMessageOptions {
  chat_id: number;
  text: string;
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  reply_to_message_id?: number;
  reply_markup?: {
    inline_keyboard?: Array<
      Array<{
        text: string;
        callback_data?: string;
        url?: string;
      }>
    >;
  };
}

export interface TelegramFile {
  file_id: string;
  file_unique_id: string;
  file_size?: number;
  file_path?: string;
}

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly botToken: string;
  private readonly apiUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {
    this.botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN') || '';
    this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;

    if (!this.botToken) {
      this.logger.warn('Telegram bot token not configured');
    }
  }

  async sendMessage(
    options: TelegramSendMessageOptions,
  ): Promise<TelegramMessage> {
    this.logger.log(`Sending message to chat ${options.chat_id}`);

    const response = await fetch(`${this.apiUrl}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Failed to send Telegram message: ${error}`);
      throw new Error(`Telegram API error: ${response.status} ${error}`);
    }

    const data = (await response.json()) as {
      ok: boolean;
      result: TelegramMessage;
    };

    if (!data.ok) {
      throw new Error('Telegram API returned not ok');
    }

    return data.result;
  }

  async sendTextMessage(
    chatId: number,
    text: string,
    replyToMessageId?: number,
  ): Promise<TelegramMessage> {
    return this.sendMessage({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_to_message_id: replyToMessageId,
    });
  }

  async sendFormattedResponse(
    chatId: number,
    title: string,
    content: string,
    category?: string,
    confidence?: number,
    replyToMessageId?: number,
  ): Promise<TelegramMessage> {
    let text = `✅ <b>${title}</b>\n\n`;
    text += `${content}\n\n`;

    if (category) {
      text += `📁 <b>Category:</b> ${category}\n`;
    }

    if (confidence !== undefined) {
      const confidencePercent = Math.round(confidence * 100);
      text += `🎯 <b>Confidence:</b> ${confidencePercent}%\n`;
    }

    text += `\n<i>Your content has been saved!</i>`;

    return this.sendMessage({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_to_message_id: replyToMessageId,
    });
  }

  async getFile(fileId: string): Promise<TelegramFile> {
    this.logger.log(`Getting file info for ${fileId}`);

    const response = await fetch(`${this.apiUrl}/getFile?file_id=${fileId}`);

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Failed to get Telegram file: ${error}`);
      throw new Error(`Telegram API error: ${response.status} ${error}`);
    }

    const data = (await response.json()) as {
      ok: boolean;
      result: TelegramFile;
    };

    if (!data.ok) {
      throw new Error('Telegram API returned not ok');
    }

    return data.result;
  }

  async downloadFile(filePath: string): Promise<Buffer> {
    this.logger.log(`Downloading file from ${filePath}`);

    const fileUrl = `https://api.telegram.org/file/bot${this.botToken}/${filePath}`;
    const response = await fetch(fileUrl);

    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async processUpdate(update: TelegramUpdate): Promise<void> {
    try {
      if (!update.message) {
        this.logger.warn('Received update without message');
        return;
      }

      const message = update.message;
      const chatId = message.chat.id;
      const userId = message.from.id;

      this.logger.log(
        `Processing message from user ${userId} in chat ${chatId}`,
      );

      // Find or create user based on chat ID
      const user = await this.userService.findByChatId(
        chatId.toString(),
        'telegram',
      );

      if (!user) {
        this.logger.log(
          `User not found for Telegram chat ${chatId}, creating placeholder`,
        );
        // For now, we'll need a phone number to create a user
        // This will be handled by the authentication flow
        await this.sendTextMessage(
          chatId,
          '👋 Welcome! Please complete your registration by sending your phone number to get started.',
        );
        return;
      }

      // Handle different message types
      if (message.text) {
        await this.handleTextMessage(message, user.id);
      } else if (message.voice) {
        await this.handleVoiceMessage(message, user.id);
      } else if (message.photo) {
        await this.handlePhotoMessage(message, user.id);
      } else if (message.document) {
        await this.handleDocumentMessage(message, user.id);
      } else {
        await this.sendTextMessage(
          chatId,
          "⚠️ Sorry, I don't support this message type yet. Please send text, voice, photos, or documents.",
        );
      }
    } catch (error) {
      this.logger.error('Error processing Telegram update:', error);

      if (update.message?.chat.id) {
        await this.sendTextMessage(
          update.message.chat.id,
          '❌ Sorry, something went wrong. Please try again later.',
        );
      }
    }
  }

  private async handleTextMessage(
    message: TelegramMessage,
    userId: string,
  ): Promise<void> {
    const chatId = message.chat.id;
    const text = message.text!;

    this.logger.log(`Handling text message: "${text.substring(0, 50)}..."`);

    // Handle bot commands
    if (text.startsWith('/')) {
      await this.handleCommand(text, chatId, userId);
      return;
    }

    // For now, just acknowledge the message
    // This will be integrated with DumpService in T030
    await this.sendFormattedResponse(
      chatId,
      'Content Received',
      text.length > 100 ? `${text.substring(0, 100)}...` : text,
      'General',
      0.95,
      message.message_id,
    );
  }

  private async handleVoiceMessage(
    message: TelegramMessage,
    userId: string,
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _userId = userId;
    const chatId = message.chat.id;
    const voice = message.voice!;

    this.logger.log(`Handling voice message: ${voice.file_id}`);

    try {
      await this.getFile(voice.file_id);
      // Voice processing will be implemented in T037

      await this.sendFormattedResponse(
        chatId,
        'Voice Message Received',
        `Voice message (${voice.duration}s) is being processed...`,
        'Audio',
        0.9,
        message.message_id,
      );
    } catch (error) {
      this.logger.error('Error handling voice message:', error);
      await this.sendTextMessage(chatId, '❌ Failed to process voice message.');
    }
  }

  private async handlePhotoMessage(
    message: TelegramMessage,
    userId: string,
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _userId = userId;
    const chatId = message.chat.id;
    const photos = message.photo!;

    // Get the largest photo
    const largestPhoto = photos.reduce(
      (prev, current) =>
        (prev.file_size || 0) > (current.file_size || 0) ? prev : current,
      photos[0],
    );

    this.logger.log(`Handling photo message: ${largestPhoto.file_id}`);

    try {
      await this.getFile(largestPhoto.file_id);
      // Image processing will be implemented in T038

      await this.sendFormattedResponse(
        chatId,
        'Image Received',
        'Image is being processed for text extraction...',
        'Media',
        0.85,
        message.message_id,
      );
    } catch (error) {
      this.logger.error('Error handling photo message:', error);
      await this.sendTextMessage(chatId, '❌ Failed to process image.');
    }
  }

  private async handleDocumentMessage(
    message: TelegramMessage,
    userId: string,
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _userId = userId;
    const chatId = message.chat.id;
    const document = message.document!;

    this.logger.log(`Handling document message: ${document.file_id}`);

    try {
      await this.getFile(document.file_id);

      await this.sendFormattedResponse(
        chatId,
        'Document Received',
        `Document "${document.file_name || 'Unknown'}" is being processed...`,
        'Documents',
        0.8,
        message.message_id,
      );
    } catch (error) {
      this.logger.error('Error handling document message:', error);
      await this.sendTextMessage(chatId, '❌ Failed to process document.');
    }
  }

  private async handleCommand(
    command: string,
    chatId: number,
    userId: string,
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _userId = userId;
    const [cmd] = command.split(' ');

    switch (cmd.toLowerCase()) {
      case '/start':
        await this.sendTextMessage(
          chatId,
          '👋 Welcome to Clutter.AI!\n\n' +
            'I help you capture and organize any content you send me.\n\n' +
            'Send me:\n' +
            '📝 Text messages\n' +
            '🎤 Voice messages\n' +
            '📷 Photos\n' +
            '📄 Documents\n\n' +
            'Use /help for more commands.',
        );
        break;

      case '/help':
        await this.sendTextMessage(
          chatId,
          '🔧 <b>Available Commands:</b>\n\n' +
            '/start - Welcome message\n' +
            '/help - Show this help\n' +
            '/recent - Show recent content\n' +
            '/search - Search your content\n' +
            '/report - Report an issue\n\n' +
            '<i>Just send me any content to get started!</i>',
        );
        break;

      case '/recent':
        // Will be implemented with DumpService
        await this.sendTextMessage(
          chatId,
          '📋 Recent content feature coming soon!',
        );
        break;

      case '/search':
        // Will be implemented in Phase 4
        await this.sendTextMessage(chatId, '🔍 Search feature coming soon!');
        break;

      case '/report':
        // Will be implemented in Phase 5
        await this.sendTextMessage(chatId, '🚨 Report feature coming soon!');
        break;

      default:
        await this.sendTextMessage(
          chatId,
          '❓ Unknown command. Use /help to see available commands.',
        );
    }
  }

  async setWebhook(url: string): Promise<void> {
    this.logger.log(`Setting webhook to ${url}`);

    const response = await fetch(`${this.apiUrl}/setWebhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        allowed_updates: ['message'],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to set webhook: ${error}`);
    }

    this.logger.log('Webhook set successfully');
  }

  async deleteWebhook(): Promise<void> {
    this.logger.log('Deleting webhook');

    const response = await fetch(`${this.apiUrl}/deleteWebhook`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to delete webhook: ${error}`);
    }

    this.logger.log('Webhook deleted successfully');
  }
}
