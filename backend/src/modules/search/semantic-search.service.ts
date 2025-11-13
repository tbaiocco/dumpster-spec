import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Dump } from '../../entities/dump.entity';
import { VectorService } from './vector.service';

export interface SemanticSearchRequest {
  query: string;
  userId: string;
  limit?: number;
  minSimilarity?: number;
  categoryFilter?: string[];
  dateFilter?: {
    from?: Date;
    to?: Date;
  };
}

export interface SemanticSearchResult {
  dump: Dump;
  similarity: number;
  matchReason: string;
  confidence: number;
}

@Injectable()
export class SemanticSearchService {
  private readonly logger = new Logger(SemanticSearchService.name);

  constructor(
    @InjectRepository(Dump)
    private readonly dumpRepository: Repository<Dump>,
    private readonly dataSource: DataSource,
    private readonly vectorService: VectorService,
  ) {}

  /**
   * Perform semantic search using vector similarity
   */
  async search(request: SemanticSearchRequest): Promise<SemanticSearchResult[]> {
    try {
      this.logger.debug(`Semantic search for: "${request.query}" (user: ${request.userId})`);

      // Get embedding for the search query
      const queryEmbedding = await this.vectorService.generateEmbedding({
        text: request.query,
      });
      
      // Build base query with user filter
      let query = this.dumpRepository
        .createQueryBuilder('dump')
        .leftJoinAndSelect('dump.category', 'category')
        .leftJoinAndSelect('dump.user', 'user')
        .where('dump.user_id = :userId', { userId: request.userId })
        .andWhere('dump.content_vector IS NOT NULL'); // Only search dumps with embeddings

      // Apply category filter
      if (request.categoryFilter && request.categoryFilter.length > 0) {
        query = query.andWhere('category.name IN (:...categories)', { 
          categories: request.categoryFilter 
        });
      }

      // Apply date filter
      if (request.dateFilter?.from) {
        query = query.andWhere('dump.created_at >= :fromDate', { 
          fromDate: request.dateFilter.from 
        });
      }
      if (request.dateFilter?.to) {
        query = query.andWhere('dump.created_at <= :toDate', { 
          toDate: request.dateFilter.to 
        });
      }

      const dumps = await query.getMany();

      if (dumps.length === 0) {
        this.logger.debug('No dumps with embeddings found for user');
        return [];
      }

      // Calculate similarities for all dumps
      const results: SemanticSearchResult[] = [];
      const minSimilarity = request.minSimilarity || 0.3;

      for (const dump of dumps) {
        try {
          const similarity = this.vectorService.calculateCosineSimilarity(
            queryEmbedding.embedding,
            dump.content_vector,
          );

          if (similarity >= minSimilarity) {
            results.push({
              dump,
              similarity,
              matchReason: this.generateMatchReason(dump, request.query, similarity),
              confidence: this.calculateConfidence(similarity, dump),
            });
          }
        } catch (error) {
          this.logger.warn(`Failed to calculate similarity for dump ${dump.id}:`, error);
          continue;
        }
      }

      // Sort by similarity (descending)
      results.sort((a, b) => b.similarity - a.similarity);

      // Limit results
      const limitedResults = results.slice(0, request.limit || 20);

      this.logger.debug(`Semantic search completed: ${limitedResults.length} results`);
      return limitedResults;

    } catch (error) {
      this.logger.error('Semantic search failed:', error);
      throw new Error(`Semantic search failed: ${error.message}`);
    }
  }

  /**
   * Perform semantic search with advanced filtering and boosting
   */
  async advancedSemanticSearch(request: SemanticSearchRequest & {
    boostRecent?: boolean;
    boostHighUrgency?: boolean;
    diversifyResults?: boolean;
  }): Promise<SemanticSearchResult[]> {
    const baseResults = await this.search(request);

    if (baseResults.length === 0) {
      return baseResults;
    }

    let processedResults = [...baseResults];

    // Apply recency boost
    if (request.boostRecent) {
      processedResults = this.applyRecencyBoost(processedResults);
    }

    // Apply urgency boost
    if (request.boostHighUrgency) {
      processedResults = this.applyUrgencyBoost(processedResults);
    }

    // Diversify results to avoid too many similar dumps
    if (request.diversifyResults) {
      processedResults = await this.diversifyResults(processedResults);
    }

    // Re-sort after applying boosts
    processedResults.sort((a, b) => b.similarity - a.similarity);

    return processedResults;
  }

  /**
   * Find similar dumps to a given dump
   */
  async findSimilarDumps(
    dumpId: string, 
    userId: string, 
    limit: number = 5
  ): Promise<SemanticSearchResult[]> {
    try {
      // Get the source dump
      const sourceDump = await this.dumpRepository.findOne({
        where: { id: dumpId, user_id: userId },
      });

      if (!sourceDump?.content_vector) {
        throw new Error('Source dump not found or has no content vector');
      }

      // Use the dump's content as search query
      const searchContent = sourceDump.ai_summary || sourceDump.raw_content || '';
      
      const results = await this.search({
        query: searchContent,
        userId,
        limit: limit + 1, // +1 because we'll filter out the source dump
      });

      // Filter out the source dump itself
      return results.filter(result => result.dump.id !== dumpId);

    } catch (error) {
      this.logger.error('Find similar dumps failed:', error);
      throw new Error(`Find similar dumps failed: ${error.message}`);
    }
  }

