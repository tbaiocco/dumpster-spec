import {
  Controller,
  Post,
  Body,
  Logger,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DumpService, CreateDumpRequest } from '../dump.service';
import { TelegramService } from '../../bots/telegram.service';
import { UserService } from '../../users/user.service';

interface TelegramWebhookMessage {
  message_id: number;
  from: {
    id: number;
    is_bot: boolean;
    first_name: string;
    last_name?: string;
    username?: string;
  };
  chat: {
    id: number;
    type: 'private' | 'group' | 'supergroup' | 'channel';
    first_name?: string;
    last_name?: string;
    username?: string;
    title?: string;
  };
  date: number;
  text?: string;
  voice?: {
    duration: number;
    mime_type?: string;
    file_id: string;
    file_unique_id: string;
    file_size?: number;
  };
  photo?: Array<{
    file_id: string;
    file_unique_id: string;
    width: number;
    height: number;
    file_size?: number;
  }>;
  document?: {
    file_name?: string;
    mime_type?: string;
    file_id: string;
    file_unique_id: string;
    file_size?: number;
  };
  caption?: string;
}

interface TelegramWebhookUpdate {
  update_id: number;
  message?: TelegramWebhookMessage;
  edited_message?: TelegramWebhookMessage;
  channel_post?: TelegramWebhookMessage;
  edited_channel_post?: TelegramWebhookMessage;
}

interface TelegramWebhookRequest {
  updates?: TelegramWebhookUpdate[];
  // Direct webhook format
  update_id?: number;
  message?: TelegramWebhookMessage;
  edited_message?: TelegramWebhookMessage;
}

@Controller('api/webhooks/telegram')
export class TelegramWebhookController {
  private readonly logger = new Logger(TelegramWebhookController.name);
  private readonly botToken: string;

