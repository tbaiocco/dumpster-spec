import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../users/user.service';
import {
  DumpService,
  CreateDumpRequest,
  DumpProcessingResult,
} from '../dumps/services/dump.service';
import { HelpCommand } from './commands/help.command';
import { RecentCommand } from './commands/recent.command';
import { ReportCommand } from './commands/report.command';
import { SearchCommand } from './commands/search.command';

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
  caption?: string;
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
    private readonly dumpService: DumpService,
    private readonly helpCommand: HelpCommand,
    private readonly recentCommand: RecentCommand,
    private readonly reportCommand: ReportCommand,
    private readonly searchCommand: SearchCommand,
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

  async downloadFile(fileId: string): Promise<Buffer> {
    this.logger.log(`Downloading file from ${fileId}`);

    try {
      // First, get file info from Telegram API
      const getFileUrl = `https://api.telegram.org/bot${this.botToken}/getFile?file_id=${fileId}`;
      const fileInfoResponse = await fetch(getFileUrl);

      if (!fileInfoResponse.ok) {
        throw new Error(`Failed to get file info: ${fileInfoResponse.status}`);
      }

      const fileInfo = await fileInfoResponse.json();

      if (!fileInfo.ok || !fileInfo.result?.file_path) {
        throw new Error('Invalid file info response from Telegram');
      }

      // Now download the actual file using the file path
      const filePath = fileInfo.result.file_path;
      const fileUrl = `https://api.telegram.org/file/bot${this.botToken}/${filePath}`;
      const response = await fetch(fileUrl);

      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      this.logger.error(`Error downloading file ${fileId}:`, error);
      throw error;
    }
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
          `User not found for Telegram chat ${chatId}, checking for registration`,
        );

        // Check if this is a phone number registration attempt
        if (
          message.text &&
          (await this.handlePhoneNumberRegistration(message))
        ) {
          return; // Registration handled
        }

        // Ask for phone number registration
        await this.sendTextMessage(
          chatId,
          '👋 Welcome! Please complete your registration by sending your phone number to get started.\n\n' +
            'Example: +351999888777',
        );
        return;
      }

      // Handle different message types
      if (message.text) {
        await this.handleTextMessageWithUser(message, user.id);
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

  // New method to handle phone number registration
  async handlePhoneNumberRegistration(
    message: TelegramMessage,
  ): Promise<boolean> {
    const chatId = message.chat.id;
    const text = message.text!;

    // Detect phone number pattern (international format)
    const phonePattern = /^\+?[1-9]\d{1,14}$/;
    const cleanPhone = text.replaceAll(/[\s\-()]/g, '');

    if (!phonePattern.test(cleanPhone)) {
      return false; // Not a valid phone number
    }

    try {
      // Check if user already exists with this phone number
      const existingUser = await this.userService.findByPhone(cleanPhone);

      if (existingUser) {
        // Update existing user with Telegram chat ID
        await this.userService.update(existingUser.id, {
          chat_id_telegram: chatId.toString(),
        });

        await this.sendTextMessage(
          chatId,
          `✅ Welcome back! Your account has been linked to Telegram.\n\n` +
            `You can now send me:\n` +
            `📝 Text messages to save thoughts\n` +
            `🎤 Voice messages\n` +
            `📸 Photos\n` +
            `📄 Documents\n\n` +
            `Try sending: "Preciso lembrar de comprar leite hoje"`,
        );

        this.logger.log(
          `Linked existing user ${existingUser.id} to Telegram chat ${chatId}`,
        );
        return true;
      } else {
        // Create new user
        const newUser = await this.userService.create({
          phone_number: cleanPhone,
          timezone: 'Europe/Lisbon', // Default for Portuguese users
          language: 'pt',
        });

        // Update with Telegram chat ID
        await this.userService.update(newUser.id, {
          chat_id_telegram: chatId.toString(),
        });

        await this.sendTextMessage(
          chatId,
          `🎉 Registration complete! Welcome to your personal life inbox.\n\n` +
            `I'll help you capture and organize everything:\n` +
            `📝 Notes and reminders\n` +
            `🎤 Voice messages\n` +
            `📸 Photos and documents\n` +
            `🔍 Smart search and categorization\n\n` +
            `Try sending: "Reunião com cliente amanhã às 15h"`,
        );

        this.logger.log(
          `Created new user ${newUser.id} for Telegram chat ${chatId}`,
        );
        return true;
      }
    } catch (error) {
      this.logger.error('Error during phone registration:', error);
      await this.sendTextMessage(
        chatId,
        '❌ Sorry, there was an error during registration. Please try again or contact support.',
      );
      return true; // Handled, even if failed
    }
  }

  private async handleTextMessageWithUser(
    message: TelegramMessage,
    userId: string,
  ): Promise<void> {
    const chatId = message.chat.id;
    const text = message.text!;

    this.logger.log(`Handling text message: "${text.substring(0, 50)}..."`);

    // Handle bot commands
    if (text.startsWith('/')) {
      await this.handleCommand(text, chatId, userId);
      return; // Stop processing after handling command
    }

    try {
      // Create dump request for enhanced processing
      const dumpRequest: CreateDumpRequest = {
        userId,
        content: text,
        contentType: 'text',
        metadata: {
          source: 'telegram',
          messageId: message.message_id.toString(),
          chatId: chatId.toString(),
        },
      };

      // Process with enhanced ContentRouterService integration
      const result = await this.dumpService.createDumpEnhanced(dumpRequest);

      // Send success response with processing details
      await this.sendFormattedResponse(
        chatId,
        '✅ Processed Successfully',
        this.formatProcessingResult(result),
        result.dump.category?.name || 'General',
        (result.dump.ai_confidence || 95) / 100,
        message.message_id,
      );
    } catch (error) {
      this.logger.error('Error processing text message:', error);
      await this.sendTextMessage(
        chatId,
        '❌ Sorry, something went wrong while processing your message. Please try again later.',
      );
    }
  }

  private async handleVoiceMessage(
    message: TelegramMessage,
    userId: string,
  ): Promise<void> {
    const chatId = message.chat.id;
    const voice = message.voice!;

    this.logger.log(`Handling voice message: ${voice.file_id}`);

    try {
      // Download the voice file
      const voiceBuffer = await this.downloadFile(voice.file_id);

      // Create dump request for enhanced voice processing
      const dumpRequest: CreateDumpRequest = {
        userId,
        content: 'Voice message',
        contentType: 'voice',
        metadata: {
          source: 'telegram',
          messageId: message.message_id.toString(),
          chatId: chatId.toString(),
          mimeType: voice.mime_type || 'audio/ogg',
          fileSize: voice.file_size,
        },
        mediaBuffer: voiceBuffer,
      };

      // Process with enhanced ContentRouterService integration
      const result = await this.dumpService.createDumpEnhanced(dumpRequest);

      // Send success response with processing details
      await this.sendFormattedResponse(
        chatId,
        '🎤 Processed Successfully',
        this.formatProcessingResult(result),
        result.dump.category?.name || 'Audio',
        (result.dump.ai_confidence || 90) / 100,
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
      // Download the photo file
      const photoBuffer = await this.downloadFile(largestPhoto.file_id);

      // Create dump request for enhanced image processing
      const dumpRequest: CreateDumpRequest = {
        userId,
        content: message.caption || 'Image',
        contentType: 'image',
        originalText: message.caption,
        metadata: {
          source: 'telegram',
          messageId: message.message_id.toString(),
          chatId: chatId.toString(),
          mimeType: 'image/jpeg',
          fileSize: largestPhoto.file_size,
        },
        mediaBuffer: photoBuffer,
      };

      // Process with enhanced ContentRouterService integration
      const result = await this.dumpService.createDumpEnhanced(dumpRequest);

      // Send success response with processing details
      await this.sendFormattedResponse(
        chatId,
        '📷 Processed Successfully',
        this.formatProcessingResult(result),
        result.dump.category?.name || 'Media',
        (result.dump.ai_confidence || 85) / 100,
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
    const chatId = message.chat.id;
    const document = message.document!;

    this.logger.log(`Handling document message: ${document.file_id}`);

    try {
      // Download the document file
      const documentBuffer = await this.downloadFile(document.file_id);

      // Create dump request for enhanced document processing
      const dumpRequest: CreateDumpRequest = {
        userId,
        content: message.caption || document.file_name || 'Document',
        contentType: 'document',
        originalText: message.caption,
        metadata: {
          source: 'telegram',
          messageId: message.message_id.toString(),
          chatId: chatId.toString(),
          fileName: document.file_name,
          mimeType: document.mime_type,
          fileSize: document.file_size,
        },
        mediaBuffer: documentBuffer,
      };

      // Process with enhanced ContentRouterService integration
      const result = await this.dumpService.createDumpEnhanced(dumpRequest);

      // Send success response with processing details
      await this.sendFormattedResponse(
        chatId,
        '📄 Processed Successfully',
        this.formatProcessingResult(result),
        result.dump.category?.name || 'Documents',
        (result.dump.ai_confidence || 85) / 100,
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
    const [cmd] = command.split(' ');

    // Get the user entity for command handlers
    const user = await this.userService.findOne(userId);
    if (!user) {
      await this.sendTextMessage(
        chatId,
        '❌ User not found. Please restart with /start',
      );
      return;
    }

    try {
      switch (cmd.toLowerCase()) {
        case '/start': {
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
        }

        case '/help': {
          const helpMessage = this.helpCommand.execute();
          await this.sendTextMessage(chatId, helpMessage);
          break;
        }

        case '/recent': {
          const recentMessage = await this.recentCommand.execute(user);
          await this.sendTextMessage(chatId, recentMessage);
          break;
        }

        case '/search': {
          const searchMessage = await this.searchCommand.execute(user, command);
          await this.sendTextMessage(chatId, searchMessage);
          break;
        }

        case '/report': {
          const reportMessage = await this.reportCommand.execute(user, command);
          await this.sendTextMessage(chatId, reportMessage);
          break;
        }

        default: {
          await this.sendTextMessage(
            chatId,
            '❓ Unknown command. Use /help to see available commands.',
          );
        }
      }
    } catch (error) {
      this.logger.error(`Error executing command ${cmd}:`, error);
      await this.sendTextMessage(
        chatId,
        '❌ Sorry, something went wrong executing that command. Please try again.',
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

  /**
   * Format processing result for user-friendly display
   */
  private formatProcessingResult(result: DumpProcessingResult): string {
    const { dump } = result;
    const entities = dump.extracted_entities;

    let content = '';

    // Summary (clean, no asterisks)
    if (dump.ai_summary) {
      content += `📝 <b>Summary:</b> ${dump.ai_summary}\n\n`;
    }

    // Extract structured data for beautiful display
    let urgency = 'low';
    let actionItems: string[] = [];

    if (entities) {
      urgency = entities.urgency || 'low';
      actionItems = entities.actionItems || [];
    }

    // Show urgency if not low
    if (urgency !== 'low') {
      const urgencyEmoji = urgency === 'high' ? '🔴' : '🟡';
      content += `${urgencyEmoji} <b>Urgency:</b> ${urgency.charAt(0).toUpperCase() + urgency.slice(1)}\n\n`;
    }

    // Show action items if any
    if (actionItems.length > 0) {
      content += `✅ <b>Action Items:</b>\n`;
      const itemsToShow = actionItems.slice(0, 3);
      for (const [index, item] of itemsToShow.entries()) {
        content += `${index + 1}. ${item}\n`;
      }
      if (actionItems.length > 3) {
        content += `... and ${actionItems.length - 3} more\n`;
      }
      content += '\n';
    }

    // Clean content (remove any remaining asterisks and technical details)
    content = content.replaceAll('*', ''); // Remove markdown asterisks

    return content.length > 3500 ? content.substring(0, 3500) + '...' : content;
  }
}