  /**
   * Generate explanation for why this dump matched
   */
  private generateMatchReason(dump: Dump, query: string, similarity: number): string {
    const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);
    const content = (dump.ai_summary || dump.raw_content || '').toLowerCase();
    
    const matchedTerms = queryTerms.filter(term => content.includes(term));
    
    if (matchedTerms.length > 0) {
      return `Contains terms: ${matchedTerms.slice(0, 3).join(', ')}`;
    }
    
    if (similarity > 0.8) {
      return 'Highly similar semantic content';
    } else if (similarity > 0.6) {
      return 'Similar conceptual meaning';
    } else {
      return 'Related content themes';
    }
  }

  /**
   * Calculate confidence score based on similarity and other factors
   */
  private calculateConfidence(similarity: number, dump: Dump): number {
    let confidence = similarity;

    // Boost confidence for dumps with AI summaries (better content understanding)
    if (dump.ai_summary && dump.ai_summary.length > 50) {
      confidence = Math.min(1, confidence + 0.1);
    }

    // Boost confidence for recent dumps (more likely to be relevant)
    const daysSinceCreation = (Date.now() - new Date(dump.created_at).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCreation <= 7) {
      confidence = Math.min(1, confidence + 0.05);
    }

    return confidence;
  }

  /**
   * Apply recency boost to search results
   */
  private applyRecencyBoost(results: SemanticSearchResult[]): SemanticSearchResult[] {
    const now = Date.now();
    
    return results.map(result => {
      const daysSinceCreation = (now - new Date(result.dump.created_at).getTime()) / (1000 * 60 * 60 * 24);
      let boost = 0;
      
      if (daysSinceCreation <= 1) {
        boost = 0.2; // 24 hours
      } else if (daysSinceCreation <= 7) {
        boost = 0.1; // 1 week
      } else if (daysSinceCreation <= 30) {
        boost = 0.05; // 1 month
      }
      
      return {
        ...result,
        similarity: Math.min(1, result.similarity + boost),
      };
    });
  }

  /**
   * Apply urgency boost to search results
   */
  private applyUrgencyBoost(results: SemanticSearchResult[]): SemanticSearchResult[] {
    return results.map(result => {
      let boost = 0;
      
      if (result.dump.urgency_level >= 4) {
        boost = 0.15; // High urgency
      } else if (result.dump.urgency_level >= 3) {
        boost = 0.1; // Medium urgency  
      }
      
      return {
        ...result,
        similarity: Math.min(1, result.similarity + boost),
      };
    });
  }

  /**
   * Diversify results to avoid clustering of very similar content
   */
  private async diversifyResults(results: SemanticSearchResult[]): Promise<SemanticSearchResult[]> {
    if (results.length <= 3) {
      return results; // Not enough results to diversify
    }

    const diversified: SemanticSearchResult[] = [];
    const remaining = [...results];
    
    // Always include the best match
    diversified.push(remaining.shift()!);
    
    for (const candidate of remaining) {
      let shouldInclude = true;
      
      // Check similarity with already included results
      for (const included of diversified) {
        try {
          const similarity = this.vectorService.calculateCosineSimilarity(
            candidate.dump.content_vector,
            included.dump.content_vector,
          );
          
          // If too similar to an already included result, skip it
          if (similarity > 0.9) {
            shouldInclude = false;
            break;
          }
        } catch (error) {
          this.logger.warn(`Failed to calculate similarity for diversification: ${error.message}`);
          // If similarity calculation fails, include anyway to avoid breaking the process
          continue;
        }
      }
      
      if (shouldInclude) {
        diversified.push(candidate);
      }
      
      // Limit diversified results
      if (diversified.length >= Math.min(results.length, 10)) {
        break;
      }
    }
    
    return diversified;
  }

  /**
   * Get semantic search statistics
   */
  async getSearchStats(userId: string): Promise<{
    totalIndexedDumps: number;
    avgSimilarityThreshold: number;
    topCategories: string[];
  }> {
    try {
      const stats = await this.dumpRepository
        .createQueryBuilder('dump')
        .leftJoin('dump.category', 'category')
        .select([
          'COUNT(*) as total',
          'COUNT(CASE WHEN dump.embedding IS NOT NULL THEN 1 END) as indexed',
          'category.name as categoryName',
        ])
        .where('dump.user_id = :userId', { userId })
        .groupBy('category.name')
        .getRawMany();

      const totalIndexed = stats.reduce((sum, stat) => sum + Number.parseInt(stat.indexed, 10), 0);
      const sortedStats = stats.toSorted((a, b) => Number.parseInt(b.indexed, 10) - Number.parseInt(a.indexed, 10));
      const topCategories = sortedStats
        .slice(0, 5)
        .map(stat => stat.categoryName)
        .filter(Boolean);

      return {
        totalIndexedDumps: totalIndexed,
        avgSimilarityThreshold: 0.3, // Default threshold
        topCategories,
      };
    } catch (error) {
      this.logger.error('Failed to get search stats:', error);
      return {
        totalIndexedDumps: 0,
        avgSimilarityThreshold: 0.3,
        topCategories: [],
      };
    }
  }
}