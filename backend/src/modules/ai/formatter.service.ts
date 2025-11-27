import { Injectable, Logger } from '@nestjs/common';
import { ContentAnalysisResponse } from './claude.service';
import { EntityExtractionResult } from './extraction.service';

export interface FormattingOptions {
  platform: 'telegram' | 'whatsapp';
  maxLength?: number;
  includeMarkdown?: boolean;
  includeEmojis?: boolean;
  format?: 'brief' | 'detailed' | 'summary';
}

export interface FormattedResponse {
  text: string;
  html?: string;
  markdown?: string;
  metadata: {
    platform: string;
    length: number;
    hasEntities: boolean;
    truncated: boolean;
  };
}

@Injectable()
export class ResponseFormatterService {
  private readonly logger = new Logger(ResponseFormatterService.name);

  // Platform-specific constraints
  private readonly constraints = {
    telegram: {
      maxLength: 4096,
      supportsMarkdown: true,
      supportsHtml: true,
      supportsEmojis: true,
    },
    whatsapp: {
      maxLength: 65536,
      supportsMarkdown: false,
      supportsHtml: false,
      supportsEmojis: true,
    },
  };

  // Emoji mappings for different content types
  private readonly emojis = {
    categories: {
      personal: '👤',
      work: '💼',
      financial: '💰',
      health: '🏥',
      travel: '✈️',
      shopping: '🛒',
      education: '📚',
      entertainment: '🎬',
      food: '🍽️',
      home: '🏠',
      other: '📝',
    },
    entities: {
      person: '👤',
      organization: '🏢',
      location: '📍',
      date: '📅',
      time: '⏰',
      amount: '💰',
      phone: '📞',
      email: '📧',
      url: '🔗',
    },
    sentiment: {
      positive: '😊',
      negative: '😟',
      neutral: '😐',
      urgent: '🚨',
      important: '⭐',
    },
    actions: {
      reminder: '⏰',
      task: '✅',
      question: '❓',
      info: 'ℹ️',
      warning: '⚠️',
    },
  };

  formatAnalysisResponse(
    analysis: ContentAnalysisResponse,
    entities: EntityExtractionResult,
    options: FormattingOptions,
  ): FormattedResponse {
    this.logger.log(`Formatting response for ${options.platform} platform`);

    const constraints = this.constraints[options.platform];
    let formattedText = '';

    try {
      switch (options.format) {
        case 'brief':
          formattedText = this.formatBrief(analysis, entities, options);
          break;
        case 'detailed':
          formattedText = this.formatDetailed(analysis, entities, options);
          break;
        case 'summary':
        default:
          formattedText = this.formatSummary(analysis, entities, options);
          break;
      }

      // Apply platform-specific formatting
      formattedText = this.applyPlatformFormatting(formattedText, options);

      // Truncate if necessary
      const truncated =
        formattedText.length > (options.maxLength || constraints.maxLength);
      if (truncated) {
        const maxLen = (options.maxLength || constraints.maxLength) - 3;
        formattedText = formattedText.substring(0, maxLen) + '...';
      }

      const result: FormattedResponse = {
        text: formattedText,
        metadata: {
          platform: options.platform,
          length: formattedText.length,
          hasEntities: entities.entities.length > 0,
          truncated,
        },
      };

      // Add additional formats if supported
      if (constraints.supportsMarkdown) {
        result.markdown = this.toMarkdown(
          formattedText,
          analysis,
          entities,
          options,
        );
      }

      if (constraints.supportsHtml) {
        result.html = this.toHtml(formattedText, analysis, entities, options);
      }

      this.logger.log(`Formatted response: ${formattedText.length} characters`);
      return result;
    } catch (error) {
      this.logger.error('Error formatting response:', error);

      // Fallback to simple text
      const fallbackText = this.createFallbackResponse(analysis, entities);
      return {
        text: fallbackText,
        metadata: {
          platform: options.platform,
          length: fallbackText.length,
          hasEntities: entities.entities.length > 0,
          truncated: false,
        },
      };
    }
  }

