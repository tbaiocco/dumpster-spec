import { Injectable, Logger } from '@nestjs/common';
import { ClaudeService } from '../ai/claude.service';

export interface QueryEnhancementRequest {
  originalQuery: string;
  userId: string;
  context?: {
    recentCategories?: string[];
    recentDumpCount?: number;
    userTimezone?: string;
  };
}

export interface QueryEnhancementResponse {
  original: string;
  enhanced: string;
  extractedIntents: string[];
  suggestedFilters: {
    contentTypes?: string[];
    dateRange?: { from?: string; to?: string };
    categories?: string[];
  };
  confidence: number;
}

@Injectable()
export class QueryEnhancementService {
  private readonly logger = new Logger(QueryEnhancementService.name);

  constructor(private readonly claudeService: ClaudeService) {}

  /**
   * Enhance search query using Claude AI to understand intent and context
   */
  async enhanceQuery(
    request: QueryEnhancementRequest,
  ): Promise<QueryEnhancementResponse> {
    this.logger.debug(`Enhancing query: "${request.originalQuery}"`);

    try {
      // Simple enhancement for basic queries (optimization)
      if (this.isSimpleQuery(request.originalQuery)) {
        return this.enhanceSimpleQuery(request);
      }

      // Complex enhancement using Claude AI
      return await this.enhanceWithAI(request);
    } catch (error) {
      this.logger.error('Query enhancement failed:', error);
      // Fallback to original query
      return {
        original: request.originalQuery,
        enhanced: request.originalQuery,
        extractedIntents: [],
        suggestedFilters: {},
        confidence: 0.5,
      };
    }
  }

  /**
   * Check if query is simple enough to enhance without AI
   */
  private isSimpleQuery(query: string): boolean {
    // Use AI for most queries now that Claude is working properly
    const words = query.trim().split(/\s+/);
    // Only use simple enhancement for very basic single-word queries
    return (
      words.length === 1 && query.length <= 4 && !this.hasComplexPatterns(query)
    );
  }

  /**
   * Check for complex patterns that need AI processing
   */
  private hasComplexPatterns(query: string): boolean {
    const complexPatterns = [
      /\b(when|where|who|what|how|why)\b/i, // Question words
      /\b(before|after|during|since|until)\b/i, // Time relationships
      /\b(about|regarding|related to|similar to)\b/i, // Contextual relationships
      /\b(find|show|search|look for)\b/i, // Intent verbs
      /\b(meeting|appointment|call|email)\b/i, // Common entity types
    ];

    return complexPatterns.some((pattern) => pattern.test(query));
  }

  /**
   * Enhance simple queries without AI (for very basic cases only)
   */
  private enhanceSimpleQuery(
    request: QueryEnhancementRequest,
  ): QueryEnhancementResponse {
    const query = request.originalQuery.toLowerCase().trim();

    // Add basic multilingual synonyms as fallback when AI fails
    const enhanced = this.addBasicMultilingualSynonyms(request.originalQuery);
    const extractedIntents: string[] = [];
    const suggestedFilters: any = {};

    // Date-related queries
    if (this.isDateQuery(query)) {
      const dateFilters = this.extractDateFilters(query);
      if (dateFilters) {
        suggestedFilters.dateRange = dateFilters;
        extractedIntents.push('temporal_search');
      }
    }

    // Content type detection
    const contentType = this.detectContentType(query);
    if (contentType) {
      suggestedFilters.contentTypes = [contentType];
      extractedIntents.push('content_type_filter');
    }

    return {
      original: request.originalQuery,
      enhanced,
      extractedIntents,
      suggestedFilters,
      confidence: 0.6, // Lower confidence for simple enhancement
    };
  }

