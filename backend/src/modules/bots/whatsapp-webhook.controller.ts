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
   * Auto-registration: We use the phone number from Twilio's webhook payload
   * (no need to ask user to type their phone number again!)
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async handleIncomingMessage(@Body() body: any): Promise<string> {
    try {
      this.logger.log('WhatsApp webhook message received');
      this.logger.debug('Webhook payload:', JSON.stringify(body, null, 2));

      // Extract phone number from Twilio format (e.g., "whatsapp:+351964938153")
      const fromNumber = body.From?.replace('whatsapp:', '') || '';

      if (!fromNumber) {
        this.logger.error('No phone number in webhook payload');
        return 'OK';
      }

      // Check if user exists
      const user = await this.userService.findByChatId(fromNumber, 'whatsapp');

      if (!user) {
        this.logger.log(`New user detected: ${fromNumber} - auto-registering`);

        // Auto-register using the phone number from Twilio
        await this.whatsAppService.autoRegisterUser(fromNumber);
        
        // After registration, process the original message
        await this.whatsAppService.processTwilioWebhook(body);
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
}