  private formatBrief(
    analysis: ContentAnalysisResponse,
    entities: EntityExtractionResult,
    options: FormattingOptions,
  ): string {
    const parts: string[] = [];

    // Category with emoji
    if (analysis.category && options.includeEmojis) {
      const emoji =
        this.emojis.categories[
          analysis.category as keyof typeof this.emojis.categories
        ] || '📝';
      parts.push(`${emoji} ${analysis.category.toUpperCase()}`);
    } else if (analysis.category) {
      parts.push(`Category: ${analysis.category}`);
    }

    // Brief summary
    if (analysis.summary) {
      const summary =
        analysis.summary.length > 100
          ? analysis.summary.substring(0, 97) + '...'
          : analysis.summary;
      parts.push(summary);
    }

    // Key entities (up to 3)
    const keyEntities = entities.entities
      .filter((e) =>
        ['person', 'organization', 'amount', 'date'].includes(e.type),
      )
      .slice(0, 3);

    if (keyEntities.length > 0) {
      const entityList = keyEntities
        .map((e) => {
          const emoji = options.includeEmojis
            ? this.emojis.entities[e.type]
            : '';
          return `${emoji}${e.value}`.trim();
        })
        .join(', ');
      parts.push(`Key info: ${entityList}`);
    }

    return parts.join('\n\n');
  }

  private formatDetailed(
    analysis: ContentAnalysisResponse,
    entities: EntityExtractionResult,
    options: FormattingOptions,
  ): string {
    const parts: string[] = [];

    // Header with category and confidence
    this.addCategoryHeader(parts, analysis, options);

    // Summary
    if (analysis.summary) {
      parts.push(`Summary: ${analysis.summary}`);
    }

    // Sentiment
    this.addSentiment(parts, analysis, options);

    // Extracted entities by type
    if (entities.entities.length > 0) {
      parts.push(this.formatEntitiesDetailed(entities, options));
    }

    return parts.join('\n\n');
  }

  private addCategoryHeader(
    parts: string[],
    analysis: ContentAnalysisResponse,
    options: FormattingOptions,
  ): void {
    if (analysis.category) {
      const emoji = options.includeEmojis
        ? this.emojis.categories[
            analysis.category as keyof typeof this.emojis.categories
          ] || '�'
        : '';
      const confidence = analysis.confidence
        ? ` (${Math.round(analysis.confidence * 100)}%)`
        : '';
      parts.push(
        `${emoji} ${analysis.category.toUpperCase()}${confidence}`.trim(),
      );
    }
  }

  private addSentiment(
    parts: string[],
    analysis: ContentAnalysisResponse,
    options: FormattingOptions,
  ): void {
    if (analysis.sentiment) {
      const emoji = options.includeEmojis
        ? this.emojis.sentiment[
            analysis.sentiment as keyof typeof this.emojis.sentiment
          ] || '😐'
        : '';
      parts.push(`Sentiment: ${emoji} ${analysis.sentiment}`.trim());
    }
  }

  private formatSummary(
    analysis: ContentAnalysisResponse,
    entities: EntityExtractionResult,
    options: FormattingOptions,
  ): string {
    const parts: string[] = [];

    // Category and summary
    if (analysis.category && analysis.summary) {
      const emoji = options.includeEmojis
        ? this.emojis.categories[
            analysis.category as keyof typeof this.emojis.categories
          ] || '📝'
        : '';
      parts.push(
        `${emoji} ${analysis.category.toUpperCase()}: ${analysis.summary}`.trim(),
      );
    } else if (analysis.summary) {
      parts.push(analysis.summary);
    }

    // Important entities
    const importantEntities = entities.entities
      .filter((e) => e.confidence > 0.7)
      .slice(0, 5);

    if (importantEntities.length > 0) {
      const entityText = importantEntities
        .map((e) => {
          const emoji = options.includeEmojis
            ? this.emojis.entities[e.type]
            : '';
          return `${emoji}${e.value}`.trim();
        })
        .join(', ');
      parts.push(`Contains: ${entityText}`);
    }

    // Urgency or importance
    if (analysis.urgency === 'high') {
      const emoji = options.includeEmojis ? '🚨 ' : '';
      parts.push(`${emoji}High priority item`.trim());
    }

    return parts.join('\n\n');
  }

  private formatEntitiesDetailed(
    entities: EntityExtractionResult,
    options: FormattingOptions,
  ): string {
    const parts: string[] = [];
    const { structuredData } = entities;

    this.addEntityGroup(parts, 'People', structuredData.people, '👤', options);
    this.addEntityGroup(
      parts,
      'Organizations',
      structuredData.organizations,
      '🏢',
      options,
    );
    this.addEntityGroup(
      parts,
      'Locations',
      structuredData.locations,
      '📍',
      options,
    );
    this.addEntityGroup(parts, 'Dates', structuredData.dates, '📅', options);
    this.addEntityGroup(parts, 'Amounts', structuredData.amounts, '�', options);
    this.addContactInfo(parts, structuredData.contacts, options);

    return parts.length > 0
      ? `Extracted Information:\n${parts.join('\n')}`
      : '';
  }

  private addEntityGroup(
    parts: string[],
    label: string,
    items: string[],
    emoji: string,
    options: FormattingOptions,
  ): void {
    if (items.length > 0) {
      const prefix = options.includeEmojis ? `${emoji} ` : '';
      parts.push(`${prefix}${label}: ${items.join(', ')}`);
    }
  }

