import { Injectable, Logger } from '@nestjs/common';
import { DumpService } from '../../dumps/services/dump.service';
import { User } from '../../../entities/user.entity';
import { ResponseFormatterService } from '../../ai/formatter.service';
import { ContentAnalysisResponse } from '../../ai/claude.service';
import { EntityExtractionResult } from '../../ai/extraction.service';

@Injectable()
export class RecentCommand {
  private readonly logger = new Logger(RecentCommand.name);

  constructor(
    private readonly dumpService: DumpService,
    private readonly responseFormatterService: ResponseFormatterService,
  ) {}

  async execute(
    user: User,
    limit: number = 5,
    platform: 'telegram' | 'whatsapp' = 'telegram',
  ): Promise<string> {
    try {
      this.logger.log(
        `Getting recent dumps for user ${user.id}, limit: ${limit}`,
      );

      const recentDumps = await this.dumpService.getRecentByUser(
        user.id,
        limit,
      );

      if (recentDumps.length === 0) {
        if (platform === 'whatsapp') {
          return (
            '📋 *Recent Content*\n\n' +
            "You haven't shared any content yet.\n\n" +
            '_Send me a message, photo, or voice note to get started!_'
          );
        }

        return (
          '📋 <b>Recent Content</b>\n\n' +
          "You haven't shared any content yet.\n\n" +
          '<i>Send me a message, photo, or voice note to get started!</i>'
        );
      }

      const headerText =
        platform === 'whatsapp'
          ? `📋 *Recent Content (${recentDumps.length} items)*\n\n`
          : `📋 <b>Recent Content (${recentDumps.length} items)</b>\n\n`;

      let response = headerText;

      for (const dump of recentDumps) {
        const date = new Date(dump.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        response += `━━━━━━━━━━━━━━━━━━\n`;
        response += `📅 ${date}\n\n`;

        // Build analysis and entities data from dump
        const extractedEntities = dump.extracted_entities || {};

        const analysis: ContentAnalysisResponse = {
          summary: dump.ai_summary || '',
          category: dump.category?.name || 'General',
          categoryConfidence: (dump.ai_confidence || 0) / 100,
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
          sentiment:
            (extractedEntities.sentiment as
              | 'positive'
              | 'neutral'
              | 'negative') || 'neutral',
          urgency:
            (extractedEntities.urgency as 'low' | 'medium' | 'high') || 'low',
          confidence: (dump.ai_confidence || 0) / 100,
        };

        const entities: EntityExtractionResult = {
          entities: (extractedEntities.entityDetails || []).map(
            (entity: any) => ({
              type: entity.type as
                | 'date'
                | 'time'
                | 'location'
                | 'person'
                | 'organization'
                | 'amount'
                | 'phone'
                | 'email'
                | 'url',
              value: entity.value,
              confidence: entity.confidence,
              context: entity.context,
              position: entity.position,
            }),
          ),
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

        // Use ResponseFormatterService with detailed format
        const formatted =
          await this.responseFormatterService.formatAnalysisResponse(
            user.id,
            analysis,
            entities,
            {
              platform: platform,
              format: 'detailed',
              includeEmojis: true,
              includeMarkdown: true,
            },
          );

        response += formatted.html || formatted.text;

        if (dump.processing_status === 'failed') {
          const failedText =
            platform === 'whatsapp'
              ? '\n⚠️ _Processing failed_'
              : '\n⚠️ <i>Processing failed</i>';
          response += failedText;
        } else if (dump.processing_status === 'processing') {
          const processingText =
            platform === 'whatsapp'
              ? '\n🔍 _Processing..._'
              : '\n🔍 <i>Processing...</i>';
          response += processingText;
        }

        response += '\n\n';
      }

      response += '━━━━━━━━━━━━━━━━━━\n';
      const footerText =
        platform === 'whatsapp'
          ? '_Use /search to find specific content_'
          : '<i>Use /search to find specific content</i>';
      response += footerText;
      return response;
    } catch (error) {
      this.logger.error(
        `Error getting recent dumps: ${error.message}`,
        error.stack,
      );

      if (platform === 'whatsapp') {
        return (
          '❌ *Error*\n\n' +
          "Sorry, I couldn't retrieve your recent content right now.\n\n" +
          '_Please try again in a moment._'
        );
      }

      return (
        '❌ <b>Error</b>\n\n' +
        "Sorry, I couldn't retrieve your recent content right now.\n\n" +
        '<i>Please try again in a moment.</i>'
      );
    }
  }

  private getCategoryIcon(categoryName?: string): string {
    const icons: Record<string, string> = {
      bill: '📄',
      reminder: '⏰',
      tracking: '📦',
      idea: '💡',
      task: '✓',
      information: 'ℹ️',
      social: '👥',
    };

    return icons[categoryName?.toLowerCase() || ''] || '📝';
  }
}
