import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Define interfaces for email processing
interface EmailMessage {
  id: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  textBody?: string;
  htmlBody?: string;
  attachments: EmailAttachment[];
  receivedDate: Date;
  headers: Record<string, string>;
}

interface EmailAttachment {
  filename: string;
  contentType: string;
  size: number;
  content: Buffer;
  contentId?: string;
  disposition: 'attachment' | 'inline';
}

interface ProcessedEmail {
  originalMessage: EmailMessage;
  extractedText: string;
  attachments: EmailAttachment[]; // Keep original attachments with buffers
  metadata: {
    sender: string;
    subject: string;
    messageId: string;
    timestamp: Date;
    priority: 'low' | 'normal' | 'high';
    hasAttachments: boolean;
    attachmentCount: number;
  };
}

@Injectable()
export class EmailProcessorService {
  private readonly logger = new Logger(EmailProcessorService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Process an incoming email message
   */
  async processEmail(emailMessage: EmailMessage): Promise<ProcessedEmail> {
    try {
      this.logger.log(
        `Processing email from ${emailMessage.from} with subject: ${emailMessage.subject}`,
      );

      // Extract text content from email body
      const extractedText = this.extractEmailText(emailMessage);

      // Generate metadata
      const metadata = this.generateMetadata(emailMessage);

      const result: ProcessedEmail = {
        originalMessage: emailMessage,
        extractedText,
        attachments: emailMessage.attachments, // Pass through original attachments
        metadata,
      };

      this.logger.log(
        `Successfully processed email with ${emailMessage.attachments.length} attachments`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to process email: ${error.message}`,
        error.stack,
      );
      throw new Error(`Email processing failed: ${error.message}`);
    }
  }

  /**
   * Extract text content from email body (HTML and plain text)
   */
  private extractEmailText(emailMessage: EmailMessage): string {
    let text = '';

    // Prefer plain text if available
    if (emailMessage.textBody) {
      text = emailMessage.textBody;
    }

    // Fall back to HTML body if no plain text
    if (!text && emailMessage.htmlBody) {
      text = this.stripHtmlTags(emailMessage.htmlBody);
    }

    // Add subject to the extracted text
    const subject = emailMessage.subject
      ? `Subject: ${emailMessage.subject}\n\n`
      : '';

    return subject + text;
  }

  /**
   * Generate metadata for processed email
   */
  private generateMetadata(emailMessage: EmailMessage) {
    return {
      sender: emailMessage.from,
      subject: emailMessage.subject || '',
      messageId: emailMessage.id,
      timestamp: emailMessage.receivedDate,
      priority: this.determinePriority(emailMessage),
      hasAttachments: emailMessage.attachments.length > 0,
      attachmentCount: emailMessage.attachments.length,
    };
  }

  /**
   * Determine email priority based on headers and content
   */
  private determinePriority(
    emailMessage: EmailMessage,
  ): 'low' | 'normal' | 'high' {
    // Normalize headers to lowercase for case-insensitive lookup
    const normalizedHeaders: Record<string, string> = {};
    for (const [key, value] of Object.entries(emailMessage.headers)) {
      normalizedHeaders[key.toLowerCase()] = value;
    }

    // Check priority headers
    const priority =
      normalizedHeaders['x-priority'] || normalizedHeaders['priority'];
    if (priority) {
      const priorityValue = priority.toLowerCase();
      if (priorityValue.includes('high') || priorityValue === '1')
        return 'high';
      if (priorityValue.includes('low') || priorityValue === '5') return 'low';
    }

    // Check importance headers
    const importance = normalizedHeaders['importance'];
    if (importance?.toLowerCase() === 'high') return 'high';
    if (importance?.toLowerCase() === 'low') return 'low';

    // Check subject for urgency indicators
    const subject = emailMessage.subject?.toLowerCase() || '';
    const urgentKeywords = [
      'urgent',
      'asap',
      'emergency',
      'critical',
      'important',
    ];
    if (urgentKeywords.some((keyword) => subject.includes(keyword))) {
      return 'high';
    }

    return 'normal';
  }

  /**
   * Strip HTML tags from HTML content
   */
  private stripHtmlTags(html: string): string {
    // Basic HTML tag removal - could be enhanced with a proper HTML parser
    return html
      .replaceAll(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replaceAll(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replaceAll(/<[^>]+>/g, '')
      .replaceAll('&nbsp;', ' ')
      .replaceAll('&amp;', '&')
      .replaceAll('&lt;', '<')
      .replaceAll('&gt;', '>')
      .replaceAll('&quot;', '"')
      .replaceAll('&#39;', "'")
      .replaceAll(/\s+/g, ' ')
      .trim();
  }

  /**
   * Extract email forwarding information from headers
   */
  extractForwardingInfo(emailMessage: EmailMessage): {
    isForwarded: boolean;
    originalSender?: string;
    forwardedBy?: string;
    forwardChain: string[];
  } {
    const headers = emailMessage.headers;

    // Check for forwarding indicators
    const isForwarded = !!(
      headers['x-forwarded-for'] ||
      headers['x-forwarded-from'] ||
      emailMessage.subject?.toLowerCase().includes('fwd:') ||
      emailMessage.subject?.toLowerCase().includes('fw:')
    );

    const forwardChain: string[] = [];

    // Extract forwarding chain from headers
    if (headers['x-forwarded-for']) {
      forwardChain.push(headers['x-forwarded-for']);
    }

    // Extract original sender if forwarded
    const originalSender =
      headers['x-original-sender'] || headers['x-forwarded-from'];

    return {
      isForwarded,
      originalSender,
      forwardedBy: isForwarded ? emailMessage.from : undefined,
      forwardChain,
    };
  }

  /**
   * Validate email for processing
   */
  validateEmail(emailMessage: EmailMessage): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!emailMessage.id) {
      errors.push('Email ID is required');
    }

    if (!emailMessage.from) {
      errors.push('Sender address is required');
    }

    if (!emailMessage.to || emailMessage.to.length === 0) {
      errors.push('Recipient address is required');
    }

    if (!emailMessage.receivedDate) {
      errors.push('Received date is required');
    }

    if (!emailMessage.textBody && !emailMessage.htmlBody) {
      errors.push('Email must have either text or HTML body');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
