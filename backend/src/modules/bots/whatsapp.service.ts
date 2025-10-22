import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../users/user.service';

export interface WhatsAppMessage {
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
  private readonly accessToken: string;
  private readonly phoneNumberId: string;
  private readonly apiUrl: string;
  private readonly apiVersion: string = 'v18.0';

  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {
    this.accessToken =
      this.configService.get<string>('WHATSAPP_ACCESS_TOKEN') || '';
    this.phoneNumberId =
      this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID') || '';
    this.apiUrl = `https://graph.facebook.com/${this.apiVersion}`;

    if (!this.accessToken || !this.phoneNumberId) {
      this.logger.warn('WhatsApp credentials not fully configured');
    }
  }

  async sendMessage(
    request: WhatsAppSendMessageRequest,
  ): Promise<{ id: string }> {
    this.logger.log(`Sending WhatsApp message to ${request.to}`);

    const response = await fetch(
      `${this.apiUrl}/${this.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Failed to send WhatsApp message: ${error}`);
      throw new Error(`WhatsApp API error: ${response.status} ${error}`);
    }

    const data = (await response.json()) as { messages: Array<{ id: string }> };
    return { id: data.messages[0].id };
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
    to: string,
    title: string,
    content: string,
    category?: string,
    confidence?: number,
  ): Promise<{ id: string }> {
    let text = `✅ *${title}*\n\n`;
    text += `${content}\n\n`;

    if (category) {
      text += `📁 *Category:* ${category}\n`;
    }

    if (confidence !== undefined) {
      const confidencePercent = Math.round(confidence * 100);
      text += `🎯 *Confidence:* ${confidencePercent}%\n`;
    }

    text += `\n_Your content has been saved!_`;

    return this.sendTextMessage(to, text);
  }

  async getMedia(mediaId: string): Promise<WhatsAppMediaResponse> {
    this.logger.log(`Getting media info for ${mediaId}`);

    const response = await fetch(`${this.apiUrl}/${mediaId}`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Failed to get WhatsApp media: ${error}`);
      throw new Error(`WhatsApp API error: ${response.status} ${error}`);
    }

    return response.json() as Promise<WhatsAppMediaResponse>;
  }

  async downloadMedia(mediaUrl: string): Promise<Buffer> {
    this.logger.log(`Downloading media from ${mediaUrl}`);

    const response = await fetch(mediaUrl, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _contact = contact;
    try {
      const phoneNumber = message.from;
      this.logger.log(`Processing message from ${phoneNumber}`);

      // Find user by WhatsApp chat ID
      const user = await this.userService.findByChatId(phoneNumber, 'whatsapp');

      if (!user) {
        this.logger.log(`User not found for WhatsApp number ${phoneNumber}`);
        // For now, we'll need a phone number to create a user
        // This will be handled by the authentication flow
        await this.sendTextMessage(
          phoneNumber,
          '👋 Welcome! Please complete your registration to get started.',
        );
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

    this.logger.log(`Handling text message: "${text.substring(0, 50)}..."`);

    // Handle bot commands
    if (
      text.startsWith('/') ||
      text.toLowerCase().includes('help') ||
      text.toLowerCase().includes('start')
    ) {
      await this.handleCommand(text, phoneNumber, userId);
      return;
    }

    // For now, just acknowledge the message
    // This will be integrated with DumpService in T030
    await this.sendFormattedResponse(
      phoneNumber,
      'Content Received',
      text.length > 100 ? `${text.substring(0, 100)}...` : text,
      'General',
      0.95,
    );
  }

  private async handleAudioMessage(
    message: WhatsAppMessage,
    userId: string,
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _userId = userId;
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
      await this.getMedia(audio.id);
      // Audio processing will be implemented in T037

      await this.sendFormattedResponse(
        phoneNumber,
        'Audio Message Received',
        'Audio message is being processed...',
        'Audio',
        0.9,
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _userId = userId;
    const phoneNumber = message.from;
    const image = message.image;

    if (!image) {
      await this.sendTextMessage(phoneNumber, '❌ Failed to process image.');
      return;
    }

    this.logger.log(`Handling image message: ${image.id}`);

    try {
      await this.getMedia(image.id);
      // Image processing will be implemented in T038

      const caption = image.caption ? `\n\nCaption: ${image.caption}` : '';
      await this.sendFormattedResponse(
        phoneNumber,
        'Image Received',
        `Image is being processed for text extraction...${caption}`,
        'Media',
        0.85,
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _userId = userId;
    const phoneNumber = message.from;
    const document = message.document;

    if (!document) {
      await this.sendTextMessage(phoneNumber, '❌ Failed to process document.');
      return;
    }

    this.logger.log(`Handling document message: ${document.id}`);

    try {
      await this.getMedia(document.id);

      const caption = document.caption
        ? `\n\nCaption: ${document.caption}`
        : '';
      await this.sendFormattedResponse(
        phoneNumber,
        'Document Received',
        `Document "${document.filename}" is being processed...${caption}`,
        'Documents',
        0.8,
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _userId = userId;
    const normalizedCommand = command.toLowerCase();

    if (
      normalizedCommand.includes('start') ||
      normalizedCommand.includes('hello') ||
      normalizedCommand.includes('hi')
    ) {
      await this.sendTextMessage(
        phoneNumber,
        '👋 Welcome to Clutter.AI!\n\n' +
          'I help you capture and organize any content you send me.\n\n' +
          'Send me:\n' +
          '📝 Text messages\n' +
          '🎤 Voice messages\n' +
          '📷 Photos\n' +
          '📄 Documents\n\n' +
          'Type "help" for more information.',
      );
    } else if (normalizedCommand.includes('help')) {
      await this.sendTextMessage(
        phoneNumber,
        '🔧 *Available Commands:*\n\n' +
          '• Send "start" or "hello" - Welcome message\n' +
          '• Send "help" - Show this help\n' +
          '• Send "recent" - Show recent content\n' +
          '• Send "search" - Search your content\n' +
          '• Send "report" - Report an issue\n\n' +
          '_Just send me any content to get started!_',
      );
    } else if (normalizedCommand.includes('recent')) {
      // Will be implemented with DumpService
      await this.sendTextMessage(
        phoneNumber,
        '📋 Recent content feature coming soon!',
      );
    } else if (normalizedCommand.includes('search')) {
      // Will be implemented in Phase 4
      await this.sendTextMessage(phoneNumber, '🔍 Search feature coming soon!');
    } else if (normalizedCommand.includes('report')) {
      // Will be implemented in Phase 5
      await this.sendTextMessage(phoneNumber, '🚨 Report feature coming soon!');
    } else {
      await this.sendTextMessage(
        phoneNumber,
        '❓ I didn\'t understand that command. Send "help" to see available commands.',
      );
    }
  }

  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    const verifyToken = this.configService.get<string>('WHATSAPP_VERIFY_TOKEN');

    if (!verifyToken) {
      this.logger.error('WhatsApp verify token not configured');
      return null;
    }

    if (mode === 'subscribe' && token === verifyToken) {
      this.logger.log('WhatsApp webhook verified successfully');
      return challenge;
    }

    this.logger.warn('WhatsApp webhook verification failed');
    return null;
  }
}
