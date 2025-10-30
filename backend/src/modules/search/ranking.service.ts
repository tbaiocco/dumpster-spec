import { Injectable, Logger } from '@nestjs/common';
import { SearchResult } from './search.service';

export interface EnhancedQuery {
  original: string;
  enhanced: string;
  intent: string;
  entities: {
    dates: string[];
    people: string[];
    locations: string[];
    categories: string[];
    urgency: string;
  };
  complexity: 'simple' | 'moderate' | 'complex';
}

export interface RankingContext {
  userId: string;
  searchHistory?: string[];
  userPreferences?: {
    preferRecent?: boolean;
    preferHighUrgency?: boolean;
    categoryWeights?: Record<string, number>;
  };
}

@Injectable()
export class RankingService {
  private readonly logger = new Logger(RankingService.name);

  /**
   * Rank search results using multiple signals
   */
  async rankResults(
    results: SearchResult[],
    query: EnhancedQuery,
    userId: string,
    context?: RankingContext,
  ): Promise<SearchResult[]> {
    if (results.length === 0) {
      return results;
    }

    try {
      this.logger.debug(`Ranking ${results.length} results for user ${userId}`);

      // Apply various ranking signals
      const rankedResults = results.map(result => ({
        ...result,
        finalScore: this.calculateFinalScore(result, query, context),
      }));

      // Sort by final score (descending)
      rankedResults.sort((a, b) => b.finalScore - a.finalScore);

      this.logger.debug(`Ranking completed, top score: ${rankedResults[0]?.finalScore}`);
      
      return rankedResults.map(({ finalScore, ...result }) => ({
        ...result,
        relevanceScore: finalScore, // Update the relevance score with our final ranking
      }));

    } catch (error) {
      this.logger.error('Ranking failed, returning original order:', error);
      return results;
    }
  }

