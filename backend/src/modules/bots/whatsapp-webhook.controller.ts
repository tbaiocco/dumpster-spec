import {
  Controller,
  Post,
  Body,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { UserService } from '../users/user.service';

@Controller('api/webhooks/whatsapp')
export class WhatsAppWebhookController {
  private readonly logger = new Logger(WhatsAppWebhookController.name);

  constructor(
    private readonly whatsAppService: WhatsAppService,
    private readonly userService: UserService,
  ) {}

  /**
   * Handle incoming WhatsApp messages via Twilio webhook (POST request)
   * Twilio WhatsApp webhooks don't require verification like Meta/Facebook
   *
   * Account linking: When a new phone number messages the bot, we check if
   * a user exists with that phone number and automatically link the WhatsApp
   * chat_id. If no user exists, we prompt them to register at theclutter.app
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async handleIncomingMessage(@Body() body: any): Promise<string> {
    try {
      this.logger.log('WhatsApp webhook message received');
      this.logger.debug('Webhook payload:', JSON.stringify(body, null, 2));

      // Extract phone number from Twilio format (e.g., "whatsapp:+351964938153")
      const fromNumber = body.From?.replace('whatsapp:', '') || '';
      const toNumber = body.To?.replace('whatsapp:', '') || '';
      
      // Get Twilio WhatsApp number from environment
      const twilioWhatsAppNumber = this.whatsAppService.getTwilioWhatsAppNumber();

      if (!fromNumber) {
        this.logger.error('No phone number in webhook payload');
        return 'OK';
      }

      // Ignore messages from our own WhatsApp number (bot number)
      if (fromNumber === twilioWhatsAppNumber) {
        this.logger.log(`Ignoring message from bot's own number: ${fromNumber}`);
        return 'OK';
      }

      // Check if user exists
      const user = await this.userService.findByChatId(fromNumber, 'whatsapp');

      if (!user) {
        this.logger.log(
          `New WhatsApp number detected: ${fromNumber} - attempting to link`,
        );

        // Try to link to existing user account by phone number
        await this.whatsAppService.autoRegisterUser(fromNumber);

        // After linking attempt, process the original message if user was found
        // (autoRegisterUser will send appropriate message if user not found)
        const linkedUser = await this.userService.findByChatId(
          fromNumber,
          'whatsapp',
        );
        if (linkedUser) {
          await this.whatsAppService.processTwilioWebhook(body);
        }
        return 'OK';
      }

      // User exists, process the message normally
      await this.whatsAppService.processTwilioWebhook(body);

      return 'OK';
    } catch (error) {
      this.logger.error('Error handling WhatsApp webhook:', error);
      throw error;
    }
  }

  @Post('status')
  @HttpCode(HttpStatus.OK)
  async handleStatusCallback(@Body() body: any): Promise<string> {
    this.logger.log('WhatsApp status callback received');
    this.logger.debug('Status payload:', JSON.stringify(body, null, 2));
    // Handle message status updates (sent, delivered, failed, etc.)
    return 'OK';
  }
}
