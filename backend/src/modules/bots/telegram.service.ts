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
import { UpcomingCommand } from './commands/upcoming.command';
import { TrackCommand } from './commands/track.command';
import { SearchCommand } from './commands/search.command';
import { ReportCommand } from './commands/report.command';
import { MetricsService } from '../metrics/metrics.service';
import { FeatureType } from '../../entities/feature-usage.entity';
import { MessageFormatterHelper } from './helpers/message-formatter.helper';
import { ResponseFormatterService } from '../ai/formatter.service';
import { EntityExtractionResult } from '../ai/extraction.service';
import { ContentAnalysisResponse } from '../ai/claude.service';
import { User } from 'src/entities/user.entity';

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
    private readonly upcomingCommand: UpcomingCommand,
    private readonly trackCommand: TrackCommand,
    private readonly reportCommand: ReportCommand,
    private readonly searchCommand: SearchCommand,
    private readonly responseFormatterService: ResponseFormatterService,
    private readonly metricsService: MetricsService,
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
    user: User,
    result: DumpProcessingResult,
    replyToMessageId?: number,
  ): Promise<string> {

    // check user notification preferences
    if (user && user.notification_preferences?.instant_notifications === false) {
      this.logger.debug(`User ${user.id} has disabled instant_notifications. Skipping...`);
      return 'skipped';
    }

    // Extract analysis and entities from the dump
    const dump = result.dump;
    const extractedEntities = dump.extracted_entities || {};

    // Build ContentAnalysisResponse from dump data
    const analysis: ContentAnalysisResponse = {
      summary: dump.ai_summary || '',
      category: dump.category?.name || 'General',
      categoryConfidence: (dump.ai_confidence || 95) / 100,
      extractedEntities: {
        dates: extractedEntities.entities?.dates || [],
        times: extractedEntities.entities?.times || [],
        locations: extractedEntities.entities?.locations || [],
        people: extractedEntities.entities?.people || [],
        organizations: extractedEntities.entities?.organizations || [],
        amounts: extractedEntities.entities?.amounts || [],
        tags: [],
      },
      actionItems: extractedEntities.actionItems || [],
      sentiment:
        (extractedEntities.sentiment as 'positive' | 'neutral' | 'negative') ||
        'neutral',
      urgency:
        (extractedEntities.urgency as 'low' | 'medium' | 'high') || 'low',
      confidence: (dump.ai_confidence || 95) / 100,
    };

    // Build EntityExtractionResult from dump data
    const entities: EntityExtractionResult = {
      entities: (extractedEntities.entityDetails || []).map((entity: any) => ({
        type: entity.type as
          | 'date'
          | 'time'
          | 'location'
          | 'person'
          | 'organization'
          | 'amount'
          | 'phone'
          | 'email'
          | 'url',
        value: entity.value,
        confidence: entity.confidence,
        context: entity.context,
        position: entity.position,
      })),
      summary: extractedEntities.entitySummary || {
        totalEntities: 0,
        entitiesByType: {},
        averageConfidence: 0,
      },
      structuredData: {
        dates: extractedEntities.entities?.dates || [],
        times: extractedEntities.entities?.times || [],
        locations: extractedEntities.entities?.locations || [],
        people: extractedEntities.entities?.people || [],
        organizations: extractedEntities.entities?.organizations || [],
        amounts: extractedEntities.entities?.amounts || [],
        contacts: extractedEntities.entities?.contacts || {
          phones: [],
          emails: [],
          urls: [],
        },
      },
    };

    // Use ResponseFormatterService with brief format
    const formatted =
      await this.responseFormatterService.formatAnalysisResponse(
        user.id,
        analysis,
        entities,
        {
          platform: 'telegram',
          format: 'brief',
          includeEmojis: true,
          includeMarkdown: true,
        },
      );

    const message = await this.sendMessage({
      chat_id: parseInt(user.chat_id_telegram!),
      text: formatted.html || formatted.text,
      parse_mode: 'HTML',
      reply_to_message_id: replyToMessageId,
    });

    return message.message_id.toString();
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
        await this.handleTextMessageWithUser(message, user);
      } else if (message.voice) {
        await this.handleVoiceMessage(message, user);
      } else if (message.photo) {
        await this.handlePhotoMessage(message, user);
      } else if (message.document) {
        await this.handleDocumentMessage(message, user);
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
      // Check if user exists with this phone number
      const existingUser = await this.userService.findByPhone(cleanPhone);

      if (existingUser) {
        // Link existing user to Telegram chat ID
        await this.userService.update(existingUser.id, {
          chat_id_telegram: chatId.toString(),
        });

        await this.sendTextMessage(
          chatId,
          `✅ Welcome! Your account has been linked to Telegram.\n\n` +
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
        // User not found - they need to register first
        await this.sendTextMessage(
          chatId,
          `❌ No account found with phone number ${cleanPhone}.\n\n` +
            `Please register first at:\nhttps://theclutter.app\n\n` +
            `Then send your registered phone number here to link your account.`,
        );

        this.logger.log(
          `Phone number ${cleanPhone} not found, user needs to register at website`,
        );
        return true; // Handled
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
    user: User,
  ): Promise<void> {
    const chatId = message.chat.id;
    const text = message.text!;

    this.logger.log(`Handling text message: "${text.substring(0, 50)}..."`);

    // Handle bot commands
    if (text.startsWith('/')) {
      await this.handleCommand(text, chatId, user.id);
      return; // Stop processing after handling command
    }

    try {
      // Create dump request for enhanced processing
      const dumpRequest: CreateDumpRequest = {
        userId: user.id,
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
        user,
        result,
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
    user: User,
  ): Promise<void> {
    const chatId = message.chat.id;
    const voice = message.voice!;

    this.logger.log(`Handling voice message: ${voice.file_id}`);

    try {
      // Download the voice file
      const voiceBuffer = await this.downloadFile(voice.file_id);

      // Create dump request for enhanced voice processing
      const dumpRequest: CreateDumpRequest = {
        userId: user.id,
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
        user,
        result,
        message.message_id,
      );
    } catch (error) {
      this.logger.error('Error handling voice message:', error);
      await this.sendTextMessage(chatId, '❌ Failed to process voice message.');
    }
  }

  private async handlePhotoMessage(
    message: TelegramMessage,
    user: User,
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
        userId: user.id,
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
        user,
        result,
        message.message_id,
      );
    } catch (error) {
      this.logger.error('Error handling photo message:', error);
      await this.sendTextMessage(chatId, '❌ Failed to process image.');
    }
  }

  private async handleDocumentMessage(
    message: TelegramMessage,
    user: User,
  ): Promise<void> {
    const chatId = message.chat.id;
    const document = message.document!;

    this.logger.log(`Handling document message: ${document.file_id}`);

    try {
      // Download the document file
      const documentBuffer = await this.downloadFile(document.file_id);

      // Create dump request for enhanced document processing
      const dumpRequest: CreateDumpRequest = {
        userId: user.id,
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
        user,
        result,
        message.message_id,
      );
    } catch (error) {
      this.logger.error('Error handling document message:', error);
      await this.sendTextMessage(chatId, '❌ Failed to process document.');
    }
  }

  private trackBotCommand(command: string, userId: string): void {
    this.metricsService.fireAndForget(() =>
      this.metricsService.trackFeature({
        featureType: FeatureType.BOT_COMMAND,
        detail: command,
        userId,
        metadata: {
          platform: 'telegram',
        },
      }),
    );
  }

  private async handleCommand(
    command: string,
    chatId: number,
    userId: string,
  ): Promise<void> {
    const [cmd] = command.split(' ');

    // Track bot command usage
    this.trackBotCommand(cmd.toLowerCase(), userId);

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
          const helpMessage = this.helpCommand.execute('telegram');
          await this.sendTextMessage(chatId, helpMessage);
          break;
        }

        case '/recent': {
          const recentMessage = await this.recentCommand.execute(
            user,
            5,
            'telegram',
          );
          await this.sendTextMessage(chatId, recentMessage);
          break;
        }

        case '/upcoming':
        case '/next': {
          // Parse optional hours parameter: /upcoming 48
          const parts = command.split(' ');
          const hours =
            parts.length > 1 ? Number.parseInt(parts[1], 10) || 24 : 24;
          const upcomingMessage = await this.upcomingCommand.execute(
            user,
            hours,
            'telegram',
          );
          await this.sendTextMessage(chatId, upcomingMessage);
          break;
        }

        case '/track': {
          // Parse tracking command: /track <tracking-number> OR /track list
          const parts = command.split(' ').filter((p) => p.trim());
          const args = parts.slice(1); // Remove '/track' itself
          const trackMessage = await this.trackCommand.execute(
            user,
            args,
            'telegram',
          );
          await this.sendTextMessage(chatId, trackMessage);
          break;
        }

        case '/search': {
          const searchMessage = await this.searchCommand.execute(
            user,
            command,
            'telegram',
          );
          await this.sendTextMessage(chatId, searchMessage);
          break;
        }

        case '/report': {
          const reportMessage = await this.reportCommand.execute(
            user,
            command,
            'telegram',
          );
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
    return MessageFormatterHelper.formatProcessingResult(result);
  }
}
