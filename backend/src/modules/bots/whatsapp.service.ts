import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../users/user.service';
import {
  DumpService,
  CreateDumpRequest,
  DumpProcessingResult,
} from '../dumps/services/dump.service';
import { HelpCommand } from './commands/help.command';
import { RecentCommand } from './commands/recent.command';
import { SearchCommand } from './commands/search.command';
import { ReportCommand } from './commands/report.command';
import { ResponseFormatterService } from '../ai/formatter.service';
import { EntityExtractionResult } from '../ai/extraction.service';
import { ContentAnalysisResponse } from '../ai/claude.service';

export interface WhatsAppMessage {
  MessageSid: string;
  From: string;
  To: string;
  Body?: string;
  NumMedia?: string;
  MediaUrl0?: string;
  MediaContentType0?: string;
  // Computed properties for easier access
  id: string;
  from: string;
  timestamp: string;
  type: 'text' | 'image' | 'audio' | 'voice' | 'video' | 'document';
  text?: {
    body: string;
  };
  image?: {
    id: string;
    mime_type: string;
    sha256: string;
    caption?: string;
  };
  audio?: {
    id: string;
    mime_type: string;
    sha256: string;
  };
  voice?: {
    id: string;
    mime_type: string;
    sha256: string;
  };
  document?: {
    id: string;
    filename: string;
    mime_type: string;
    sha256: string;
    caption?: string;
  };
}

export interface WhatsAppContact {
  profile: {
    name: string;
  };
  wa_id: string;
}

export interface WhatsAppWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: WhatsAppContact[];
        messages?: WhatsAppMessage[];
        statuses?: Array<{
          id: string;
          status: string;
          timestamp: string;
          recipient_id: string;
        }>;
      };
      field: string;
    }>;
  }>;
}

export interface WhatsAppSendMessageRequest {
  messaging_product: 'whatsapp';
  to: string;
  type: 'text' | 'template';
  text?: {
    body: string;
  };
  template?: {
    name: string;
    language: {
      code: string;
    };
    components?: Array<{
      type: string;
      parameters: Array<{
        type: string;
        text: string;
      }>;
    }>;
  };
}

