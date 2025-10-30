import {
  Controller,
  Post,
  Body,
  Logger,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DumpService, CreateDumpRequest } from '../dump.service';
import { WhatsAppService } from '../../bots/whatsapp.service';
import { UserService } from '../../users/user.service';

interface WhatsAppWebhookMessage {
  id: string;
  from: string;
  timestamp: string;
  type: 'text' | 'image' | 'audio' | 'voice' | 'video' | 'document';
  text?: {
    body: string;
  };
  image?: {
    caption?: string;
    mime_type: string;
    sha256: string;
    id: string;
  };
  audio?: {
    mime_type: string;
    sha256: string;
    id: string;
    voice?: boolean;
  };
  voice?: {
    mime_type: string;
    sha256: string;
    id: string;
  };
  video?: {
    caption?: string;
    mime_type: string;
    sha256: string;
    id: string;
  };
  document?: {
    caption?: string;
    filename?: string;
    mime_type: string;
    sha256: string;
    id: string;
  };
}

interface WhatsAppWebhookContact {
  profile: {
    name: string;
  };
  wa_id: string;
}

interface WhatsAppWebhookChange {
  value: {
    messaging_product: 'whatsapp';
    metadata: {
      display_phone_number: string;
      phone_number_id: string;
    };
    contacts?: WhatsAppWebhookContact[];
    messages?: WhatsAppWebhookMessage[];
    statuses?: Array<{
      id: string;
      status: 'sent' | 'delivered' | 'read' | 'failed';
      timestamp: string;
      recipient_id: string;
    }>;
  };
  field: 'messages';
}

interface WhatsAppWebhookEntry {
  id: string;
  changes: WhatsAppWebhookChange[];
}

interface WhatsAppWebhookRequest {
  object: 'whatsapp_business_account';
  entry: WhatsAppWebhookEntry[];
}

interface WhatsAppVerificationRequest {
  'hub.mode': string;
  'hub.verify_token': string;
  'hub.challenge': string;
}

@Controller('api/webhooks/whatsapp')
export class WhatsAppWebhookController {
  private readonly logger = new Logger(WhatsAppWebhookController.name);
  private readonly verifyToken: string;

