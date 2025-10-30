import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Dump } from '../../entities/dump.entity';
import { VectorService } from './vector.service';
import { QueryEnhancementService } from './query-enhancement.service';
import { SemanticSearchService } from './semantic-search.service';
import { RankingService } from './ranking.service';
import { FuzzyMatchService } from './fuzzy-match.service';
import { FiltersService } from './filters.service';

export interface SearchRequest {
  query: string;
  userId: string;
  filters?: SearchFilters;
  limit?: number;
  offset?: number;
}

export interface SearchFilters {
  contentTypes?: ('text' | 'voice' | 'image' | 'email')[];
  categories?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  minConfidence?: number;
  urgencyLevels?: number[];
  includeProcessing?: boolean;
}

export interface SearchResult {
  dump: Dump;
  relevanceScore: number;
  matchType: 'semantic' | 'fuzzy' | 'exact' | 'hybrid';
  matchedFields: string[];
  highlightedContent?: string;
  explanation?: string;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: {
    original: string;
    enhanced: string;
    processingTime: number;
  };
  metadata: {
    semanticResults: number;
    fuzzyResults: number;
    exactResults: number;
    filters: SearchFilters;
  };
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    @InjectRepository(Dump)
    private readonly dumpRepository: Repository<Dump>,
    private readonly dataSource: DataSource,
    private readonly vectorService: VectorService,
    private readonly queryEnhancementService: QueryEnhancementService,
    private readonly semanticSearchService: SemanticSearchService,
    private readonly rankingService: RankingService,
    private readonly fuzzyMatchService: FuzzyMatchService,
    private readonly filtersService: FiltersService,
  ) {}

  /**
   * Main search entry point with natural language processing
   */
  async search(request: SearchRequest): Promise<SearchResponse> {
    const startTime = Date.now();
    
    this.logger.log(`Search request: "${request.query}" for user ${request.userId}`);

    try {
      // Step 1: Enhance query using AI
      const enhancedQuery = await this.queryEnhancementService.enhanceQuery({
        originalQuery: request.query,
        userId: request.userId,
        context: await this.getUserSearchContext(request.userId),
      });

      this.logger.debug(`Query enhanced: "${request.query}" → "${enhancedQuery.enhanced}"`);

      // Step 2: Apply base filters
      const baseQuery = this.dumpRepository
        .createQueryBuilder('dump')
        .leftJoinAndSelect('dump.category', 'category')
        .leftJoinAndSelect('dump.user', 'user')
        .where('dump.user_id = :userId', { userId: request.userId });

      const filteredQuery = this.filtersService.applyFilters(baseQuery, request.filters || {});

      // Step 3: Perform different types of search in parallel
      const [semanticResults, fuzzyResults, exactResults] = await Promise.all([
        this.performSemanticSearch(enhancedQuery.enhanced, filteredQuery, request.limit),
        this.performFuzzySearch(enhancedQuery.enhanced, filteredQuery, request.limit),
        this.performExactSearch(enhancedQuery.enhanced, filteredQuery, request.limit),
      ]);

      // Step 4: Combine and rank results
      const combinedResults = this.combineResults(semanticResults, fuzzyResults, exactResults);
      const rankedResults = await this.rankingService.rankResults(
        combinedResults,
        enhancedQuery,
        request.userId,
      );

      // Step 5: Apply pagination
      const paginatedResults = this.applyPagination(rankedResults, request.offset || 0, request.limit || 20);

      const processingTime = Date.now() - startTime;

      const response: SearchResponse = {
        results: paginatedResults,
        total: rankedResults.length,
        query: {
          original: request.query,
          enhanced: enhancedQuery.enhanced,
          processingTime,
        },
        metadata: {
          semanticResults: semanticResults.length,
          fuzzyResults: fuzzyResults.length,
          exactResults: exactResults.length,
          filters: request.filters || {},
        },
      };

      this.logger.log(`Search completed: ${response.total} results in ${processingTime}ms`);
      return response;

    } catch (error) {
      this.logger.error('Search failed:', error);
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  /**
   * Perform semantic search using vector similarity
   */
  private async performSemanticSearch(
    query: string,
    baseQuery: any,
    limit?: number,
  ): Promise<SearchResult[]> {
    try {
      const semanticResults = await this.semanticSearchService.searchBySimilarity({
        query,
        baseQuery,
        limit: limit || 50,
        minSimilarity: 0.7, // Configurable threshold
      });

      return semanticResults.map(result => ({
        dump: result.dump,
        relevanceScore: result.similarity,
        matchType: 'semantic' as const,
        matchedFields: ['content_vector'],
        explanation: `Semantic similarity: ${(result.similarity * 100).toFixed(1)}%`,
      }));
    } catch (error) {
      this.logger.error('Semantic search failed:', error);
      return [];
    }
  }

  /**
   * Perform fuzzy text search for partial matches
   */
  private async performFuzzySearch(
    query: string,
    baseQuery: any,
    limit?: number,
  ): Promise<SearchResult[]> {
    try {
      const fuzzyResults = await this.fuzzyMatchService.search({
        query,
        baseQuery,
        fields: ['raw_content', 'ai_summary', 'extracted_entities'],
        minScore: 0.6,
        limit: limit || 30,
      });

      return fuzzyResults.map(result => ({
        dump: result.dump,
        relevanceScore: result.score,
        matchType: 'fuzzy' as const,
        matchedFields: result.matchedFields,
        highlightedContent: result.highlightedContent,
        explanation: `Fuzzy match score: ${(result.score * 100).toFixed(1)}%`,
      }));
    } catch (error) {
      this.logger.error('Fuzzy search failed:', error);
      return [];
    }
  }

  /**
   * Perform exact text search for precise matches
   */
  private async performExactSearch(
    query: string,
    baseQuery: any,
    limit?: number,
  ): Promise<SearchResult[]> {
    try {
      const exactQuery = baseQuery.clone();
      const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);
      
      if (queryTerms.length === 0) return [];

      // Build exact match conditions
      for (let index = 0; index < queryTerms.length; index++) {
        const term = queryTerms[index];
        exactQuery.orWhere(`LOWER(dump.raw_content) LIKE :term${index}`, { [`term${index}`]: `%${term}%` });
        exactQuery.orWhere(`LOWER(dump.ai_summary) LIKE :termSummary${index}`, { [`termSummary${index}`]: `%${term}%` });
      }

      const results = await exactQuery
        .take(limit || 20)
        .getMany();

      return results.map(dump => {
        const matchedFields = this.findMatchedFields(dump, queryTerms);
        return {
          dump,
          relevanceScore: this.calculateExactMatchScore(dump, queryTerms),
          matchType: 'exact' as const,
          matchedFields,
          highlightedContent: this.highlightMatches(dump.raw_content || dump.ai_summary, queryTerms),
          explanation: `Exact matches in: ${matchedFields.join(', ')}`,
        };
      });
    } catch (error) {
      this.logger.error('Exact search failed:', error);
      return [];
    }
  }

  /**
   * Combine results from different search methods
   */
  private combineResults(
    semanticResults: SearchResult[],
    fuzzyResults: SearchResult[],
    exactResults: SearchResult[],
  ): SearchResult[] {
    const combined = new Map<string, SearchResult>();

    // Add semantic results (highest priority for relevance)
    for (const result of semanticResults) {
      combined.set(result.dump.id, result);
    }

    // Add fuzzy results, merge if already exists
    for (const result of fuzzyResults) {
      const existing = combined.get(result.dump.id);
      if (existing) {
        // Combine scores and match types
        existing.relevanceScore = Math.max(existing.relevanceScore, result.relevanceScore);
        existing.matchType = 'hybrid';
        existing.matchedFields = [...new Set([...existing.matchedFields, ...result.matchedFields])];
        existing.highlightedContent = result.highlightedContent || existing.highlightedContent;
      } else {
        combined.set(result.dump.id, result);
      }
    }

    // Add exact results, merge if already exists
    for (const result of exactResults) {
      const existing = combined.get(result.dump.id);
      if (existing) {
        // Boost score for exact matches
        existing.relevanceScore = Math.min(1, existing.relevanceScore + 0.2);
        existing.matchType = 'hybrid';
        existing.matchedFields = [...new Set([...existing.matchedFields, ...result.matchedFields])];
        existing.highlightedContent = result.highlightedContent || existing.highlightedContent;
      } else {
        combined.set(result.dump.id, result);
      }
    }

    return Array.from(combined.values());
  }

  /**
   * Apply pagination to results
   */
  private applyPagination(results: SearchResult[], offset: number, limit: number): SearchResult[] {
    return results.slice(offset, offset + limit);
  }

  /**
   * Get user search context for query enhancement
   */
  private async getUserSearchContext(userId: string): Promise<any> {
    try {
      // Get recent categories and frequently used terms
      const recentDumps = await this.dumpRepository
        .createQueryBuilder('dump')
        .leftJoinAndSelect('dump.category', 'category')
        .where('dump.user_id = :userId', { userId })
        .orderBy('dump.created_at', 'DESC')
        .take(10)
        .getMany();

      const categories = [...new Set(recentDumps.map(d => d.category?.name).filter(Boolean))];
      
      return {
        recentCategories: categories,
        recentDumpCount: recentDumps.length,
        userTimezone: await this.getUserTimezone(userId)
      };
    } catch (error) {
      this.logger.error('Failed to get user search context:', error);
      return {};
    }
  }

  /**
   * Find which fields matched the search terms
   */
  private findMatchedFields(dump: Dump, queryTerms: string[]): string[] {
    const matched: string[] = [];
    const content = (dump.raw_content || '').toLowerCase();
    const summary = (dump.ai_summary || '').toLowerCase();
    
    const hasContentMatch = queryTerms.some(term => content.includes(term.toLowerCase()));
    const hasSummaryMatch = queryTerms.some(term => summary.includes(term.toLowerCase()));
    
    if (hasContentMatch) matched.push('raw_content');
    if (hasSummaryMatch) matched.push('ai_summary');
    
    return matched;
  }

  /**
   * Calculate exact match relevance score
   */
  private calculateExactMatchScore(dump: Dump, queryTerms: string[]): number {
    const content = (dump.raw_content || '').toLowerCase();
    const summary = (dump.ai_summary || '').toLowerCase();
    
    let matches = 0;
    for (const term of queryTerms) {
      const termLower = term.toLowerCase();
      if (content.includes(termLower)) matches += 1;
      if (summary.includes(termLower)) matches += 0.8; // Summary matches slightly less weight
    }
    
    return Math.min(1, matches / queryTerms.length);
  }

  /**
   * Highlight search terms in content
   */
  private highlightMatches(content: string, queryTerms: string[]): string {
    if (!content) return '';
    
    let highlighted = content;
    for (const term of queryTerms) {
      const escapedTerm = term.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
      const regex = new RegExp(`(${escapedTerm})`, 'gi');
      highlighted = highlighted.replace(regex, '**$1**'); // Markdown bold for highlighting
    }
    
    // Truncate to reasonable length
    if (highlighted.length > 300) {
      highlighted = highlighted.substring(0, 300) + '...';
    }
    
    return highlighted;
  }

  /**
   * Quick search for auto-complete and suggestions
   */
  async quickSearch(query: string, userId: string, limit: number = 5): Promise<SearchResult[]> {
    if (query.length < 2) return [];

    try {
      const results = await this.dumpRepository
        .createQueryBuilder('dump')
        .leftJoinAndSelect('dump.category', 'category')
        .where('dump.user_id = :userId', { userId })
        .andWhere(
          '(LOWER(dump.raw_content) LIKE :query OR LOWER(dump.ai_summary) LIKE :query)',
          { query: `%${query.toLowerCase()}%` }
        )
        .orderBy('dump.created_at', 'DESC')
        .take(limit)
        .getMany();

      return results.map(dump => ({
        dump,
        relevanceScore: 0.8,
        matchType: 'exact' as const,
        matchedFields: ['raw_content'],
        highlightedContent: this.highlightMatches(dump.ai_summary || dump.raw_content, [query]),
      }));
    } catch (error) {
      this.logger.error('Quick search failed:', error);
      return [];
    }
  }

  /**
   * Get search suggestions based on user history
   */
  async getSearchSuggestions(userId: string, limit: number = 10): Promise<string[]> {
    try {
      // Get common terms from user's dumps
      const results = await this.dataSource.query(`
        SELECT 
          UNNEST(string_to_array(LOWER(REGEXP_REPLACE(raw_content, '[^a-zA-Z0-9\\s]', ' ', 'g')), ' ')) as word,
          COUNT(*) as frequency
        FROM dumps 
        WHERE user_id = $1 
        AND processing_status = 'completed'
        AND LENGTH(TRIM(raw_content)) > 0
        GROUP BY word
        HAVING LENGTH(TRIM(word)) > 3 AND COUNT(*) > 1
        ORDER BY frequency DESC, word
        LIMIT $2
      `, [userId, limit]);

      return results.map(r => r.word).filter(word => 
        // Filter out common words
        !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'man', 'end', 'few', 'got', 'let', 'put', 'say', 'she', 'too', 'use'].includes(word)
      );
    } catch (error) {
      this.logger.error('Failed to get search suggestions:', error);
      return [];
    }
  }

  /**
   * Get search analytics for user
   */
  async getSearchAnalytics(userId: string): Promise<{
    totalSearches: number;
    avgResultsPerSearch: number;
    topSearchTerms: Array<{ term: string; count: number }>;
    searchSuccessRate: number;
  }> {
    // This would typically come from a search_logs table
    // For now, return mock data structure
    return {
      totalSearches: 0,
      avgResultsPerSearch: 0,
      topSearchTerms: [],
      searchSuccessRate: 0,
    };
  }

  /**
   * Get user timezone preference
   */
  private async getUserTimezone(userId: string): Promise<string> {
    try {
      // This would typically come from user preferences
      // For MVP, default to UTC
      const user = await this.dataSource
        .getRepository('User')
        .findOne({ 
          where: { id: userId },
          select: ['timezone'] 
        });
      
      return user?.timezone || 'UTC';
    } catch (error) {
      this.logger.warn(`Failed to get timezone for user ${userId}:`, error);
      return 'UTC';
    }
  }
}