  /**
   * Calculate final ranking score using multiple signals
   */
  private calculateFinalScore(
    result: SearchResult,
    query: EnhancedQuery,
    context?: RankingContext,
  ): number {
    let score = result.relevanceScore; // Start with base relevance

    // 1. Recency boost
    score += this.calculateRecencyScore(result);

    // 2. Urgency boost
    score += this.calculateUrgencyScore(result, query);

    // 3. Match type quality boost
    score += this.calculateMatchTypeScore(result);

    // 4. Content quality boost
    score += this.calculateContentQualityScore(result);

    // 5. User preference alignment
    if (context?.userPreferences) {
      score += this.calculatePreferenceScore(result, context.userPreferences);
    }

    // 6. Query complexity alignment
    score += this.calculateComplexityScore(result, query);

    // 7. Category relevance boost
    score += this.calculateCategoryScore(result, query);

    // Ensure score stays within bounds
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Calculate recency-based score boost
   */
  private calculateRecencyScore(result: SearchResult): number {
    const now = Date.now();
    const createdAt = new Date(result.dump.created_at).getTime();
    const daysSinceCreation = (now - createdAt) / (1000 * 60 * 60 * 24);

    if (daysSinceCreation <= 1) {
      return 0.15; // Very recent (24 hours)
    } else if (daysSinceCreation <= 7) {
      return 0.1; // Recent (1 week)
    } else if (daysSinceCreation <= 30) {
      return 0.05; // Somewhat recent (1 month)
    } else {
      return 0; // Older content
    }
  }

  /**
   * Calculate urgency-based score boost
   */
  private calculateUrgencyScore(result: SearchResult, query: EnhancedQuery): number {
    const urgencyLevel = result.dump.urgency_level || 1;
    
    // Base urgency boost
    let boost = (urgencyLevel - 1) * 0.05; // 0 to 0.2 boost

    // Extra boost if query indicates urgency
    const urgentKeywords = ['urgent', 'asap', 'immediately', 'deadline', 'due', 'expires'];
    const hasUrgentQuery = urgentKeywords.some(keyword => 
      query.original.toLowerCase().includes(keyword) || 
      query.enhanced.toLowerCase().includes(keyword)
    );

    if (hasUrgentQuery && urgencyLevel >= 3) {
      boost += 0.1; // Extra boost for urgent queries matching high-urgency content
    }

    return boost;
  }

  /**
   * Calculate match type quality score
   */
  private calculateMatchTypeScore(result: SearchResult): number {
    switch (result.matchType) {
      case 'exact':
        return 0.2; // Highest boost for exact matches
      case 'hybrid':
        return 0.15; // High boost for hybrid matches
      case 'semantic':
        return 0.1; // Good boost for semantic matches
      case 'fuzzy':
        return 0.05; // Small boost for fuzzy matches
      default:
        return 0;
    }
  }

  /**
   * Calculate content quality score based on AI processing
   */
  private calculateContentQualityScore(result: SearchResult): number {
    let score = 0;

    // Boost for high AI confidence
    const confidence = result.dump.ai_confidence || 1;
    if (confidence >= 4) {
      score += 0.1; // High confidence
    } else if (confidence >= 3) {
      score += 0.05; // Medium confidence
    }

    // Boost for having AI summary (indicates successful processing)
    if (result.dump.ai_summary && result.dump.ai_summary.length > 50) {
      score += 0.05;
    }

    // Boost for having extracted entities (indicates rich content)
    const entities = result.dump.extracted_entities || {};
    const entityCount = Object.keys(entities).length;
    if (entityCount > 3) {
      score += 0.05; // Rich entity content
    }

    return score;
  }

  /**
   * Calculate user preference alignment score
   */
  private calculatePreferenceScore(
    result: SearchResult,
    preferences: RankingContext['userPreferences'],
  ): number {
    let score = 0;

    if (!preferences) {
      return score;
    }

    // Category preference boost
    if (preferences.categoryWeights && result.dump.category?.name) {
      const categoryWeight = preferences.categoryWeights[result.dump.category.name] || 1;
      score += (categoryWeight - 1) * 0.1; // Boost/penalty based on preference
    }

    // Recent preference boost
    if (preferences.preferRecent) {
      const daysSinceCreation = (Date.now() - new Date(result.dump.created_at).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreation <= 7) {
        score += 0.08;
      }
    }

    // Urgency preference boost
    if (preferences.preferHighUrgency && (result.dump.urgency_level || 1) >= 3) {
      score += 0.08;
    }

    return score;
  }

  /**
   * Calculate query complexity alignment score
   */
  private calculateComplexityScore(result: SearchResult, query: EnhancedQuery): number {
    const entities = result.dump.extracted_entities || {};
    const entityCount = Object.keys(entities).length;

    switch (query.complexity) {
      case 'simple':
        // Simple queries prefer straightforward content
        return entityCount <= 2 ? 0.05 : -0.02;
      
      case 'moderate':
        // Moderate queries prefer moderately rich content
        return entityCount >= 2 && entityCount <= 5 ? 0.05 : 0;
      
      case 'complex':
        // Complex queries prefer rich, detailed content
        return entityCount >= 3 ? 0.08 : -0.02;
      
      default:
        return 0;
    }
  }

  /**
   * Calculate category relevance score
   */
  private calculateCategoryScore(result: SearchResult, query: EnhancedQuery): number {
    if (!result.dump.category?.name) {
      return 0;
    }

    const categoryName = result.dump.category.name.toLowerCase();
    let score = 0;

    // Check if category matches query entities
    for (const queryCategory of query.entities.categories) {
      if (categoryName.includes(queryCategory.toLowerCase()) || 
          queryCategory.toLowerCase().includes(categoryName)) {
        score += 0.15; // Strong category relevance
        break;
      }
    }

    // Check for category-related keywords in query
    const categoryKeywords = this.getCategoryKeywords(categoryName);
    const queryText = `${query.original} ${query.enhanced}`.toLowerCase();
    
    for (const keyword of categoryKeywords) {
      if (queryText.includes(keyword)) {
        score += 0.05;
      }
    }

    return Math.min(score, 0.2); // Cap the category boost
  }

  /**
   * Get keywords associated with a category
   */
  private getCategoryKeywords(categoryName: string): string[] {
    const keywordMap: Record<string, string[]> = {
      'bills': ['bill', 'payment', 'due', 'invoice', 'electricity', 'water', 'gas', 'rent'],
      'reminders': ['reminder', 'remember', 'todo', 'task', 'appointment', 'meeting'],
      'health': ['doctor', 'medication', 'prescription', 'appointment', 'medical', 'health'],
      'work': ['work', 'job', 'office', 'meeting', 'project', 'deadline', 'colleague'],
      'personal': ['personal', 'family', 'friend', 'birthday', 'anniversary', 'vacation'],
      'finance': ['money', 'bank', 'investment', 'saving', 'budget', 'expense', 'income'],
      'shopping': ['buy', 'purchase', 'shopping', 'store', 'amazon', 'order', 'delivery'],
      'travel': ['travel', 'flight', 'hotel', 'vacation', 'trip', 'booking', 'passport'],
    };

    // Find matching category or return generic keywords
    for (const [category, keywords] of Object.entries(keywordMap)) {
      if (categoryName.includes(category) || category.includes(categoryName)) {
        return keywords;
      }
    }

    return [];
  }

  /**
   * Apply diversity to prevent too many similar results at the top
   */
  async applyDiversityRanking(
    results: SearchResult[],
    diversityThreshold: number = 0.85,
  ): Promise<SearchResult[]> {
    if (results.length <= 3) {
      return results; // Not enough results for diversity
    }

    const diversified: SearchResult[] = [];
    const remaining = [...results];

    // Always include the best result
    diversified.push(remaining.shift()!);

    for (const candidate of remaining) {
      let shouldInclude = true;

      // Check diversity with already included results
      for (const included of diversified) {
        const similarity = this.calculateContentSimilarity(candidate, included);
        
        if (similarity > diversityThreshold) {
          shouldInclude = false;
          break;
        }
      }

      if (shouldInclude) {
        diversified.push(candidate);
      }

      // Stop if we have enough diverse results
      if (diversified.length >= Math.min(results.length, 15)) {
        break;
      }
    }

    // Fill remaining slots with best remaining results
    const remainingSlots = Math.min(results.length, 20) - diversified.length;
    if (remainingSlots > 0) {
      const remainingResults = remaining.slice(0, remainingSlots);
      diversified.push(...remainingResults);
    }

    return diversified;
  }

  /**
   * Calculate content similarity between two results for diversity
   */
  private calculateContentSimilarity(result1: SearchResult, result2: SearchResult): number {
    const content1 = (result1.dump.ai_summary || result1.dump.raw_content || '').toLowerCase();
    const content2 = (result2.dump.ai_summary || result2.dump.raw_content || '').toLowerCase();

    // Simple word overlap calculation
    const words1 = new Set(content1.split(/\s+/).filter(w => w.length > 3));
    const words2 = new Set(content2.split(/\s+/).filter(w => w.length > 3));

    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Get ranking explanation for debugging
   */
  getRankingExplanation(
    result: SearchResult,
    query: EnhancedQuery,
    context?: RankingContext,
  ): string {
    const components = [
      `Base relevance: ${result.relevanceScore.toFixed(3)}`,
      `Recency: +${this.calculateRecencyScore(result).toFixed(3)}`,
      `Urgency: +${this.calculateUrgencyScore(result, query).toFixed(3)}`,
      `Match type (${result.matchType}): +${this.calculateMatchTypeScore(result).toFixed(3)}`,
      `Content quality: +${this.calculateContentQualityScore(result).toFixed(3)}`,
      `Complexity: +${this.calculateComplexityScore(result, query).toFixed(3)}`,
      `Category: +${this.calculateCategoryScore(result, query).toFixed(3)}`,
    ];
    
    if (context?.userPreferences) {
      components.splice(5, 0, `Preferences: +${this.calculatePreferenceScore(result, context.userPreferences).toFixed(3)}`);
    }

    return components.join(', ');
  }
}