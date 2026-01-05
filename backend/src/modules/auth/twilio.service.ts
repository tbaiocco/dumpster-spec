import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Twilio from 'twilio';

@Injectable()
export class TwilioService {
  private readonly logger = new Logger(TwilioService.name);
  private readonly client: any;
  private readonly fromNumber: string | undefined;

  constructor(private readonly config: ConfigService) {
    const accountSid = this.config.get<string>('WHATSAPP_ACCOUNT_SID');
    const authToken = this.config.get<string>('WHATSAPP_AUTH_TOKEN');
    this.fromNumber = this.config.get<string>('WHATSAPP_PHONE_NUMBER');

    if (!accountSid || !authToken || !this.fromNumber) {
      this.logger.warn(
        'Twilio not configured (WHATSAPP_ACCOUNT_SID, WHATSAPP_AUTH_TOKEN, WHATSAPP_PHONE_NUMBER). SMS will be skipped.',
      );
      this.client = null;
    } else {
      // Twilio returns a factory when imported as * as Twilio
      this.client = (Twilio as any)(accountSid, authToken);
      this.fromNumber = this.fromNumber.replace('whatsapp:', '');
    }
  }

  async sendSms(to: string, body: string): Promise<void> {
    if (!this.client) {
      this.logger.log(`Skipping SMS to ${to} (no Twilio config). Message: ${body}`);
      return;
    }

    try {
      await this.client.messages.create({ from: this.fromNumber, to, body });
      this.logger.log(`SMS sent to ${to}`);
    } catch (err) {
      this.logger.error(`Failed to send SMS to ${to}`, err as any);
      throw err;
    }
  }
}