  constructor(
    private readonly dumpService: DumpService,
    private readonly whatsappService: WhatsAppService,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {
    this.verifyToken = this.configService.get<string>('WHATSAPP_VERIFY_TOKEN') || '';
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() body: WhatsAppWebhookRequest | WhatsAppVerificationRequest): Promise<any> {
    // Handle webhook verification
    if ('hub.mode' in body && body['hub.mode'] === 'subscribe') {
      const mode = body['hub.mode'];
      const token = body['hub.verify_token'];
      const challenge = body['hub.challenge'];

      if (mode && token) {
        if (token === this.verifyToken) {
          this.logger.log('Webhook verified successfully');
          return challenge;
        } else {
          this.logger.warn('Webhook verification failed - invalid token');
          throw new BadRequestException('Invalid verify token');
        }
      }
    }

    // Handle webhook messages
    if ('object' in body && body.object === 'whatsapp_business_account') {
      this.logger.log('Received WhatsApp webhook', JSON.stringify(body, null, 2));

      try {
        for (const entry of body.entry) {
          for (const change of entry.changes) {
            if (change.field === 'messages' && change.value.messages) {
              for (const message of change.value.messages) {
                await this.processMessage(message, change.value.metadata.phone_number_id);
              }
            }
          }
        }

        return { status: 'success' };
      } catch (error) {
        this.logger.error('Error processing WhatsApp webhook:', error);
        throw new BadRequestException('Failed to process webhook');
      }
    }

    this.logger.warn('Unhandled webhook payload', body);
    return { status: 'ignored' };
  }

  private async processMessage(message: WhatsAppWebhookMessage, phoneNumberId: string): Promise<void> {
    try {
      // Find user by WhatsApp ID
      const user = await this.userService.findByChatId(message.from, 'whatsapp');
      if (!user) {
        this.logger.warn(`No user found for WhatsApp ID: ${message.from}`);
        
        // Send registration prompt
        await this.whatsappService.sendMessage({
          messaging_product: 'whatsapp',
          to: message.from,
          type: 'text',
          text: {
            body: '👋 Welcome! Please register first by providing your phone number to start using this service.',
          },
        });
        return;
      }

      // Determine content type and prepare dump request
      let dumpRequest: CreateDumpRequest;

      switch (message.type) {
        case 'text': {
          if (!message.text?.body) {
            this.logger.warn(`Text message without body from ${message.from}`);
            return;
          }
          
          dumpRequest = {
            userId: user.id,
            content: message.text.body,
            contentType: 'text',
            metadata: {
              source: 'whatsapp',
              messageId: message.id,
              chatId: message.from,
            },
          };
          break;
        }

        case 'voice':
        case 'audio': {
          const audioData = message.voice || message.audio;
          if (!audioData) {
            this.logger.warn(`Voice/audio message without data from ${message.from}`);
            return;
          }

          const audioBuffer = await this.whatsappService.downloadMedia(audioData.id);
          
          dumpRequest = {
            userId: user.id,
            content: 'Voice message',
            contentType: 'voice',
            metadata: {
              source: 'whatsapp',
              messageId: message.id,
              chatId: message.from,
              mimeType: audioData.mime_type,
            },
            mediaBuffer: audioBuffer,
          };
          break;
        }

        case 'image': {
          if (!message.image) {
            this.logger.warn(`Image message without data from ${message.from}`);
            return;
          }

          const imageBuffer = await this.whatsappService.downloadMedia(message.image.id);
          
          dumpRequest = {
            userId: user.id,
            content: message.image.caption || 'Image',
            contentType: 'image',
            originalText: message.image.caption,
            metadata: {
              source: 'whatsapp',
              messageId: message.id,
              chatId: message.from,
              mimeType: message.image.mime_type,
            },
            mediaBuffer: imageBuffer,
          };
          break;
        }

        case 'document': {
          if (!message.document) {
            this.logger.warn(`Document message without data from ${message.from}`);
            return;
          }

          const documentBuffer = await this.whatsappService.downloadMedia(message.document.id);
          
          dumpRequest = {
            userId: user.id,
            content: message.document.caption || message.document.filename || 'Document',
            contentType: 'document',
            originalText: message.document.caption,
            metadata: {
              source: 'whatsapp',
              messageId: message.id,
              chatId: message.from,
              fileName: message.document.filename,
              mimeType: message.document.mime_type,
            },
            mediaBuffer: documentBuffer,
          };
          break;
        }

        case 'video': {
          // For now, treat videos as images (we can extract frames for OCR)
          if (!message.video) {
            this.logger.warn(`Video message without data from ${message.from}`);
            return;
          }

          const videoBuffer = await this.whatsappService.downloadMedia(message.video.id);
          
          dumpRequest = {
            userId: user.id,
            content: message.video.caption || 'Video',
            contentType: 'image', // Treat as image for now
            originalText: message.video.caption,
            metadata: {
              source: 'whatsapp',
              messageId: message.id,
              chatId: message.from,
              mimeType: message.video.mime_type,
            },
            mediaBuffer: videoBuffer,
          };
          break;
        }

        default:
          this.logger.warn(`Unsupported message type: ${message.type} from ${message.from}`);
          await this.whatsappService.sendMessage({
            messaging_product: 'whatsapp',
            to: message.from,
            type: 'text',
            text: {
              body: '⚠️ Sorry, this message type is not supported yet. Please send text, voice, images, or documents.',
            },
          });
          return;
      }

      // Process the content with DumpService
      this.logger.log(`Processing ${dumpRequest.contentType} content for user ${user.id}`);
      const result = await this.dumpService.createDump(dumpRequest);

      // Send response back to user
      const responseText = this.formatSuccessResponse(result);
      await this.whatsappService.sendMessage({
        messaging_product: 'whatsapp',
        to: message.from,
        type: 'text',
        text: {
          body: responseText,
        },
      });

      this.logger.log(`Successfully processed message ${message.id} from ${message.from}`);

    } catch (error) {
      this.logger.error(`Error processing message ${message.id}:`, error);
      
      // Send error message to user
      try {
        await this.whatsappService.sendMessage({
          messaging_product: 'whatsapp',
          to: message.from,
          type: 'text',
          text: {
            body: '❌ Sorry, something went wrong while processing your message. Please try again later.',
          },
        });
      } catch (sendError) {
        this.logger.error('Failed to send error message:', sendError);
      }
    }
  }

  private formatSuccessResponse(result: any): string {
    const { analysis } = result;
    
    let response = '✅ Content processed successfully!\n\n';
    
    if (analysis.summary) {
      response += `📝 *Summary:* ${analysis.summary}\n\n`;
    }
    
    if (analysis.category && analysis.category !== 'uncategorized') {
      response += `📂 *Category:* ${analysis.category}\n`;
    }
    
    if (analysis.sentiment && analysis.sentiment !== 'neutral') {
      response += `😊 *Sentiment:* ${analysis.sentiment}\n`;
    }
    
    if (analysis.urgency && analysis.urgency !== 'low') {
      response += `⚡ *Urgency:* ${analysis.urgency}\n`;
    }
    
    if (analysis.actionItems && analysis.actionItems.length > 0) {
      response += `\n✅ *Action Items:*\n`;
      for (let i = 0; i < analysis.actionItems.length; i++) {
        response += `${i + 1}. ${analysis.actionItems[i]}\n`;
      }
    }
    
    response += `\n🔍 *Confidence:* ${Math.round(analysis.confidence * 100)}%`;
    
    return response;
  }
}