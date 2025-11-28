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
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async handleIncomingMessage(@Body() body: any): Promise<string> {
    try {
      this.logger.log('WhatsApp webhook message received');
      this.logger.debug('Webhook payload:', JSON.stringify(body, null, 2));

      // Extract phone number from Twilio format
      const fromNumber = body.From?.replace('whatsapp:', '') || '';
      const messageBody = body.Body || '';

      // Check if user exists
      const user = await this.userService.findByChatId(fromNumber, 'whatsapp');

      if (!user) {
        this.logger.warn(`No user found for WhatsApp number: ${fromNumber}`);

        // Self-registration flow
        // Try to handle phone number registration if it's a text message
        if (messageBody) {
          const registrationHandled =
            await this.whatsAppService.handlePhoneNumberRegistration(
              fromNumber,
              messageBody,
            );

          if (registrationHandled) {
            return 'OK'; // Registration was processed
          }
        }

        // Send registration prompt
        await this.whatsAppService.sendTextMessage(
          fromNumber,
          '👋 Welcome! Please register first by providing your phone number to start using this service.\n\nExample: +351999888777',
        );
        return 'OK';
      }

      // Process the Twilio webhook payload
      await this.whatsAppService.processTwilioWebhook(body);

      return 'OK';
    } catch (error) {
      this.logger.error('Error handling WhatsApp webhook:', error);
      throw error;
    }
  }
}
