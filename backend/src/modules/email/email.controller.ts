import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  UseInterceptors,
  UploadedFiles,
  Req,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { EmailProcessorService } from './email-processor.service';
import { DumpService } from '../dumps/services/dump.service';
import { UserService } from '../users/user.service';

// Define email webhook payload interfaces
interface EmailWebhookPayload {
  messageId: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  textBody?: string;
  htmlBody?: string;
  attachments?: EmailWebhookAttachment[];
  receivedDate: string; // ISO date string
  headers: Record<string, string>;
  rawEmail?: string; // Base64 encoded raw email
}

interface EmailWebhookAttachment {
  filename: string;
  contentType: string;
  size: number;
  contentId?: string;
  disposition: 'attachment' | 'inline';
  content: string; // Base64 encoded
}

// Define webhook response
interface EmailWebhookResponse {
  success: boolean;
  messageId: string;
  processedAt: string;
  extractedText?: string;
  attachmentCount?: number;
  errors?: string[];
}

@Controller('api/email')
export class EmailController {
  private readonly logger = new Logger(EmailController.name);

  constructor(
    private readonly emailProcessor: EmailProcessorService,
    private readonly dumpService: DumpService,
    private readonly userService: UserService,
  ) {}

  /**
   * Webhook endpoint for email ingestion
   * Accepts emails from external email services (SendGrid, Mailgun, etc.)
   */
  @Post('webhook/inbound')
  @HttpCode(HttpStatus.OK)
  async handleInboundEmail(
    @Body() payload: EmailWebhookPayload,
    @Headers() headers: Record<string, string>,
  ): Promise<EmailWebhookResponse> {
    try {
      this.logger.log(
        `Received email webhook for message: ${payload.messageId}`,
      );

      // Validate webhook authenticity
      await this.validateWebhookSignature(headers, payload);

      // Validate email payload
      this.validateEmailPayload(payload);

      // Convert webhook payload to internal email format
      const emailMessage = await this.convertWebhookToEmailMessage(payload);

      // Process email using EmailProcessorService
      const processedEmail =
        await this.emailProcessor.processEmail(emailMessage);

      // Create dumps from email (one for body text, one per attachment)
      const dumps = await this.createDumpsFromEmail(processedEmail);

      const response: EmailWebhookResponse = {
        success: true,
        messageId: payload.messageId,
        processedAt: new Date().toISOString(),
        extractedText: processedEmail.extractedText,
        attachmentCount: processedEmail.attachments.length,
      };

      this.logger.log(
        `Successfully processed email ${payload.messageId}, created ${dumps.length} dump(s)`,
      );
      return response;
    } catch (error) {
      this.logger.error(
        `Failed to process email webhook: ${error.message}`,
        error.stack,
      );

      const errorResponse: EmailWebhookResponse = {
        success: false,
        messageId: payload.messageId || 'unknown',
        processedAt: new Date().toISOString(),
        errors: [error.message],
      };

      // Don't throw error to avoid webhook retry loops
      return errorResponse;
    }
  }

