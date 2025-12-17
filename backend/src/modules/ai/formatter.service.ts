import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContentAnalysisResponse } from './claude.service';
import { EntityExtractionResult } from './extraction.service';
import { TranslationService } from './translation.service';
import { User } from '../../entities/user.entity';

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

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly translationService: TranslationService,
  ) {}

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

  async formatAnalysisResponse(
    userId: string,
    analysis: ContentAnalysisResponse,
    entities: EntityExtractionResult,
    options: FormattingOptions,
  ): Promise<FormattedResponse> {
    this.logger.log(`Formatting response for ${options.platform} platform`);

    // Fetch user to get language preference
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });
    const language = user?.language || 'en';

    // Translate analysis content if not English
    const translatedAnalysis = await this.translateAnalysis(analysis, language);

    const constraints = this.constraints[options.platform];
    let formattedText = '';

    try {
      switch (options.format) {
        case 'brief':
          formattedText = await this.formatBrief(
            translatedAnalysis,
            entities,
            options,
            language,
          );
          break;
        case 'detailed':
          formattedText = await this.formatDetailed(
            translatedAnalysis,
            entities,
            options,
            language,
          );
          break;
        case 'summary':
        default:
          formattedText = await this.formatSummary(
            translatedAnalysis,
            entities,
            options,
            language,
          );
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
        result.markdown = await this.toMarkdown(
          formattedText,
          translatedAnalysis,
          entities,
          options,
          language,
        );
      }

      if (constraints.supportsHtml) {
        result.html = await this.toHtml(
          formattedText,
          translatedAnalysis,
          entities,
          options,
          language,
        );
      }

      this.logger.log(`Formatted response: ${formattedText.length} characters`);
      return result;
    } catch (error) {
      this.logger.error('Error formatting response:', error);

      // Fallback to simple text
      const fallbackText = await this.createFallbackResponse(
        translatedAnalysis,
        entities,
        language,
      );
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

  /**
   * Translate analysis content to user's language
   */
  private async translateAnalysis(
    analysis: ContentAnalysisResponse,
    language: string,
  ): Promise<ContentAnalysisResponse> {
    if (language === 'en') {
      return analysis;
    }

    const translatedAnalysis = { ...analysis };

    // Translate summary if present
    if (analysis.summary) {
      const translated = await this.translationService.translate({
        text: analysis.summary,
        targetLanguage: language,
        context: 'Content summary',
      });
      translatedAnalysis.summary = translated.translatedText;
    }

    return translatedAnalysis;
  }

  /**
   * Translate static labels for formatting
   */
  private async translateLabels(language: string): Promise<{
    category: string;
    sentiment: string;
    summary: string;
    extractedInformation: string;
    keyInfo: string;
    contains: string;
    highPriority: string;
    title: string;
  }> {
    if (language === 'en') {
      return {
        category: 'Category',
        sentiment: 'Sentiment',
        summary: 'Summary',
        extractedInformation: 'Extracted Information',
        keyInfo: 'Key info',
        contains: 'Contains',
        highPriority: 'High priority item',
        title: 'All sorted!',
      };
    }

    const labels = [
      'Category',
      'Sentiment',
      'Summary',
      'Extracted Information',
      'Key info',
      'Contains',
      'High priority item',
      'All sorted!',
    ];

    const translated = await this.translationService.translateBatch(
      labels,
      language,
    );

    return {
      category: translated[0],
      sentiment: translated[1],
      summary: translated[2],
      extractedInformation: translated[3],
      keyInfo: translated[4],
      contains: translated[5],
      highPriority: translated[6],
      title: translated[7],
    };
  }

  private async formatBrief(
    analysis: ContentAnalysisResponse,
    entities: EntityExtractionResult,
    options: FormattingOptions,
    language: string,
  ): Promise<string> {
    const parts: string[] = [];
    const labels = await this.translateLabels(language);

    // Title showing content is captured and organized
    const titleEmoji = options.includeEmojis ? '✨ ' : '';
    parts.push(`${titleEmoji}${labels.title}`);

    // Category with emoji (already translated in analysis)
    if (analysis.category && options.includeEmojis) {
      const emoji =
        this.emojis.categories[
          analysis.category as keyof typeof this.emojis.categories
        ] || '📝';
      parts.push(`${emoji} ${analysis.category.toUpperCase()}`);
    } else if (analysis.category) {
      parts.push(`${labels.category}: ${analysis.category}`);
    }

    // Brief summary (already translated in analysis)
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
      parts.push(`${labels.keyInfo}: ${entityList}`);
    }

    return parts.join('\n\n');
  }

  private async formatDetailed(
    analysis: ContentAnalysisResponse,
    entities: EntityExtractionResult,
    options: FormattingOptions,
    language: string,
  ): Promise<string> {
    const parts: string[] = [];
    const labels = await this.translateLabels(language);

    // Header with category and confidence
    this.addCategoryHeader(parts, analysis, options, labels);

    // Summary (already translated in analysis)
    if (analysis.summary) {
      parts.push(`${labels.summary}: ${analysis.summary}`);
    }

    // Sentiment
    this.addSentiment(parts, analysis, options, labels);

    // Extracted entities by type
    if (entities.entities.length > 0) {
      parts.push(this.formatEntitiesDetailed(entities, options, labels));
    }

    return parts.join('\n\n');
  }

  private addCategoryHeader(
    parts: string[],
    analysis: ContentAnalysisResponse,
    options: FormattingOptions,
    labels: { category: string },
  ): void {
    if (analysis.category) {
      const emoji = options.includeEmojis
        ? this.emojis.categories[
            analysis.category as keyof typeof this.emojis.categories
          ] || '📝'
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
    labels: { sentiment: string },
  ): void {
    if (analysis.sentiment) {
      const emoji = options.includeEmojis
        ? this.emojis.sentiment[
            analysis.sentiment as keyof typeof this.emojis.sentiment
          ] || '😐'
        : '';
      parts.push(`${labels.sentiment}: ${emoji} ${analysis.sentiment}`.trim());
    }
  }

  private async formatSummary(
    analysis: ContentAnalysisResponse,
    entities: EntityExtractionResult,
    options: FormattingOptions,
    language: string,
  ): Promise<string> {
    const parts: string[] = [];
    const labels = await this.translateLabels(language);

    // Category and summary (summary already translated in analysis)
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
      parts.push(`${labels.contains}: ${entityText}`);
    }

    // Urgency or importance
    if (analysis.urgency === 'high') {
      const emoji = options.includeEmojis ? '🚨 ' : '';
      parts.push(`${emoji}${labels.highPriority}`.trim());
    }

    return parts.join('\n\n');
  }

  private formatEntitiesDetailed(
    entities: EntityExtractionResult,
    options: FormattingOptions,
    labels: { extractedInformation: string },
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
    this.addEntityGroup(
      parts,
      'Amounts',
      structuredData.amounts,
      '💰',
      options,
    );
    this.addContactInfo(parts, structuredData.contacts, options);

    return parts.length > 0
      ? `${labels.extractedInformation}:\n${parts.join('\n')}`
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

  private async toMarkdown(
    text: string,
    analysis: ContentAnalysisResponse,
    entities: EntityExtractionResult,
    options: FormattingOptions,
    language: string,
  ): Promise<string> {
    const parts: string[] = [];
    const labels = await this.translateLabels(language);

    if (analysis.category) {
      parts.push(`## ${analysis.category.toUpperCase()}\n`);
    }

    parts.push(text);

    if (entities.entities.length > 0) {
      parts.push(`\n### ${labels.extractedInformation}\n`);
      entities.entities.forEach((entity) => {
        parts.push(`- **${entity.type}**: ${entity.value}`);
      });
    }

    return parts.join('\n');
  }

  private async toHtml(
    text: string,
    analysis: ContentAnalysisResponse,
    entities: EntityExtractionResult,
    options: FormattingOptions,
    language: string,
  ): Promise<string> {
    const parts: string[] = [];
    const labels = await this.translateLabels(language);

    // For Telegram, only use supported HTML tags: <b>, <i>, <u>, <s>, <code>, <pre>, <a>
    // No <div>, <h3>, <p>, <ul>, <li> tags allowed

    if (analysis.category) {
      parts.push(`<b>${analysis.category.toUpperCase()}</b>`);
      parts.push(''); // Empty line
    }

    // Keep text as-is (already formatted with line breaks)
    parts.push(text);

    if (entities.entities.length > 0) {
      parts.push(''); // Empty line
      parts.push(`<b>${labels.extractedInformation}</b>`);
      entities.entities.forEach((entity) => {
        parts.push(`• <b>${entity.type}</b>: ${entity.value}`);
      });
    }

    return parts.join('\n');
  }

  private async createFallbackResponse(
    analysis: ContentAnalysisResponse,
    entities: EntityExtractionResult,
    language: string,
  ): Promise<string> {
    const parts: string[] = [];

    if (analysis.summary) {
      parts.push(analysis.summary);
    } else if (analysis.category) {
      // Translate "Processed as:" label
      if (language === 'en') {
        parts.push(`Processed as: ${analysis.category}`);
      } else {
        const translated = await this.translationService.translate({
          text: 'Processed as',
          targetLanguage: language,
          context: 'Fallback response label',
        });
        parts.push(`${translated.translatedText}: ${analysis.category}`);
      }
    } else {
      // Translate "Content processed successfully"
      if (language === 'en') {
        parts.push('Content processed successfully');
      } else {
        const translated = await this.translationService.translate({
          text: 'Content processed successfully',
          targetLanguage: language,
          context: 'Fallback success message',
        });
        parts.push(translated.translatedText);
      }
    }

    if (entities.summary.totalEntities > 0) {
      // Translate "Found X important details"
      if (language === 'en') {
        parts.push(`Found ${entities.summary.totalEntities} important details`);
      } else {
        const translated = await this.translationService.translate({
          text: `Found ${entities.summary.totalEntities} important details`,
          targetLanguage: language,
          context: 'Entity count message',
        });
        parts.push(translated.translatedText);
      }
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