export interface WhatsAppMediaResponse {
  id: string;
  url?: string;
  mime_type?: string;
  sha256?: string;
  file_size?: number;
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly authToken: string;
  private readonly accountSid: string;
  private readonly phoneNumber: string;
  private readonly apiUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly dumpService: DumpService,
    private readonly helpCommand: HelpCommand,
    private readonly recentCommand: RecentCommand,
    private readonly searchCommand: SearchCommand,
    private readonly reportCommand: ReportCommand,
    private readonly responseFormatterService: ResponseFormatterService,
  ) {
    // Twilio WhatsApp API Configuration
    this.authToken =
      this.configService.get<string>('WHATSAPP_AUTH_TOKEN') || '';
    this.accountSid =
      this.configService.get<string>('WHATSAPP_ACCOUNT_SID') || '';
    this.phoneNumber =
      this.configService.get<string>('WHATSAPP_PHONE_NUMBER') || '';
    this.apiUrl = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}`;

    if (!this.authToken || !this.accountSid || !this.phoneNumber) {
      this.logger.warn('WhatsApp Twilio credentials not fully configured');
    }
  }

  async sendMessage(
    request: WhatsAppSendMessageRequest,
  ): Promise<{ id: string }> {
    this.logger.log(`Sending WhatsApp message to ${request.to}`);

    // Ensure phone number has whatsapp: prefix for Twilio
    const toNumber = request.to.startsWith('whatsapp:') 
      ? request.to 
      : `whatsapp:${request.to}`;

    // Convert to Twilio format
    const twilioRequest = {
      From: this.phoneNumber,
      To: toNumber,
      Body: request.text?.body || '',
    };

    const response = await fetch(`${this.apiUrl}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(this.accountSid + ':' + this.authToken).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(twilioRequest).toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Failed to send WhatsApp message: ${error}`);
      throw new Error(`Twilio WhatsApp API error: ${response.status} ${error}`);
    }

    const data = (await response.json()) as { sid: string };
    return { id: data.sid };
  }

  async sendTextMessage(to: string, text: string): Promise<{ id: string }> {
    return this.sendMessage({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: {
        body: text,
      },
    });
  }

  async sendFormattedResponse(
    userId: string,
    to: string,
    result: DumpProcessingResult,
    replyToMessageId?: string,
  ): Promise<string> {
    // Extract analysis and entities from the dump
    const dump = result.dump;
    const extractedEntities = dump.extracted_entities || {};
    
    // Build ContentAnalysisResponse from dump data
    const analysis: ContentAnalysisResponse = {
      summary: dump.ai_summary || '',
      category: dump.category?.name || 'General',
      categoryConfidence: (dump.ai_confidence || 95) / 100,
      extractedEntities: {
        dates: extractedEntities.entities?.dates || [],
        times: extractedEntities.entities?.times || [],
        locations: extractedEntities.entities?.locations || [],
        people: extractedEntities.entities?.people || [],
        organizations: extractedEntities.entities?.organizations || [],
        amounts: extractedEntities.entities?.amounts || [],
        tags: [],
      },
      actionItems: extractedEntities.actionItems || [],
      sentiment: (extractedEntities.sentiment as 'positive' | 'neutral' | 'negative') || 'neutral',
      urgency: (extractedEntities.urgency as 'low' | 'medium' | 'high') || 'low',
      confidence: (dump.ai_confidence || 95) / 100,
    };

    // Build EntityExtractionResult from dump data
    const entities: EntityExtractionResult = {
      entities: (extractedEntities.entityDetails || []).map((entity: any) => ({
        type: entity.type as 'date' | 'time' | 'location' | 'person' | 'organization' | 'amount' | 'phone' | 'email' | 'url',
        value: entity.value,
        confidence: entity.confidence,
        context: entity.context,
        position: entity.position,
      })),
      summary: extractedEntities.entitySummary || {
        totalEntities: 0,
        entitiesByType: {},
        averageConfidence: 0,
      },
      structuredData: {
        dates: extractedEntities.entities?.dates || [],
        times: extractedEntities.entities?.times || [],
        locations: extractedEntities.entities?.locations || [],
        people: extractedEntities.entities?.people || [],
        organizations: extractedEntities.entities?.organizations || [],
        amounts: extractedEntities.entities?.amounts || [],
        contacts: extractedEntities.entities?.contacts || {
          phones: [],
          emails: [],
          urls: [],
        },
      },
    };

    // Use ResponseFormatterService with brief format
    const formatted = await this.responseFormatterService.formatAnalysisResponse(
      userId,
      analysis,
      entities,
      {
        platform: 'whatsapp',
        format: 'brief',
        includeEmojis: true,
        includeMarkdown: false, // WhatsApp uses basic markdown
      },
    );

    // WhatsApp doesn't support HTML, use plain text
    const messageText = formatted.text || formatted.html || 'Content processed successfully';

    const response = await this.sendTextMessage(to, messageText);
    return response.id;
  }

  async getMedia(mediaUrl: string): Promise<WhatsAppMediaResponse> {
    this.logger.log(`Getting media info for ${mediaUrl}`);

    // For Twilio, media URL is directly accessible
    const response = await fetch(mediaUrl, {
      headers: {
        Authorization: `Basic ${Buffer.from(this.accountSid + ':' + this.authToken).toString('base64')}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Failed to get WhatsApp media: ${error}`);
      throw new Error(`Twilio WhatsApp API error: ${response.status} ${error}`);
    }

    // Return media info (Twilio format is different)
    return {
      id: mediaUrl,
      url: mediaUrl,
      mime_type:
        response.headers.get('content-type') || 'application/octet-stream',
      file_size: Number.parseInt(response.headers.get('content-length') || '0'),
    };
  }

  async downloadMedia(mediaUrl: string): Promise<Buffer> {
    this.logger.log(`Downloading media from ${mediaUrl}`);

    const response = await fetch(mediaUrl, {
      headers: {
        Authorization: `Basic ${Buffer.from(this.accountSid + ':' + this.authToken).toString('base64')}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download media: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async processWebhookPayload(payload: WhatsAppWebhookPayload): Promise<void> {
    try {
      this.logger.log('Processing WhatsApp webhook payload');

      if (payload.object !== 'whatsapp_business_account') {
        this.logger.warn('Received non-WhatsApp webhook payload');
        return;
      }

      for (const entry of payload.entry) {
        await this.processEntry(entry);
      }
    } catch (error) {
      this.logger.error('Error processing WhatsApp webhook:', error);
      throw error;
    }
  }

  private async processEntry(
    entry: WhatsAppWebhookPayload['entry'][0],
  ): Promise<void> {
    for (const change of entry.changes) {
      if (change.field === 'messages') {
        const { messages, contacts } = change.value;

        if (messages && messages.length > 0) {
          for (const message of messages) {
            await this.processMessage(message, contacts?.[0]);
          }
        }
      }
    }
  }

  private async processMessage(
    message: WhatsAppMessage,
    contact?: WhatsAppContact,
  ): Promise<void> {
    const _contact = contact;
    try {
      const phoneNumber = message.from;
      this.logger.log(`Processing message from ${phoneNumber}`);

      // Skip processing for test phone numbers
      if (phoneNumber.includes('1234567890') || phoneNumber.includes('test')) {
        this.logger.log(
          'Test message detected - skipping user lookup and response',
        );
        return;
      }

      // Find user by WhatsApp chat ID
      const user = await this.userService.findByChatId(phoneNumber, 'whatsapp');

      if (!user) {
        // This should not happen as webhook controller handles registration
        // But keeping as safety fallback
        this.logger.warn(`User not found for WhatsApp number ${phoneNumber} - skipping message processing`);
        return;
      }

      // Handle different message types
      switch (message.type) {
        case 'text':
          await this.handleTextMessage(message, user.id);
          break;
        case 'audio':
        case 'voice':
          await this.handleAudioMessage(message, user.id);
          break;
        case 'image':
          await this.handleImageMessage(message, user.id);
          break;
        case 'document':
          await this.handleDocumentMessage(message, user.id);
          break;
        default:
          await this.sendTextMessage(
            phoneNumber,
            "⚠️ Sorry, I don't support this message type yet. Please send text, voice, photos, or documents.",
          );
      }
    } catch (error) {
      this.logger.error('Error processing WhatsApp message:', error);

      await this.sendTextMessage(
        message.from,
        '❌ Sorry, something went wrong. Please try again later.',
      );
    }
  }

  private async handleTextMessage(
    message: WhatsAppMessage,
    userId: string,
  ): Promise<void> {
    const phoneNumber = message.from;
    const text = message.text?.body || '';
    const isTestMode =
      process.env.NODE_ENV === 'development' ||
      process.env.WHATSAPP_TEST_MODE === 'true';

    this.logger.log(`Handling text message: "${text.substring(0, 50)}..."`);

    // Handle bot commands
    if (
      text.startsWith('/') ||
      text.toLowerCase().includes('help') ||
      text.toLowerCase().includes('start') ||
      text.toLowerCase().includes('more')||
      text.toLowerCase().includes('recent')||
      text.toLowerCase().includes('report')||
      text.toLowerCase().includes('search')
    ) {
      await this.handleCommand(text, phoneNumber, userId);
      return;
    }

    try {
      // Create dump request for enhanced processing
      const dumpRequest: CreateDumpRequest = {
        userId,
        content: text,
        contentType: 'text',
        metadata: {
          source: 'whatsapp',
          messageId: message.id,
          chatId: phoneNumber,
        },
      };

      // Process with enhanced ContentRouterService integration
      const result = await this.dumpService.createDumpEnhanced(dumpRequest);

      this.logger.log(
        `✅ Message processed successfully: ${result.dump.ai_summary}`,
      );
      this.logger.log(
        `📊 Analysis: Category=${result.dump.category?.name}, Confidence=${result.dump.ai_confidence}%`,
      );

      if (isTestMode) {
        this.logger.log(
          'TEST MODE: Would send formatted response - simulating success',
        );
        return;
      }

      // Send success response with processing details
      await this.sendFormattedResponse(
        userId,
        phoneNumber,
        result,
      );
    } catch (error) {
      this.logger.error('Error processing text message:', error);

      if (isTestMode) {
        this.logger.log(
          'TEST MODE: Would send error message - simulating error handling',
        );
        return;
      }

      await this.sendTextMessage(
        phoneNumber,
        '❌ Sorry, something went wrong while processing your message. Please try again later.',
      );
    }
  }

  private async handleAudioMessage(
    message: WhatsAppMessage,
    userId: string,
  ): Promise<void> {
    const phoneNumber = message.from;
    const audio = message.audio || message.voice;

    if (!audio) {
      await this.sendTextMessage(
        phoneNumber,
        '❌ Failed to process audio message.',
      );
      return;
    }

    this.logger.log(`Handling audio message: ${audio.id}`);

    try {
      // For Twilio, audio.id is actually the media URL
      const audioBuffer = await this.downloadMedia(audio.id);

      // Create dump request for enhanced voice processing
      const dumpRequest: CreateDumpRequest = {
        userId,
        content: 'Voice message',
        contentType: 'voice',
        metadata: {
          source: 'whatsapp',
          messageId: message.id,
          chatId: phoneNumber,
          mimeType: audio.mime_type || 'audio/ogg',
        },
        mediaBuffer: audioBuffer,
      };

      // Process with enhanced ContentRouterService integration
      const result = await this.dumpService.createDumpEnhanced(dumpRequest);

      // Send success response with processing details
      await this.sendFormattedResponse(
        userId,
        phoneNumber,
        result,
      );
    } catch (error) {
      this.logger.error('Error handling audio message:', error);
      await this.sendTextMessage(
        phoneNumber,
        '❌ Failed to process audio message.',
      );
    }
  }

  private async handleImageMessage(
    message: WhatsAppMessage,
    userId: string,
  ): Promise<void> {
    const phoneNumber = message.from;
    const image = message.image;

    if (!image) {
      await this.sendTextMessage(phoneNumber, '❌ Failed to process image.');
      return;
    }

    this.logger.log(`Handling image message: ${image.id}`);

    try {
      // For Twilio, image.id is actually the media URL
      const imageBuffer = await this.downloadMedia(image.id);

      // Create dump request for enhanced image processing
      const dumpRequest: CreateDumpRequest = {
        userId,
        content: image.caption || 'Image',
        contentType: 'image',
        originalText: image.caption,
        metadata: {
          source: 'whatsapp',
          messageId: message.id,
          chatId: phoneNumber,
          mimeType: image.mime_type || 'image/jpeg',
        },
        mediaBuffer: imageBuffer,
      };

      // Process with enhanced ContentRouterService integration
      const result = await this.dumpService.createDumpEnhanced(dumpRequest);

      // Send success response with processing details
      await this.sendFormattedResponse(
        userId,
        phoneNumber,
        result,
      );
    } catch (error) {
      this.logger.error('Error handling image message:', error);
      await this.sendTextMessage(phoneNumber, '❌ Failed to process image.');
    }
  }

  private async handleDocumentMessage(
    message: WhatsAppMessage,
    userId: string,
  ): Promise<void> {
    const phoneNumber = message.from;
    const document = message.document;

    if (!document) {
      await this.sendTextMessage(phoneNumber, '❌ Failed to process document.');
      return;
    }

    this.logger.log(`Handling document message: ${document.id}`);

    try {
      // For Twilio, document.id is actually the media URL
      const documentBuffer = await this.downloadMedia(document.id);

      // Create dump request for enhanced document processing
      const dumpRequest: CreateDumpRequest = {
        userId,
        content: document.caption || document.filename || 'Document',
        contentType: 'document',
        originalText: document.caption,
        metadata: {
          source: 'whatsapp',
          messageId: message.id,
          chatId: phoneNumber,
          fileName: document.filename,
          mimeType: document.mime_type,
        },
        mediaBuffer: documentBuffer,
      };

      // Process with enhanced ContentRouterService integration
      const result = await this.dumpService.createDumpEnhanced(dumpRequest);

      // Send success response with processing details
      await this.sendFormattedResponse(
        userId,
        phoneNumber,
        result,
      );
    } catch (error) {
      this.logger.error('Error handling document message:', error);
      await this.sendTextMessage(phoneNumber, '❌ Failed to process document.');
    }
  }

  private async handleCommand(
    command: string,
    phoneNumber: string,
    userId: string,
  ): Promise<void> {
    // Remove common command prefixes and normalize
    const normalizedCommand = command
      .toLowerCase()
      .trim()
      .replace(/^[/!#@]/, ''); // Remove leading /, !, #, or @

    const [cmd] = normalizedCommand.split(' ');

    // Get the user entity for command handlers
    const user = await this.userService.findOne(userId);
    if (!user) {
      await this.sendTextMessage(
        phoneNumber,
        '❌ User not found. Please restart by sending "start"',
      );
      return;
    }

    try {
      switch (cmd) {
        case 'start':
        case 'hello':
        case 'hi': {
          await this.sendTextMessage(
            phoneNumber,
            '👋 Welcome to Clutter.AI!\n\n' +
              'I help you capture and organize any content you send me.\n\n' +
              'Send me:\n' +
              '📝 Text messages\n' +
              '🎤 Voice messages\n' +
              '📷 Photos\n' +
              '📄 Documents\n\n' +
              'Type "help" for more commands.',
          );
          break;
        }

        case 'help': {
          const helpMessage = this.helpCommand.execute('whatsapp');
          await this.sendTextMessage(phoneNumber, helpMessage);
          break;
        }

        case 'recent': {
          const recentMessage = await this.recentCommand.execute(user, 5, 'whatsapp');
          await this.sendTextMessage(phoneNumber, recentMessage);
          break;
        }

        case 'search': {
          const searchMessage = await this.searchCommand.execute(user, command, 'whatsapp');
          await this.sendTextMessage(phoneNumber, searchMessage);
          break;
        }

        case 'report': {
          const reportMessage = await this.reportCommand.execute(user, command, 'whatsapp');
          await this.sendTextMessage(phoneNumber, reportMessage);
          break;
        }

        default: {
          await this.sendTextMessage(
            phoneNumber,
            '❓ I didn\'t understand that command. Send "help" to see available commands.',
          );
        }
      }
    } catch (error) {
      this.logger.error(`Error executing command ${cmd}:`, error);
      await this.sendTextMessage(
        phoneNumber,
        '❌ Sorry, something went wrong executing that command. Please try again.',
      );
    }
  }

  /**
   * Convert HTML formatting to WhatsApp markdown
   * Telegram uses HTML tags, WhatsApp uses markdown-like syntax
   */
  private convertHtmlToWhatsApp(text: string): string {
    return text
      .replaceAll(/<b>(.*?)<\/b>/g, '*$1*') // Bold
      .replaceAll(/<i>(.*?)<\/i>/g, '_$1_') // Italic
      .replaceAll(/<code>(.*?)<\/code>/g, '```$1```') // Code
      .replaceAll(/<pre>(.*?)<\/pre>/g, '```$1```') // Preformatted
      .replaceAll(/<[^>]*>/g, ''); // Remove any remaining HTML tags
  }

  /**
   * Auto-register a WhatsApp user using their phone number from Twilio webhook
   * This is simpler than Telegram since we already have the phone number!
   */
  async autoRegisterUser(phoneNumber: string): Promise<void> {
    try {
      this.logger.log(`Auto-registering WhatsApp user: ${phoneNumber}`);

      // Check if user already exists with this phone number
      const existingUser = await this.userService.findByPhone(phoneNumber);

      if (existingUser) {
        // Update existing user with WhatsApp chat ID
        await this.userService.update(existingUser.id, {
          chat_id_whatsapp: phoneNumber,
        });

        await this.sendTextMessage(
          phoneNumber,
          `✅ Welcome back! Your account has been linked to WhatsApp.\n\n` +
            `You can now send me:\n` +
            `📝 Text messages to save thoughts\n` +
            `🎤 Voice messages\n` +
            `📸 Photos\n` +
            `📄 Documents\n\n` +
            `Try sending: "Preciso lembrar de comprar leite hoje"`,
        );

        this.logger.log(
          `Linked existing user ${existingUser.id} to WhatsApp: ${phoneNumber}`,
        );
      } else {
        // Create new user
        const newUser = await this.userService.create({
          phone_number: phoneNumber,
          timezone: 'Europe/Lisbon', // Default for Portuguese users
          language: 'pt',
        });

        // Update with WhatsApp chat ID
        await this.userService.update(newUser.id, {
          chat_id_whatsapp: phoneNumber,
        });

        await this.sendTextMessage(
          phoneNumber,
          `🎉 Registration complete! Welcome to your personal life inbox.\n\n` +
            `I'll help you capture and organize everything:\n` +
            `📝 Notes and reminders\n` +
            `🎤 Voice messages\n` +
            `📸 Photos and documents\n` +
            `🔍 Smart search and categorization\n\n` +
            `Try sending: "Reunião com cliente amanhã às 15h"`,
        );

        this.logger.log(
          `Created new user ${newUser.id} for WhatsApp: ${phoneNumber}`,
        );
      }
    } catch (error) {
      this.logger.error('Error during auto-registration:', error);
      await this.sendTextMessage(
        phoneNumber,
        '❌ Sorry, there was an error during registration. Please try again or contact support.',
      );
      throw error;
    }
  }

  /**
   * Handle phone number registration for Telegram (kept for backward compatibility)
   * Note: WhatsApp doesn't need this since we get the phone number from Twilio
   */
  async handlePhoneNumberRegistration(phoneNumber: string, text: string): Promise<boolean> {
    // Detect phone number pattern (international format)
    const phonePattern = /^\+?[1-9]\d{1,14}$/;
    const cleanPhone = text.replaceAll(/[\s\-()]/g, '');

    if (!phonePattern.test(cleanPhone)) {
      return false; // Not a valid phone number
    }

    try {
      // Check if user already exists with this phone number
      const existingUser = await this.userService.findByPhone(cleanPhone);

      if (existingUser) {
        // Update existing user with WhatsApp chat ID
        await this.userService.update(existingUser.id, {
          chat_id_whatsapp: phoneNumber,
        });

        await this.sendTextMessage(
          phoneNumber,
          `✅ Welcome back! Your account has been linked to WhatsApp.\n\n` +
            `You can now send me:\n` +
            `📝 Text messages to save thoughts\n` +
            `🎤 Voice messages\n` +
            `📸 Photos\n` +
            `📄 Documents\n\n` +
            `Try sending: "Preciso lembrar de comprar leite hoje"`,
        );

        this.logger.log(
          `Linked existing user ${existingUser.id} to WhatsApp chat ${phoneNumber}`,
        );
        return true;
      } else {
        // Create new user
        const newUser = await this.userService.create({
          phone_number: cleanPhone,
          timezone: 'Europe/Lisbon', // Default for Portuguese users
          language: 'pt',
        });

        // Update with WhatsApp chat ID
        await this.userService.update(newUser.id, {
          chat_id_whatsapp: phoneNumber,
        });

        await this.sendTextMessage(
          phoneNumber,
          `🎉 Registration complete! Welcome to your personal life inbox.\n\n` +
            `I'll help you capture and organize everything:\n` +
            `📝 Notes and reminders\n` +
            `🎤 Voice messages\n` +
            `📸 Photos and documents\n` +
            `🔍 Smart search and categorization\n\n` +
            `Try sending: "Reunião com cliente amanhã às 15h"`,
        );

        this.logger.log(
          `Created new user ${newUser.id} for WhatsApp chat ${phoneNumber}`,
        );
        return true;
      }
    } catch (error) {
      this.logger.error('Error during phone registration:', error);
      await this.sendTextMessage(
        phoneNumber,
        '❌ Sorry, there was an error during registration. Please try again or contact support.',
      );
      return true; // Handled, even if failed
    }
  }

  /**
   * Process Twilio webhook payload (different from Meta webhook format)
   */
  async processTwilioWebhook(body: any): Promise<void> {
    try {
      this.logger.log('Processing Twilio WhatsApp webhook');

      const message = this.convertTwilioToMessage(body);
      await this.processMessage(message);
    } catch (error) {
      this.logger.error('Error processing Twilio WhatsApp webhook:', error);
      throw error;
    }
  }

  /**
   * Convert Twilio webhook format to our message format
   */
  private convertTwilioToMessage(twilioBody: any): WhatsAppMessage {
    const numMedia = Number.parseInt(twilioBody.NumMedia || '0');
    const hasMedia = numMedia > 0;
    const mediaUrl = twilioBody.MediaUrl0;
    const mediaType = twilioBody.MediaContentType0;

    let type: WhatsAppMessage['type'] = 'text';
    const processedMessage: Partial<WhatsAppMessage> = {};

    if (hasMedia && mediaType) {
      if (mediaType.startsWith('image/')) {
        type = 'image';
        processedMessage.image = {
          id: mediaUrl,
          mime_type: mediaType,
          sha256: '',
          caption: twilioBody.Body,
        };
      } else if (mediaType.startsWith('audio/')) {
        type = 'audio';
        processedMessage.audio = {
          id: mediaUrl,
          mime_type: mediaType,
          sha256: '',
        };
      } else if (mediaType.startsWith('video/')) {
        type = 'video';
      } else {
        type = 'document';
        processedMessage.document = {
          id: mediaUrl,
          filename: 'document',
          mime_type: mediaType,
          sha256: '',
          caption: twilioBody.Body,
        };
      }
    } else if (twilioBody.Body) {
      // type is already 'text' by default
      processedMessage.text = {
        body: twilioBody.Body,
      };
    }

    return {
      MessageSid: twilioBody.MessageSid,
      From: twilioBody.From,
      To: twilioBody.To,
      Body: twilioBody.Body,
      NumMedia: twilioBody.NumMedia,
      MediaUrl0: twilioBody.MediaUrl0,
      MediaContentType0: twilioBody.MediaContentType0,
      // Computed properties
      id: twilioBody.MessageSid,
      from: twilioBody.From.replace('whatsapp:', ''),
      timestamp: new Date().toISOString(),
      type,
      ...processedMessage,
    } as WhatsAppMessage;
  }

  // Note: Twilio WhatsApp webhooks do not use verification tokens
  // This method is kept for compatibility but not used with Twilio
}
