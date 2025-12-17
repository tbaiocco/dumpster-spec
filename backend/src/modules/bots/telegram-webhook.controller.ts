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
import { TelegramService } from './telegram.service';
import { UserService } from '../users/user.service';

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
    private readonly telegramService: TelegramService,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {
    this.botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN') || '';
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body() body: TelegramWebhookRequest,
  ): Promise<{ ok: boolean }> {
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
      const user = await this.userService.findByChatId(
        message.chat.id.toString(),
        'telegram',
      );
      if (!user) {
        this.logger.warn(
          `No user found for Telegram chat ID: ${message.chat.id}`,
        );

        // Try to link account by phone number
        if (message.text) {
          const registrationHandled =
            await this.telegramService.handlePhoneNumberRegistration({
              message_id: message.message_id,
              from: message.from,
              chat: message.chat,
              date: message.date,
              text: message.text,
            });

          if (registrationHandled) {
            return; // Phone number was processed (either linked or rejected)
          }
        }

        // Send prompt to provide phone number for account linking
        await this.telegramService.sendMessage({
          chat_id: message.chat.id,
          text: '👋 Welcome to Clutter.AI!\n\nPlease send your registered phone number to link your account.\n\nExample: +351999888777\n\nNot registered yet? Visit https://theclutter.app',
        });
        return;
      }

      // Delegate message processing to TelegramService
      // This handles all media types properly and uses enhanced processing
      await this.telegramService.processUpdate({
        update_id: update.update_id,
        message: {
          message_id: message.message_id,
          from: message.from,
          chat: message.chat,
          date: message.date,
          text: message.text,
          voice: message.voice,
          photo: message.photo,
          document: message.document,
          caption: message.caption,
        },
      });

      this.logger.log(
        `Successfully processed message ${message.message_id} from chat ${message.chat.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Error processing message ${message.message_id}:`,
        error,
      );

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
}
