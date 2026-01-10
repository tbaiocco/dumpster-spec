import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Email service for sending notifications via email
 *
 * Supports multiple providers:
 * - SendGrid (recommended for production)
 * - Resend (modern alternative)
 * - Gmail SMTP (for development/testing)
 * - Custom SMTP
 *
 * Configuration via environment variables:
 * - EMAIL_PROVIDER: 'sendgrid' | 'resend' | 'gmail' | 'smtp'
 * - EMAIL_FROM: Sender email address (e.g., noreply@dumpster.app)
 * - EMAIL_FROM_NAME: Sender name (e.g., "Dumpster Notifications")
 *
 * For SendGrid:
 * - SENDGRID_API_KEY
 *
 * For Resend:
 * - RESEND_API_KEY
 *
 * For Gmail:
 * - GMAIL_USER: Your Gmail address
 * - GMAIL_APP_PASSWORD: App-specific password (not your regular password)
 *
 * For Custom SMTP:
 * - SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly provider: string;
  private readonly fromEmail: string;
  private readonly fromName: string;

  constructor(private readonly configService: ConfigService) {
    this.provider = this.configService.get<string>('EMAIL_PROVIDER', 'gmail');
    this.fromEmail = this.configService.get<string>(
      'EMAIL_FROM',
      'no-reply@theclutter.app',
    );
    this.fromName = this.configService.get<string>(
      'EMAIL_FROM_NAME',
      'ClutterAI Notifications',
    );

    this.initializeTransporter();
  }

  /**
   * Initialize email transporter based on configured provider
   */
  private initializeTransporter(): void {
    try {
      switch (this.provider.toLowerCase()) {
        case 'sendgrid':
          this.transporter = this.createSendGridTransporter();
          break;
        case 'resend':
          this.transporter = this.createResendTransporter();
          break;
        case 'gmail':
          this.transporter = this.createGmailTransporter();
          break;
        case 'smtp':
          this.transporter = this.createCustomSmtpTransporter();
          break;
        default:
          this.logger.warn(
            `Unknown email provider: ${this.provider}, falling back to Gmail`,
          );
          this.transporter = this.createGmailTransporter();
      }

      this.logger.log(
        `Email service initialized with provider: ${this.provider}`,
      );
    } catch (error) {
      this.logger.error('Failed to initialize email transporter', error);
      this.transporter = null;
    }
  }

  /**
   * SendGrid SMTP configuration
   */
  private createSendGridTransporter(): nodemailer.Transporter {
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY');

    if (!apiKey) {
      throw new Error('SENDGRID_API_KEY not configured');
    }

    return nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      auth: {
        user: 'apikey',
        pass: apiKey,
      },
    });
  }

  /**
   * Resend SMTP configuration
   */
  private createResendTransporter(): nodemailer.Transporter {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');

    if (!apiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }

    return nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 587,
      secure: false,
      auth: {
        user: 'resend',
        pass: apiKey,
      },
    });
  }

  /**
   * Gmail SMTP configuration
   * Requires App Password (not regular Gmail password)
   * Setup: https://support.google.com/accounts/answer/185833
   */
  private createGmailTransporter(): nodemailer.Transporter {
    const user = this.configService.get<string>('GMAIL_USER');
    const pass = this.configService.get<string>('GMAIL_APP_PASSWORD');

    if (!user || !pass) {
      throw new Error('GMAIL_USER and GMAIL_APP_PASSWORD must be configured');
    }

    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user,
        pass,
      },
    });
  }

  /**
   * Custom SMTP configuration
   */
  private createCustomSmtpTransporter(): nodemailer.Transporter {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT', 587);
    const secure = this.configService.get<boolean>('SMTP_SECURE', false);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (!host || !user || !pass) {
      throw new Error('SMTP_HOST, SMTP_USER, and SMTP_PASS must be configured');
    }

    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });
  }

  /**
   * Send an email
   */
  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    // Use HTTP API for SendGrid and Resend to avoid SMTP port blocking
    if (this.provider === 'sendgrid') {
      return this.sendViaSendGridAPI(options);
    }

    if (this.provider === 'resend') {
      return this.sendViaResendAPI(options);
    }

    // Fall back to SMTP for other providers
    if (!this.transporter) {
      this.logger.error('Email transporter not initialized');
      return {
        success: false,
        error: 'Email service not configured',
      };
    }

    try {
      this.logger.debug(`Sending email to ${options.to}`);

      const mailOptions = {
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html || this.convertTextToHtml(options.text),
      };

      const info = await this.transporter.sendMail(mailOptions);

      this.logger.log(
        `Email sent successfully to ${options.to} (messageId: ${info.messageId})`,
      );

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}`, error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send email via SendGrid HTTP API
   */
  private async sendViaSendGridAPI(
    options: EmailOptions,
  ): Promise<EmailResult> {
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY');

    if (!apiKey) {
      return {
        success: false,
        error: 'SENDGRID_API_KEY not configured',
      };
    }

    try {
      this.logger.debug(`Sending email via SendGrid API to ${options.to}`);

      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: [{ email: options.to }],
            },
          ],
          from: {
            email: this.fromEmail,
            name: this.fromName,
          },
          subject: options.subject,
          content: [
            {
              type: 'text/plain',
              value: options.text,
            },
            {
              type: 'text/html',
              value: options.html || this.convertTextToHtml(options.text),
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `SendGrid API error: ${response.status} ${errorText}`,
        );
        return {
          success: false,
          error: `SendGrid API error: ${response.status}`,
        };
      }

      const messageId = response.headers.get('x-message-id') || 'unknown';

      this.logger.log(
        `Email sent via SendGrid API to ${options.to} (messageId: ${messageId})`,
      );

      return {
        success: true,
        messageId,
      };
    } catch (error) {
      this.logger.error(
        `Failed to send email via SendGrid API to ${options.to}`,
        error,
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send email via Resend HTTP API
   */
  private async sendViaResendAPI(options: EmailOptions): Promise<EmailResult> {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');

    if (!apiKey) {
      return {
        success: false,
        error: 'RESEND_API_KEY not configured',
      };
    }

    try {
      this.logger.debug(`Sending email via Resend API to ${options.to}`);

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: `${this.fromName} <${this.fromEmail}>`,
          to: [options.to],
          subject: options.subject,
          text: options.text,
          html: options.html || this.convertTextToHtml(options.text),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        this.logger.error(
          `Resend API error: ${response.status} ${JSON.stringify(errorData)}`,
        );
        return {
          success: false,
          error: `Resend API error: ${response.status}`,
        };
      }

      const data = (await response.json()) as { id: string };

      this.logger.log(
        `Email sent via Resend API to ${options.to} (messageId: ${data.id})`,
      );

      return {
        success: true,
        messageId: data.id,
      };
    } catch (error) {
      this.logger.error(
        `Failed to send email via Resend API to ${options.to}`,
        error,
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send emails to multiple recipients
   */
  async sendBulkEmails(
    recipients: string[],
    options: Omit<EmailOptions, 'to'>,
  ): Promise<EmailResult[]> {
    this.logger.log(`Sending bulk email to ${recipients.length} recipients`);

    const results = await Promise.allSettled(
      recipients.map((to) =>
        this.sendEmail({
          ...options,
          to,
        }),
      ),
    );

    const emailResults: EmailResult[] = results.map((result) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          success: false,
          error: result.reason?.message || 'Email send failed',
        };
      }
    });

    const successCount = emailResults.filter((r) => r.success).length;
    this.logger.log(
      `Bulk email complete: ${successCount}/${recipients.length} successful`,
    );

    return emailResults;
  }

  /**
   * Verify email configuration by sending a test email
   */
  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) {
      this.logger.error('Email transporter not initialized');
      return false;
    }

    try {
      await this.transporter.verify();
      this.logger.log('Email configuration verified successfully');
      return true;
    } catch (error) {
      this.logger.error('Email configuration verification failed', error);
      return false;
    }
  }

  /**
   * Convert plain text to basic HTML
   */
  private convertTextToHtml(text: string): string {
    // Convert newlines to <br> and wrap in basic HTML structure
    const htmlContent = text
      .replaceAll('\n', '<br>')
      .replaceAll(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
      .replaceAll(/\*(.*?)\*/g, '<em>$1</em>'); // Italic

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      font-size: 12px;
      color: #999;
    }
  </style>
</head>
<body>
  <div class="content">
    ${htmlContent}
  </div>
  <div class="footer">
    <p>This is an automated notification from Clutter.AI. Please do not reply to this email.</p>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Get current email configuration info (for debugging)
   */
  getConfigInfo(): {
    provider: string;
    fromEmail: string;
    fromName: string;
    configured: boolean;
  } {
    return {
      provider: this.provider,
      fromEmail: this.fromEmail,
      fromName: this.fromName,
      configured: this.transporter !== null,
    };
  }
}
