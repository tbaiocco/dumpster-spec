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
  async enhanceQuery(request: QueryEnhancementRequest): Promise<QueryEnhancementResponse> {
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
    // Simple queries are short, single concepts
    const words = query.trim().split(/\s+/);
    return words.length <= 3 && !this.hasComplexPatterns(query);
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

    return complexPatterns.some(pattern => pattern.test(query));
  }

  /**
   * Enhance simple queries without AI
   */
  private enhanceSimpleQuery(request: QueryEnhancementRequest): QueryEnhancementResponse {
    const query = request.originalQuery.toLowerCase().trim();
    
    // Basic query expansion
    let enhanced = query;
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

    // Category hints from context
    if (request.context?.recentCategories) {
      const matchedCategory = request.context.recentCategories.find(cat =>
        query.includes(cat.toLowerCase())
      );
      if (matchedCategory) {
        suggestedFilters.categories = [matchedCategory];
        extractedIntents.push('category_filter');
      }
    }

    return {
      original: request.originalQuery,
      enhanced,
      extractedIntents,
      suggestedFilters,
      confidence: 0.8,
    };
  }

  /**
   * Enhance query using Claude AI for complex understanding
   */
  private async enhanceWithAI(request: QueryEnhancementRequest): Promise<QueryEnhancementResponse> {
    const contextInfo = request.context ? `
User Context:
- Recent categories: ${request.context.recentCategories?.join(', ') || 'none'}
- Recent dump count: ${request.context.recentDumpCount || 0}
- Timezone: ${request.context.userTimezone || 'UTC'}
` : '';

    const prompt = `You are helping to enhance a search query for a personal life inbox system where users store various content (text, voice messages, images, emails).

Original Query: "${request.originalQuery}"
${contextInfo}

Please analyze this query and provide:
1. Enhanced query with expanded terms and synonyms
2. User intent (what are they looking for?)
3. Suggested filters based on the query

Respond in JSON format:
{
  "enhanced": "improved search terms with synonyms and context",
  "intents": ["primary_intent", "secondary_intent"],
  "filters": {
    "contentTypes": ["text", "voice", "image", "email"],
    "dateRange": {"from": "YYYY-MM-DD", "to": "YYYY-MM-DD"},
    "categories": ["category_name"]
  },
  "confidence": 0.95
}

Focus on understanding temporal references (today, yesterday, last week, etc.), content types mentioned, and the user's likely intent.`;

    try {
      const response = await this.claudeService.analyzeContent({
        content: prompt,
        contentType: 'text',
        context: {
          source: 'telegram', // Using telegram as fallback for search enhancement
          userId: request.userId,
          timestamp: new Date(),
        },
      });

      // Parse Claude's response
      const aiResponse = this.parseAIResponse(response.summary);
      
      return {
        original: request.originalQuery,
        enhanced: aiResponse.enhanced || request.originalQuery,
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
      // Try to extract JSON from response
      const jsonRegex = /\{[\s\S]*\}/;
      const jsonMatch = jsonRegex.exec(response);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback parsing
      return {
        enhanced: response.split('\n')[0] || '',
        intents: [],
        filters: {},
        confidence: 0.6,
      };
    } catch (error) {
      this.logger.error('Failed to parse AI response:', error);
      return {};
    }
  }

  /**
   * Check if query is date-related
   */
  private isDateQuery(query: string): boolean {
    const dateKeywords = [
      'today', 'yesterday', 'tomorrow',
      'last week', 'this week', 'next week',
      'last month', 'this month', 'next month',
      'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december',
    ];

    return dateKeywords.some(keyword => query.includes(keyword));
  }

  /**
   * Extract date filters from query
   */
  private extractDateFilters(query: string): { from?: string; to?: string } | null {
    const now = new Date();
    
    if (query.includes('today')) {
      const today = now.toISOString().split('T')[0];
      return { from: today, to: today };
    }
    
    if (query.includes('yesterday')) {
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
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
      if (keywords.some(keyword => query.includes(keyword))) {
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
      ['meeting', ['meeting', 'call', 'appointment', 'conference']],
      ['urgent', ['urgent', 'important', 'priority', 'asap']],
      ['work', ['work', 'job', 'office', 'business']],
      ['personal', ['personal', 'private', 'family']],
      ['travel', ['travel', 'trip', 'flight', 'hotel']],
      ['money', ['money', 'payment', 'finance', 'budget', 'cost']],
      ['health', ['health', 'medical', 'doctor', 'appointment']],
    ]);

    let expanded = query;
    
    for (const [key, synonyms] of synonymMap) {
      if (query.toLowerCase().includes(key)) {
        // Add synonyms to expand search
        const additionalTerms = synonyms.filter(s => s !== key && !query.toLowerCase().includes(s));
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
  async generateSuggestions(partialQuery: string, userId: string): Promise<string[]> {
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
      .filter(suggestion => suggestion.toLowerCase().includes(partialQuery.toLowerCase()))
      .slice(0, 5);
  }
}