  /**
   * Enhance query using Claude AI for complex understanding
   */
  private async enhanceWithAI(
    request: QueryEnhancementRequest,
  ): Promise<QueryEnhancementResponse> {
    const contextInfo = request.context
      ? `
User Context:
- Recent categories: ${request.context.recentCategories?.join(', ') || 'none'}
- Recent dump count: ${request.context.recentDumpCount || 0}
- Timezone: ${request.context.userTimezone || 'UTC'}
`
      : '';

    const prompt = `You are enhancing search queries for a multilingual personal life inbox system. Users store content in multiple languages (English, Portuguese, Spanish, French, etc.).

Original Query: "${request.originalQuery}"
${contextInfo}

Your task: Expand this query with synonyms and translations to improve multilingual search coverage.

Instructions:
1. Keep the original query terms
2. Add relevant synonyms in the same language
3. Add key English translations if query is in another language
4. Add conceptually related terms
5. Focus on searchable keywords, not full sentences

Examples:
- "contas de luz" → "contas de luz conta fatura boleto electricity bill power energy"
- "electricity bill" → "electricity bill electric power energy utility invoice receipt"
- "rendez-vous médecin" → "rendez-vous médecin appointment doctor medical consultation"

Respond in JSON format:
{
  "enhanced": "original query plus expanded synonyms and translations",
  "intents": ["primary_intent", "secondary_intent"],
  "filters": {
    "contentTypes": ["text", "voice", "image", "email"],
    "dateRange": {"from": "YYYY-MM-DD", "to": "YYYY-MM-DD"},
    "categories": ["category_name"]
  },
  "confidence": 0.95
}

Keep the enhanced query concise but comprehensive for better semantic search performance.`;

    try {
      this.logger.log(
        `Sending custom prompt to Claude for query: "${request.originalQuery}"`,
      );
      const rawResponse =
        await this.claudeService.queryWithCustomPrompt(prompt);

      this.logger.log(`Claude raw response: ${rawResponse}`);

      // Parse Claude's response
      const aiResponse = this.parseAIResponse(rawResponse);

      // Validate enhanced query
      const enhancedQuery = aiResponse.enhanced || request.originalQuery;
      const validEnhanced =
        enhancedQuery.length > 2 && !enhancedQuery.includes('{')
          ? enhancedQuery
          : request.originalQuery;

      return {
        original: request.originalQuery,
        enhanced: validEnhanced,
        extractedIntents: aiResponse.intents || [],
        suggestedFilters: aiResponse.filters || {},
        confidence: aiResponse.confidence || 0.7,
      };
    } catch (error) {
      this.logger.error('AI enhancement failed:', error);

      // Fallback to simple enhancement
      return this.enhanceSimpleQuery(request);
    }
  }