  private addContactInfo(
    parts: string[],
    contacts: any,
    options: FormattingOptions,
  ): void {
    if (
      contacts.phones.length > 0 ||
      contacts.emails.length > 0 ||
      contacts.urls.length > 0
    ) {
      const contactParts: string[] = [];

      if (contacts.phones.length > 0) {
        const emoji = options.includeEmojis ? '📞 ' : '';
        contactParts.push(`${emoji}${contacts.phones.join(', ')}`);
      }

      if (contacts.emails.length > 0) {
        const emoji = options.includeEmojis ? '📧 ' : '';
        contactParts.push(`${emoji}${contacts.emails.join(', ')}`);
      }

      if (contacts.urls.length > 0) {
        const emoji = options.includeEmojis ? '🔗 ' : '';
        contactParts.push(`${emoji}${contacts.urls.join(', ')}`);
      }

      parts.push(`Contacts: ${contactParts.join(', ')}`);
    }
  }

  private applyPlatformFormatting(
    text: string,
    options: FormattingOptions,
  ): string {
    if (options.platform === 'telegram' && options.includeMarkdown) {
      // Apply Telegram markdown
      return this.applyTelegramMarkdown(text);
    } else if (options.platform === 'whatsapp') {
      // WhatsApp doesn't support markdown, so strip it
      return this.stripMarkdown(text);
    }
    return text;
  }

  private applyTelegramMarkdown(text: string): string {
    // Apply basic Telegram markdown
    text = text.replace(/\*\*(.*?)\*\*/g, '*$1*'); // Bold
    text = text.replace(/__(.*?)__/g, '_$1_'); // Italic
    text = text.replace(/`(.*?)`/g, '`$1`'); // Code
    return text;
  }

  private stripMarkdown(text: string): string {
    // Remove markdown formatting
    text = text.replace(/\*\*(.*?)\*\*/g, '$1');
    text = text.replace(/__(.*?)__/g, '$1');
    text = text.replace(/`(.*?)`/g, '$1');
    text = text.replace(/\[(.*?)\]\(.*?\)/g, '$1');
    return text;
  }

  private toMarkdown(
    text: string,
    analysis: ContentAnalysisResponse,
    entities: EntityExtractionResult,
    options: FormattingOptions,
  ): string {
    const parts: string[] = [];

    if (analysis.category) {
      parts.push(`## ${analysis.category.toUpperCase()}\n`);
    }

    parts.push(text);

    if (entities.entities.length > 0) {
      parts.push('\n### Extracted Information\n');
      entities.entities.forEach((entity) => {
        parts.push(`- **${entity.type}**: ${entity.value}`);
      });
    }

    return parts.join('\n');
  }

  private toHtml(
    text: string,
    analysis: ContentAnalysisResponse,
    entities: EntityExtractionResult,
    options: FormattingOptions,
  ): string {
    const parts: string[] = ['<div>'];

    if (analysis.category) {
      parts.push(`<h3>${analysis.category.toUpperCase()}</h3>`);
    }

    // Convert text to HTML paragraphs
    const paragraphs = text.split('\n\n');
    paragraphs.forEach((para) => {
      if (para.trim()) {
        parts.push(`<p>${para.replace(/\n/g, '<br>')}</p>`);
      }
    });

    if (entities.entities.length > 0) {
      parts.push('<h4>Extracted Information</h4>');
      parts.push('<ul>');
      entities.entities.forEach((entity) => {
        parts.push(`<li><strong>${entity.type}</strong>: ${entity.value}</li>`);
      });
      parts.push('</ul>');
    }

    parts.push('</div>');
    return parts.join('\n');
  }

  private createFallbackResponse(
    analysis: ContentAnalysisResponse,
    entities: EntityExtractionResult,
  ): string {
    const parts: string[] = [];

    if (analysis.summary) {
      parts.push(analysis.summary);
    } else if (analysis.category) {
      parts.push(`Processed as: ${analysis.category}`);
    } else {
      parts.push('Content processed successfully');
    }

    if (entities.summary.totalEntities > 0) {
      parts.push(`Found ${entities.summary.totalEntities} important details`);
    }

    return parts.join('\n');
  }

  formatError(error: string, options: FormattingOptions): FormattedResponse {
    const emoji = options.includeEmojis ? '⚠️ ' : '';
    const text =
      `${emoji}Sorry, I couldn't process that content right now. Please try again.`.trim();

    return {
      text,
      metadata: {
        platform: options.platform,
        length: text.length,
        hasEntities: false,
        truncated: false,
      },
    };
  }
}
