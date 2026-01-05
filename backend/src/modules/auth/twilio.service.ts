import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TwilioService {
  private readonly logger = new Logger(TwilioService.name);
  private readonly client: any;
  private readonly fromNumber: string | undefined;

  constructor(private readonly config: ConfigService) {
    // Prefer SMS-specific env vars; fall back to whatsapp vars only if SMS vars are missing
    const accountSid =
      this.config.get<string>('TWILIO_ACCOUNT_SID') ||
      this.config.get<string>('WHATSAPP_ACCOUNT_SID');
    const authToken =
      this.config.get<string>('TWILIO_AUTH_TOKEN') ||
      this.config.get<string>('WHATSAPP_AUTH_TOKEN');
    this.fromNumber =
      this.config.get<string>('TWILIO_FROM_NUMBER') ||
      this.config.get<string>('WHATSAPP_PHONE_NUMBER');

    if (!accountSid || !authToken || !this.fromNumber) {
      this.logger.warn(
        'Twilio not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER). SMS will be skipped.',
      );
      this.client = null;
      return;
    }

    // Safe import/instantiate for both CommonJS and ESM build outputs
    let twilioFactory: any;
    try {
      // prefer require to avoid transpilation issues
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const pkg = require('twilio');
      twilioFactory = pkg && (pkg.default ?? pkg);
    } catch (err) {
      // runtime require failed; try accessing global import (shouldn't usually happen)
      // Fallback: attempt to use any imported symbol if present
      // @ts-ignore
      twilioFactory = (global as any).twilio ?? null;
    }

    if (typeof twilioFactory !== 'function') {
      this.logger.error('Twilio SDK not available or has unexpected shape');
      this.client = null;
      return;
    }

    try {
      this.client = twilioFactory(accountSid, authToken);
    } catch (err) {
      this.logger.error('Failed to initialize Twilio client', err as any);
      this.client = null;
      return;
    }

    // If using whatsapp prefixed number, keep as-is for WhatsApp APIs; for SMS we expect plain E.164
    if (this.fromNumber.startsWith('whatsapp:')) {
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