  /**
   * Parse AI response from Claude
   */
  private parseAIResponse(response: string): any {
    try {
      this.logger.log(`=== CLAUDE RESPONSE ANALYSIS ===`);
      this.logger.log(`Raw response length: ${response?.length || 0} chars`);
      this.logger.log(`Raw response: "${response}"`);

      // Try to extract JSON from response
      const jsonRegex = /\{[\s\S]*\}/;
      const jsonMatch = jsonRegex.exec(response);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        this.logger.log(`Extracted JSON string: "${jsonStr}"`);
        const parsed = JSON.parse(jsonStr);
        this.logger.log(
          `Successfully parsed JSON: ${JSON.stringify(parsed, null, 2)}`,
        );
        return parsed;
      }

      // Fallback parsing
      this.logger.warn(`❌ NO JSON FOUND in Claude response!`);
      this.logger.warn(`Will use fallback parsing with first line`);
      const fallback = {
        enhanced: response.split('\n')[0] || '',
        intents: [],
        filters: {},
        confidence: 0.6,
      };
      this.logger.log(`Fallback result: ${JSON.stringify(fallback)}`);
      return fallback;
    } catch (error) {
      this.logger.error('❌ FAILED TO PARSE Claude response:', error);
      this.logger.error(`Raw response: "${response}"`);
      // Return safe fallback
      const errorFallback = {
        enhanced: '', // Empty to trigger original query fallback
        intents: [],
        filters: {},
        confidence: 0.5,
      };
      this.logger.log(`Error fallback: ${JSON.stringify(errorFallback)}`);
      return errorFallback;
    }
  }

  /**
   * Check if query is date-related
   */
  private isDateQuery(query: string): boolean {
    const dateKeywords = [
      'today',
      'yesterday',
      'tomorrow',
      'last week',
      'this week',
      'next week',
      'last month',
      'this month',
      'next month',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
      'january',
      'february',
      'march',
      'april',
      'may',
      'june',
      'july',
      'august',
      'september',
      'october',
      'november',
      'december',
    ];

    return dateKeywords.some((keyword) => query.includes(keyword));
  }

  /**
   * Extract date filters from query
   */
  private extractDateFilters(
    query: string,
  ): { from?: string; to?: string } | null {
    const now = new Date();

    if (query.includes('today')) {
      const today = now.toISOString().split('T')[0];
      return { from: today, to: today };
    }

    if (query.includes('yesterday')) {
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];
      return { from: yesterday, to: yesterday };
    }

    if (query.includes('last week')) {
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const weekAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      return {
        from: weekAgo.toISOString().split('T')[0],
        to: lastWeek.toISOString().split('T')[0],
      };
    }

    if (query.includes('this week')) {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      return {
        from: startOfWeek.toISOString().split('T')[0],
        to: now.toISOString().split('T')[0],
      };
    }

    return null;
  }

  /**
   * Detect content type from query
   */
  private detectContentType(query: string): string | null {
    const contentTypeKeywords = {
      voice: ['voice', 'audio', 'recording', 'message', 'spoke', 'said'],
      image: ['image', 'photo', 'picture', 'screenshot', 'pic'],
      email: ['email', 'mail', 'sent', 'inbox'],
      text: ['note', 'text', 'wrote', 'typed'],
    };

    for (const [type, keywords] of Object.entries(contentTypeKeywords)) {
      if (keywords.some((keyword) => query.includes(keyword))) {
        return type;
      }
    }

    return null;
  }

  /**
   * Expand query with synonyms and related terms
   */
  private expandWithSynonyms(query: string): string {
    const synonymMap = new Map([
      // English synonyms
      ['meeting', ['meeting', 'call', 'appointment', 'conference']],
      ['urgent', ['urgent', 'important', 'priority', 'asap']],
      ['work', ['work', 'job', 'office', 'business']],
      ['personal', ['personal', 'private', 'family']],
      ['travel', ['travel', 'trip', 'flight', 'hotel']],
      ['money', ['money', 'payment', 'finance', 'budget', 'cost']],
      ['health', ['health', 'medical', 'doctor', 'appointment']],
      ['bill', ['bill', 'invoice', 'receipt', 'payment', 'charge']],
      [
        'electricity',
        ['electricity', 'electric', 'power', 'energy', 'utility'],
      ],
      ['utility', ['utility', 'bill', 'service', 'electric', 'power']],

      // Portuguese synonyms
      ['conta', ['conta', 'fatura', 'boleto', 'cobrança', 'bill']],
      ['luz', ['luz', 'energia', 'eletricidade', 'electricity', 'power']],
      ['contas', ['contas', 'faturas', 'boletos', 'bills', 'invoices']],
      ['energia', ['energia', 'luz', 'eletricidade', 'electricity', 'power']],
      ['eletricidade', ['eletricidade', 'energia', 'luz', 'electricity']],
      ['fatura', ['fatura', 'conta', 'boleto', 'invoice', 'bill']],
      ['boleto', ['boleto', 'conta', 'fatura', 'cobrança', 'bill']],

      // Spanish synonyms
      ['factura', ['factura', 'recibo', 'cuenta', 'invoice', 'bill']],
      ['electricidad', ['electricidad', 'energía', 'luz', 'electricity']],
      ['recibo', ['recibo', 'factura', 'cuenta', 'receipt', 'bill']],

      // French synonyms
      ['facture', ['facture', 'note', 'compte', 'invoice', 'bill']],
      ['électricité', ['électricité', 'énergie', 'courant', 'electricity']],
    ]);

    let expanded = query;

    for (const [key, synonyms] of synonymMap) {
      if (query.toLowerCase().includes(key)) {
        // Add synonyms to expand search
        const additionalTerms = synonyms.filter(
          (s) => s !== key && !query.toLowerCase().includes(s),
        );
        if (additionalTerms.length > 0) {
          expanded += ' ' + additionalTerms.slice(0, 2).join(' '); // Limit to avoid over-expansion
        }
      }
    }

    return expanded.trim();
  }

  /**
   * Generate search suggestions based on query
   */
  async generateSuggestions(
    partialQuery: string,
    userId: string,
  ): Promise<string[]> {
    if (partialQuery.length < 2) return [];

    const suggestions = [
      // Time-based suggestions
      'today',
      'yesterday',
      'last week',
      'this month',

      // Content type suggestions
      'voice messages',
      'images',
      'emails',
      'notes',

      // Common search patterns
      'meetings',
      'appointments',
      'important',
      'urgent',
      'travel',
      'receipts',
    ];

    return suggestions
      .filter((suggestion) =>
        suggestion.toLowerCase().includes(partialQuery.toLowerCase()),
      )
      .slice(0, 5);
  }

  /**
   * Add basic multilingual synonyms as fallback
   */
  private addBasicMultilingualSynonyms(query: string): string {
    const translations = new Map([
      // Portuguese → English
      [
        'contas de luz',
        'contas de luz conta fatura boleto electricity bill power',
      ],
      ['conta de luz', 'conta de luz fatura boleto electricity bill power'],
      [
        'energia elétrica',
        'energia elétrica eletricidade electricity power energy',
      ],
      [
        'fatura energia',
        'fatura energia conta boleto electricity bill invoice',
      ],

      // Spanish → English
      [
        'factura electricidad',
        'factura electricidad recibo electricity bill power',
      ],
      ['recibo luz', 'recibo luz factura cuenta electricity bill power'],

      // French → English
      [
        'facture électricité',
        'facture électricité note electricity bill power',
      ],

      // English enhancements
      [
        'electricity bill',
        'electricity bill electric power energy utility invoice receipt',
      ],
      ['power bill', 'power bill electricity electric energy utility invoice'],
      ['utility bill', 'utility bill electricity power energy service invoice'],
    ]);

    const lowerQuery = query.toLowerCase().trim();

    // Check for exact matches first
    if (translations.has(lowerQuery)) {
      return translations.get(lowerQuery)!;
    }

    // Check for partial matches
    for (const [key, value] of translations) {
      if (lowerQuery.includes(key) || key.includes(lowerQuery)) {
        return `${query} ${value}`;
      }
    }

    return query; // No enhancement found
  }
}