  constructor(
    private readonly dumpService: DumpService,
    private readonly telegramService: TelegramService,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {
    this.botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN') || '';
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() body: TelegramWebhookRequest): Promise<{ ok: boolean }> {
    this.logger.log('Received Telegram webhook', JSON.stringify(body, null, 2));

    try {
      // Handle both single update and batch updates
      const updates: TelegramWebhookUpdate[] = [];
      
      if (body.updates && Array.isArray(body.updates)) {
        updates.push(...body.updates);
      } else if (body.update_id && (body.message || body.edited_message)) {
        updates.push({
          update_id: body.update_id,
          message: body.message,
          edited_message: body.edited_message,
        });
      }

      if (updates.length === 0) {
        this.logger.warn('No valid updates found in webhook payload');
        return { ok: true };
      }

      // Process each update
      for (const update of updates) {
        await this.processUpdate(update);
      }

      return { ok: true };
    } catch (error) {
      this.logger.error('Error processing Telegram webhook:', error);
      throw new BadRequestException('Failed to process webhook');
    }
  }

  private async processUpdate(update: TelegramWebhookUpdate): Promise<void> {
    const message = update.message || update.edited_message;
    
    if (!message) {
      this.logger.debug(`Skipping update ${update.update_id} - no message`);
      return;
    }

    try {
      // Find user by chat ID
      const user = await this.userService.findByChatId(message.chat.id.toString(), 'telegram');
      if (!user) {
        this.logger.warn(`No user found for Telegram chat ID: ${message.chat.id}`);
        
        // Send registration prompt
        await this.telegramService.sendMessage({
          chat_id: message.chat.id,
          text: '👋 Welcome! Please register first by providing your phone number to start using this service.',
        });
        return;
      }

      // Determine content type and prepare dump request
      let dumpRequest: CreateDumpRequest;

      if (message.voice) {
        // Voice message
        const voiceBuffer = await this.telegramService.downloadFile(message.voice.file_id);
        
        dumpRequest = {
          userId: user.id,
          content: 'Voice message',
          contentType: 'voice',
          metadata: {
            source: 'telegram',
            messageId: message.message_id.toString(),
            chatId: message.chat.id.toString(),
            mimeType: message.voice.mime_type || 'audio/ogg',
            fileSize: message.voice.file_size,
          },
          mediaBuffer: voiceBuffer,
        };
      } else if (message.photo && message.photo.length > 0) {
        // Photo message
        const largestPhoto = message.photo.at(-1)!; // Get highest resolution
        const photoBuffer = await this.telegramService.downloadFile(largestPhoto.file_id);
        
        dumpRequest = {
          userId: user.id,
          content: message.caption || 'Image',
          contentType: 'image',
          originalText: message.caption,
          metadata: {
            source: 'telegram',
            messageId: message.message_id.toString(),
            chatId: message.chat.id.toString(),
            mimeType: 'image/jpeg',
            fileSize: largestPhoto.file_size,
          },
          mediaBuffer: photoBuffer,
        };
      } else if (message.document) {
        // Document message
        const documentBuffer = await this.telegramService.downloadFile(message.document.file_id);
        
        dumpRequest = {
          userId: user.id,
          content: message.caption || message.document.file_name || 'Document',
          contentType: 'document',
          originalText: message.caption,
          metadata: {
            source: 'telegram',
            messageId: message.message_id.toString(),
            chatId: message.chat.id.toString(),
            fileName: message.document.file_name,
            mimeType: message.document.mime_type,
            fileSize: message.document.file_size,
          },
          mediaBuffer: documentBuffer,
        };
      } else if (message.text) {
        // Text message
        dumpRequest = {
          userId: user.id,
          content: message.text,
          contentType: 'text',
          metadata: {
            source: 'telegram',
            messageId: message.message_id.toString(),
            chatId: message.chat.id.toString(),
          },
        };
      } else {
        this.logger.warn(`Unsupported message type from chat ${message.chat.id}`);
        await this.telegramService.sendMessage({
          chat_id: message.chat.id,
          text: '⚠️ Sorry, this message type is not supported yet. Please send text, voice, images, or documents.',
        });
        return;
      }

      // Process the content with DumpService
      this.logger.log(`Processing ${dumpRequest.contentType} content for user ${user.id}`);
      const result = await this.dumpService.createDump(dumpRequest);

      // Send response back to user
      const responseText = this.formatSuccessResponse(result);
      await this.telegramService.sendMessage({
        chat_id: message.chat.id,
        text: responseText,
        parse_mode: 'Markdown',
      });

      this.logger.log(`Successfully processed message ${message.message_id} from chat ${message.chat.id}`);

    } catch (error) {
      this.logger.error(`Error processing message ${message.message_id}:`, error);
      
      // Send error message to user
      try {
        await this.telegramService.sendMessage({
          chat_id: message.chat.id,
          text: '❌ Sorry, something went wrong while processing your message. Please try again later.',
        });
      } catch (sendError) {
        this.logger.error('Failed to send error message:', sendError);
      }
    }
  }

  private formatSuccessResponse(result: any): string {
    const { analysis } = result;
    
    let response = '✅ Content processed successfully!\n\n';
    
    if (analysis.summary) {
      response += `📝 *Summary:* ${analysis.summary}\n\n`;
    }
    
    if (analysis.category && analysis.category !== 'uncategorized') {
      response += `📂 *Category:* ${analysis.category}\n`;
    }
    
    if (analysis.sentiment && analysis.sentiment !== 'neutral') {
      response += `😊 *Sentiment:* ${analysis.sentiment}\n`;
    }
    
    if (analysis.urgency && analysis.urgency !== 'low') {
      response += `⚡ *Urgency:* ${analysis.urgency}\n`;
    }
    
    if (analysis.actionItems && analysis.actionItems.length > 0) {
      response += `\n✅ *Action Items:*\n`;
      for (let i = 0; i < analysis.actionItems.length; i++) {
        response += `${i + 1}. ${analysis.actionItems[i]}\n`;
      }
    }
    
    response += `\n🔍 *Confidence:* ${Math.round(analysis.confidence * 100)}%`;
    
    return response;
  }

  private formatErrorResponse(result: any): string {
    const { errors } = result;
    
    let response = '⚠️ Content saved but processing encountered some issues:\n\n';
    
    if (errors && errors.length > 0) {
      response += '*Issues:*\n';
      for (let i = 0; i < errors.length; i++) {
        response += `${i + 1}. ${errors[i]}\n`;
      }
    }
    
    response += '\n💡 Your content has been saved and we\'ll retry processing it later.';
    
    return response;
  }
}