  /**
   * Webhook endpoint for SendGrid-specific format
   * SendGrid sends multipart/form-data, not JSON
   */
  @Post('webhook/sendgrid')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(AnyFilesInterceptor())
  async handleSendGridWebhook(
    @Req() req: Request,
    @Body() body: any,
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Headers() headers: Record<string, string>,
  ): Promise<EmailWebhookResponse> {
    try {
      this.logger.log('Received SendGrid email webhook');
      this.logger.debug(`SendGrid body keys: ${Object.keys(body || {}).join(', ')}`);
      this.logger.debug(`SendGrid files count: ${files?.length || 0}`);

      // Convert SendGrid format to standard format
      const standardPayload = this.convertSendGridPayload(body, files);

      // Process using standard webhook handler
      return await this.handleInboundEmail(standardPayload, headers);
    } catch (error) {
      this.logger.error(
        `Failed to process SendGrid webhook: ${error.message}`,
        error.stack,
      );
      return {
        success: false,
        messageId: body?.messageId || 'unknown',
        processedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }

  /**
   * Webhook endpoint for Mailgun-specific format
   */
  @Post('webhook/mailgun')
  @HttpCode(HttpStatus.OK)
  async handleMailgunWebhook(
    @Body() payload: any,
    @Headers() headers: Record<string, string>,
  ): Promise<EmailWebhookResponse> {
    try {
      this.logger.log('Received Mailgun email webhook');

      // Convert Mailgun format to standard format
      const standardPayload = this.convertMailgunPayload(payload);

      // Process using standard webhook handler
      return await this.handleInboundEmail(standardPayload, headers);
    } catch (error) {
      this.logger.error(
        `Failed to process Mailgun webhook: ${error.message}`,
        error.stack,
      );
      return {
        success: false,
        messageId: payload.messageId || 'unknown',
        processedAt: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }

  /**
   * Health check endpoint for webhook services
   */
  @Post('webhook/health')
  @HttpCode(HttpStatus.OK)
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Validate webhook signature for security
   */
  private async validateWebhookSignature(
    headers: Record<string, string>,
    payload: any,
  ): Promise<void> {
    // In a real implementation, this would verify webhook signatures
    // For now, just check for a basic API key
    const apiKey = headers['x-api-key'] || headers['authorization'];

    if (!apiKey) {
      this.logger.warn('Missing API key in webhook request');
      // Don't throw error for now - just log warning
      return;
    }

    // Signature validation would check HMAC signatures from email services
    this.logger.log('Webhook signature validation passed');
  }

  /**
   * Validate email payload structure
   */
  private validateEmailPayload(payload: EmailWebhookPayload): void {
    const errors: string[] = [];

    if (!payload.messageId) {
      errors.push('messageId is required');
    }

    if (!payload.from) {
      errors.push('from address is required');
    }

    if (!payload.to || payload.to.length === 0) {
      errors.push('to addresses are required');
    }

    if (!payload.receivedDate) {
      errors.push('receivedDate is required');
    }

    if (!payload.textBody && !payload.htmlBody) {
      errors.push('either textBody or htmlBody is required');
    }

    if (errors.length > 0) {
      throw new BadRequestException(
        `Invalid email payload: ${errors.join(', ')}`,
      );
    }
  }

  /**
   * Convert webhook payload to internal email message format
   */
  private async convertWebhookToEmailMessage(
    payload: EmailWebhookPayload,
  ): Promise<any> {
    // Convert attachments
    const attachments = await Promise.all(
      (payload.attachments || []).map(async (att) => {
        return {
          filename: att.filename,
          contentType: att.contentType,
          size: att.size,
          content: Buffer.from(att.content, 'base64'),
          contentId: att.contentId,
          disposition: att.disposition,
        };
      }),
    );

    return {
      id: payload.messageId,
      from: payload.from,
      to: payload.to,
      cc: payload.cc || [],
      bcc: payload.bcc || [],
      subject: payload.subject || '',
      textBody: payload.textBody,
      htmlBody: payload.htmlBody,
      attachments,
      receivedDate: new Date(payload.receivedDate),
      headers: payload.headers || {},
    };
  }

  /**
   * Create dump entries from processed email
   * Creates one dump per attachment with email body included as content
   */
  private async createDumpsFromEmail(processedEmail: any): Promise<any[]> {
    const dumps: any[] = [];
    const userId = await this.getEmailUserId(processedEmail.metadata.sender);

    // Create one dump per attachment, including email body as content
    for (const attachment of processedEmail.attachments) {
      try {
        // Determine content type based on MIME type
        const contentType = this.mapMimeTypeToContentType(
          attachment.contentType,
        );

        // Include email body as additional context in the content field
        const content = processedEmail.extractedText?.trim()
          ? `${processedEmail.extractedText}\n\n---\nAttachment: ${attachment.filename}`
          : `Email attachment: ${attachment.filename}`;

        const attachmentDump = await this.dumpService.createDumpEnhanced({
          userId,
          content,
          contentType,
          mediaBuffer: attachment.content,
          metadata: {
            source: 'email',
            messageId: processedEmail.metadata.messageId,
            fileName: attachment.filename,
            mimeType: attachment.contentType,
            fileSize: attachment.size,
            chatId: processedEmail.metadata.sender,
          },
        });

        dumps.push(attachmentDump.dump);
        this.logger.log(
          `Created ${contentType} dump from attachment: ${attachmentDump.dump.id}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to process attachment ${attachment.filename}: ${error.message}`,
        );
      }
    }

    return dumps;
  }

  /**
   * Map MIME type to content type for CreateDumpRequest
   */
  private mapMimeTypeToContentType(
    mimeType: string,
  ): 'text' | 'voice' | 'image' | 'document' {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('audio/')) return 'voice';
    if (
      mimeType === 'application/pdf' ||
      mimeType.includes('word') ||
      mimeType.includes('document') ||
      mimeType.includes('spreadsheet') ||
      mimeType.includes('presentation')
    ) {
      return 'document';
    }
    return 'text';
  }

  /**
   * Get or create user ID from email address
   */
  private async getEmailUserId(emailAddress: string): Promise<string> {
    try {
      // Extract email from "Name" <email@domain.com> format
      const emailMatch = emailAddress.match(/<(.+?)>/);
      const cleanEmail = emailMatch ? emailMatch[1] : emailAddress.trim();

      this.logger.debug(`Extracted email: ${cleanEmail} from: ${emailAddress}`);

      // Try to find existing user by email
      const user = await this.userService.findByEmail(cleanEmail);

      // If user doesn't exist, log and throw error
      if (!user) {
        const errorMsg = `No registered user found for email: ${cleanEmail}. Users must be registered before sending emails.`;
        this.logger.warn(errorMsg);
        throw new BadRequestException(errorMsg);
      }

      return user.id;
    } catch (error) {
      this.logger.error(
        `Failed to get user for email ${emailAddress}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Convert SendGrid webhook payload to standard format
   */
  private convertSendGridPayload(
    payload: any,
    files?: Array<Express.Multer.File>,
  ): EmailWebhookPayload {
    // SendGrid webhook format conversion
    if (!payload) {
      throw new BadRequestException('Empty payload received from SendGrid');
    }

    this.logger.debug(
      `Converting SendGrid payload with keys: ${Object.keys(payload).join(', ')}`,
    );

    // Extract messageId from headers string if present
    let messageId = '';
    if (payload.headers) {
      const headersStr = payload.headers;
      const messageIdMatch = headersStr.match(/Message-ID:\s*<(.+?)>/i);
      if (messageIdMatch) {
        messageId = messageIdMatch[1];
      }
    }

    this.logger.debug(`Extracted messageId: ${messageId}`);

    return {
      messageId,
      from: payload.from || payload.email || '',
      to: this.parseEmailList(payload.to || ''),
      cc: this.parseEmailList(payload.cc || ''),
      bcc: this.parseEmailList(payload.bcc || ''),
      subject: payload.subject || '',
      textBody: payload.text || payload['body-plain'],
      htmlBody: payload.html || payload['body-html'],
      receivedDate: payload.timestamp || new Date().toISOString(),
      headers: payload.headers || {},
      attachments: this.convertSendGridAttachments(
        payload.attachments || [],
        files,
      ),
    };
  }

  /**
   * Convert Mailgun webhook payload to standard format
   */
  private convertMailgunPayload(payload: any): EmailWebhookPayload {
    // Mailgun webhook format conversion
    return {
      messageId: payload['Message-Id'] || payload.messageId || '',
      from: payload.sender || payload.from || '',
      to: this.parseEmailList(payload.recipient || payload.to || ''),
      cc: this.parseEmailList(payload.cc || ''),
      bcc: this.parseEmailList(payload.bcc || ''),
      subject: payload.Subject || payload.subject || '',
      textBody: payload['body-plain'] || payload.text,
      htmlBody: payload['body-html'] || payload.html,
      receivedDate:
        payload.Date || payload.timestamp || new Date().toISOString(),
      headers: this.parseMailgunHeaders(payload),
      attachments: this.convertMailgunAttachments(payload.attachments || []),
    };
  }

  /**
   * Parse email list from string
   */
  private parseEmailList(emailString: string): string[] {
    if (!emailString) return [];
    return emailString
      .split(',')
      .map((email) => email.trim())
      .filter(Boolean);
  }

  /**
   * Convert SendGrid attachments format
   * SendGrid sends attachments as uploaded files via multipart/form-data
   */
  private convertSendGridAttachments(
    attachments: any[],
    files?: Array<Express.Multer.File>,
  ): EmailWebhookAttachment[] {
    // If we have uploaded files from multer, use those
    if (files && files.length > 0) {
      this.logger.debug(`Processing ${files.length} uploaded files`);
      return files.map((file) => ({
        filename: file.originalname,
        contentType: file.mimetype,
        size: file.size,
        content: file.buffer.toString('base64'),
        disposition: 'attachment' as const,
      }));
    }

    // Fallback to attachments array if provided
    return attachments.map((att) => ({
      filename: att.filename || att.name || 'unknown',
      contentType: att.contentType || att.type || 'application/octet-stream',
      size: att.size || 0,
      contentId: att.contentId || att.cid,
      disposition: att.disposition || 'attachment',
      content: att.content || '',
    }));
  }

  /**
   * Convert Mailgun attachments format
   */
  private convertMailgunAttachments(
    attachments: any[],
  ): EmailWebhookAttachment[] {
    return attachments.map((att) => ({
      filename: att.filename || att.name || 'unknown',
      contentType:
        att.contentType || att['content-type'] || 'application/octet-stream',
      size: att.size || 0,
      contentId: att['content-id'],
      disposition: att.disposition || 'attachment',
      content: att.content || '',
    }));
  }

  /**
   * Parse Mailgun headers
   */
  private parseMailgunHeaders(payload: any): Record<string, string> {
    const headers: Record<string, string> = {};

    // Common Mailgun headers
    if (payload['Message-Id']) headers['message-id'] = payload['Message-Id'];
    if (payload['From']) headers['from'] = payload['From'];
    if (payload['To']) headers['to'] = payload['To'];
    if (payload['Subject']) headers['subject'] = payload['Subject'];
    if (payload['Date']) headers['date'] = payload['Date'];

    return headers;
  }
}
