import { Injectable, Logger } from '@nestjs/common';
import { ClaudeService, type ContentAnalysisResponse } from './claude.service';

export interface ExtractedEntity {
  type:
    | 'date'
    | 'time'
    | 'location'
    | 'person'
    | 'organization'
    | 'amount'
    | 'phone'
    | 'email'
    | 'url';
  value: string;
  confidence: number;
  context: string;
  position?: {
    start: number;
    end: number;
  };
}

export interface EntityExtractionRequest {
  content: string;
  contentType?: 'text' | 'voice' | 'image' | 'document';
  context?: {
    source: 'telegram' | 'whatsapp';
    userId?: string;
    timestamp: Date;
  };
}

export interface EntityExtractionResult {
  entities: ExtractedEntity[];
  summary: {
    totalEntities: number;
    entitiesByType: Record<string, number>;
    averageConfidence: number;
  };
  structuredData: {
    dates: string[];
    times: string[];
    locations: string[];
    people: string[];
    organizations: string[];
    amounts: string[];
    contacts: {
      phones: string[];
      emails: string[];
      urls: string[];
    };
  };
}

@Injectable()
export class EntityExtractionService {
  private readonly logger = new Logger(EntityExtractionService.name);

  // Common patterns for entity recognition
  private readonly patterns = {
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    phone:
      /(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,
    url: /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/g,
    currency:
      /[$€£¥₹]\s*[\d,]+(?:\.\d{2})?|\b\d+(?:\.\d{2})?\s*(?:dollars?|euros?|pounds?|yen|rupees?)\b/gi,
    date: /\b(?:(?:january|february|march|april|may|june|july|august|september|october|november|december)\.?\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?|\d{1,2}[-/.]\d{1,2}[-/.](?:\d{4}|\d{2})|\d{4}[-/.]\d{1,2}[-/.]\d{1,2})\b/gi,
    time: /\b(?:1[0-2]|0?[1-9]):(?:[0-5][0-9])\s*(?:am|pm|AM|PM)\b|\b(?:2[0-3]|[01]?[0-9]):(?:[0-5][0-9])\b/g,
  };

  constructor(private readonly claudeService: ClaudeService) {}

  async extractEntities(
    request: EntityExtractionRequest,
  ): Promise<EntityExtractionResult> {
    this.logger.log(
      `Extracting entities from content: ${request.content.substring(0, 100)}...`,
    );

    try {
      // Combine pattern-based and AI-based extraction
      const patternEntities = this.extractWithPatterns(request.content);
      const aiEntities = await this.extractWithAI(request);

      // Merge and deduplicate entities
      const allEntities = this.mergeEntities(patternEntities, aiEntities);

      // Structure the data for easy consumption
      const structuredData = this.structureEntities(allEntities);

      // Calculate summary statistics
      const summary = this.calculateSummary(allEntities);

      this.logger.log(
        `Extracted ${allEntities.length} entities with avg confidence ${summary.averageConfidence}`,
      );

      return {
        entities: allEntities,
        summary,
        structuredData,
      };
    } catch (error) {
      this.logger.error('Error extracting entities:', error);

      // Fallback to pattern-based extraction only
      const fallbackEntities = this.extractWithPatterns(request.content);
      const structuredData = this.structureEntities(fallbackEntities);
      const summary = this.calculateSummary(fallbackEntities);

      return {
        entities: fallbackEntities,
        summary,
        structuredData,
      };
    }
  }

  private extractWithPatterns(content: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];

    // Extract emails
    const emailMatches = Array.from(content.matchAll(this.patterns.email));
    emailMatches.forEach((match) => {
      entities.push({
        type: 'email',
        value: match[0],
        confidence: 0.9,
        context: this.getContext(content, match.index, match[0].length),
        position: {
          start: match.index,
          end: match.index + match[0].length,
        },
      });
    });

    // Extract phone numbers
    const phoneMatches = Array.from(content.matchAll(this.patterns.phone));
    phoneMatches.forEach((match) => {
      entities.push({
        type: 'phone',
        value: match[0],
        confidence: 0.8,
        context: this.getContext(content, match.index, match[0].length),
        position: {
          start: match.index,
          end: match.index + match[0].length,
        },
      });
    });

    // Extract URLs
    const urlMatches = Array.from(content.matchAll(this.patterns.url));
    urlMatches.forEach((match) => {
      entities.push({
        type: 'url',
        value: match[0],
        confidence: 0.95,
        context: this.getContext(content, match.index, match[0].length),
        position: {
          start: match.index,
          end: match.index + match[0].length,
        },
      });
    });

    // Extract currency amounts
    const currencyMatches = Array.from(
      content.matchAll(this.patterns.currency),
    );
    currencyMatches.forEach((match) => {
      entities.push({
        type: 'amount',
        value: match[0],
        confidence: 0.8,
        context: this.getContext(content, match.index, match[0].length),
        position: {
          start: match.index,
          end: match.index + match[0].length,
        },
      });
    });

    // Extract dates
    const dateMatches = Array.from(content.matchAll(this.patterns.date));
    dateMatches.forEach((match) => {
      entities.push({
        type: 'date',
        value: match[0],
        confidence: 0.7,
        context: this.getContext(content, match.index, match[0].length),
        position: {
          start: match.index,
          end: match.index + match[0].length,
        },
      });
    });

    // Extract times
    const timeMatches = Array.from(content.matchAll(this.patterns.time));
    timeMatches.forEach((match) => {
      entities.push({
        type: 'time',
        value: match[0],
        confidence: 0.8,
        context: this.getContext(content, match.index, match[0].length),
        position: {
          start: match.index,
          end: match.index + match[0].length,
        },
      });
    });

    return entities;
  }

