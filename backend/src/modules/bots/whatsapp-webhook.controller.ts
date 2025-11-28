import {
  Controller,
  Post,
  Body,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';

@Controller('api/webhooks/whatsapp')
export class WhatsAppWebhookController {
  private readonly logger = new Logger(WhatsAppWebhookController.name);

  constructor(private readonly whatsAppService: WhatsAppService) {}

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

      // Process the Twilio webhook payload
      await this.whatsAppService.processTwilioWebhook(body);

      return 'OK';
    } catch (error) {
      this.logger.error('Error handling WhatsApp webhook:', error);
      throw error;
    }
  }
}