  private async extractWithAI(
    request: EntityExtractionRequest,
  ): Promise<ExtractedEntity[]> {
    const prompt = `
      Extract entities from this content and return them in a structured format.
      
      Content: "${request.content}"
      
      Please identify and extract:
      - People (names)
      - Organizations (companies, institutions)
      - Locations (addresses, cities, countries)
      - Dates and times not already found by pattern matching
      - Important amounts or numbers
      
      For each entity, provide:
      - Type (person, organization, location, date, time, amount)
      - Value (the actual text)
      - Context (surrounding words for clarity)
      
      Return as a list of entities with high confidence only.
    `;

    try {
      const analysis = await this.claudeService.analyzeContent({
        content: prompt,
        contentType: 'text',
        context: {
          source: request.context?.source || 'telegram',
          userId: request.context?.userId || 'unknown',
          timestamp: request.context?.timestamp || new Date(),
        },
      });

      // Parse AI response to extract entities
      return this.parseAIEntities(analysis, request.content);
    } catch (error) {
      this.logger.warn(
        'AI entity extraction failed, using pattern-based only:',
        error,
      );
      return [];
    }
  }

  private parseAIEntities(
    analysis: ContentAnalysisResponse,
    originalContent: string,
  ): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];

    // Extract from the structured entities in the analysis
    if (analysis.extractedEntities) {
      // People
      if (analysis.extractedEntities.people) {
        analysis.extractedEntities.people.forEach((person) => {
          entities.push({
            type: 'person',
            value: person,
            confidence: 0.7,
            context: this.findContextForValue(originalContent, person),
          });
        });
      }

      // Organizations
      if (analysis.extractedEntities.organizations) {
        analysis.extractedEntities.organizations.forEach((org) => {
          entities.push({
            type: 'organization',
            value: org,
            confidence: 0.7,
            context: this.findContextForValue(originalContent, org),
          });
        });
      }

      // Locations
      if (analysis.extractedEntities.locations) {
        analysis.extractedEntities.locations.forEach((location) => {
          entities.push({
            type: 'location',
            value: location,
            confidence: 0.7,
            context: this.findContextForValue(originalContent, location),
          });
        });
      }

      // Dates
      if (analysis.extractedEntities.dates) {
        analysis.extractedEntities.dates.forEach((date) => {
          entities.push({
            type: 'date',
            value: date,
            confidence: 0.6,
            context: this.findContextForValue(originalContent, date),
          });
        });
      }

      // Times
      if (analysis.extractedEntities.times) {
        analysis.extractedEntities.times.forEach((time) => {
          entities.push({
            type: 'time',
            value: time,
            confidence: 0.6,
            context: this.findContextForValue(originalContent, time),
          });
        });
      }

      // Amounts
      if (analysis.extractedEntities.amounts) {
        analysis.extractedEntities.amounts.forEach((amount) => {
          entities.push({
            type: 'amount',
            value: amount,
            confidence: 0.6,
            context: this.findContextForValue(originalContent, amount),
          });
        });
      }
    }

    return entities;
  }

  private mergeEntities(
    patternEntities: ExtractedEntity[],
    aiEntities: ExtractedEntity[],
  ): ExtractedEntity[] {
    const allEntities = [...patternEntities];

    // Add AI entities that don't overlap with pattern entities
    aiEntities.forEach((aiEntity) => {
      const hasOverlap = patternEntities.some((patternEntity) =>
        this.entitiesOverlap(aiEntity, patternEntity),
      );

      if (!hasOverlap) {
        allEntities.push(aiEntity);
      }
    });

    // Sort by position if available, then by confidence
    return allEntities.sort((a, b) => {
      if (a.position && b.position) {
        return a.position.start - b.position.start;
      }
      return b.confidence - a.confidence;
    });
  }

  private entitiesOverlap(
    entity1: ExtractedEntity,
    entity2: ExtractedEntity,
  ): boolean {
    // Check if values are similar (case-insensitive)
    if (entity1.value.toLowerCase() === entity2.value.toLowerCase()) {
      return true;
    }

    // Check if one value contains the other
    const val1 = entity1.value.toLowerCase();
    const val2 = entity2.value.toLowerCase();

    return val1.includes(val2) || val2.includes(val1);
  }

  private structureEntities(
    entities: ExtractedEntity[],
  ): EntityExtractionResult['structuredData'] {
    const structured = {
      dates: [] as string[],
      times: [] as string[],
      locations: [] as string[],
      people: [] as string[],
      organizations: [] as string[],
      amounts: [] as string[],
      contacts: {
        phones: [] as string[],
        emails: [] as string[],
        urls: [] as string[],
      },
    };

    entities.forEach((entity) => {
      switch (entity.type) {
        case 'date':
          structured.dates.push(entity.value);
          break;
        case 'time':
          structured.times.push(entity.value);
          break;
        case 'location':
          structured.locations.push(entity.value);
          break;
        case 'person':
          structured.people.push(entity.value);
          break;
        case 'organization':
          structured.organizations.push(entity.value);
          break;
        case 'amount':
          structured.amounts.push(entity.value);
          break;
        case 'phone':
          structured.contacts.phones.push(entity.value);
          break;
        case 'email':
          structured.contacts.emails.push(entity.value);
          break;
        case 'url':
          structured.contacts.urls.push(entity.value);
          break;
      }
    });

    return structured;
  }

  private calculateSummary(
    entities: ExtractedEntity[],
  ): EntityExtractionResult['summary'] {
    const entitiesByType: Record<string, number> = {};
    let totalConfidence = 0;

    entities.forEach((entity) => {
      entitiesByType[entity.type] = (entitiesByType[entity.type] || 0) + 1;
      totalConfidence += entity.confidence;
    });

    return {
      totalEntities: entities.length,
      entitiesByType,
      averageConfidence:
        entities.length > 0 ? totalConfidence / entities.length : 0,
    };
  }

  private getContext(
    content: string,
    position: number,
    length: number,
  ): string {
    const contextRadius = 30;
    const start = Math.max(0, position - contextRadius);
    const end = Math.min(content.length, position + length + contextRadius);

    return content.slice(start, end).trim();
  }

  private findContextForValue(content: string, value: unknown): string {
    // Type guard: ensure value is a string
    if (typeof value !== 'string') {
      this.logger.warn(
        `Expected string value for entity but got ${typeof value}: ${JSON.stringify(value)}`,
      );
      return `Entity: ${String(value)}`;
    }

    // Trim whitespace and check for empty strings
    const trimmedValue = value.trim();
    if (!trimmedValue) {
      this.logger.warn('Empty string value provided for entity extraction');
      return 'No context available';
    }

    // Try to find exact match (case-insensitive)
    const index = content.toLowerCase().indexOf(trimmedValue.toLowerCase());
    if (index === -1) {
      // Value not found in original content - might be AI-inferred or translated
      return `Entity: ${trimmedValue}`;
    }

    return this.getContext(content, index, trimmedValue.length);
  }
}
