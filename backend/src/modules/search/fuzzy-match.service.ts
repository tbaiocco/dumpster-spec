import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dump } from '../../entities/dump.entity';

export interface FuzzyMatchRequest {
  query: string;
  userId: string;
  limit?: number;
  minScore?: number;
  categoryFilter?: string[];
  contentTypeFilter?: string[];
}

export interface FuzzyMatchResult {
  dump: Dump;
  score: number;
  matchedTerms: string[];
  matchDetails: {
    titleMatch?: number;
    summaryMatch?: number;
    contentMatch?: number;
    categoryMatch?: number;
  };
}

@Injectable()
export class FuzzyMatchService {
  private readonly logger = new Logger(FuzzyMatchService.name);

  constructor(
    @InjectRepository(Dump)
    private readonly dumpRepository: Repository<Dump>,
  ) {}

  /**
   * Perform fuzzy matching search with typo tolerance
   */
  async search(request: FuzzyMatchRequest): Promise<FuzzyMatchResult[]> {
    try {
      this.logger.debug(`Fuzzy search for: "${request.query}" (user: ${request.userId})`);

      // Normalize and tokenize query
      const queryTerms = this.normalizeQuery(request.query);
      if (queryTerms.length === 0) {
        return [];
      }

      // Build base query
      let query = this.dumpRepository
        .createQueryBuilder('dump')
        .leftJoinAndSelect('dump.category', 'category')
        .leftJoinAndSelect('dump.user', 'user')
        .where('dump.user_id = :userId', { userId: request.userId });

      // Apply filters
      if (request.categoryFilter && request.categoryFilter.length > 0) {
        query = query.andWhere('category.name IN (:...categories)', { 
          categories: request.categoryFilter 
        });
      }

      if (request.contentTypeFilter && request.contentTypeFilter.length > 0) {
        query = query.andWhere('dump.content_type IN (:...contentTypes)', { 
          contentTypes: request.contentTypeFilter 
        });
      }

      // Get all potential matches
      const dumps = await query
        .take(1000) // Limit to prevent huge queries
        .getMany();

      if (dumps.length === 0) {
        return [];
      }

      // Calculate fuzzy scores for each dump
      const results: FuzzyMatchResult[] = [];
      const minScore = request.minScore || 0.3;

      for (const dump of dumps) {
        const matchResult = this.calculateFuzzyScore(dump, queryTerms);
        
        if (matchResult.score >= minScore) {
          results.push({
            dump,
            score: matchResult.score,
            matchedTerms: matchResult.matchedTerms,
            matchDetails: matchResult.matchDetails,
          });
        }
      }

      // Sort by score (descending) and limit
      results.sort((a, b) => b.score - a.score);
      const limitedResults = results.slice(0, request.limit || 20);

      this.logger.debug(`Fuzzy search completed: ${limitedResults.length} results`);
      return limitedResults;

    } catch (error) {
      this.logger.error('Fuzzy search failed:', error);
      throw new Error(`Fuzzy search failed: ${error.message}`);
    }
  }

  /**
   * Calculate fuzzy matching score for a dump
   */
  private calculateFuzzyScore(dump: Dump, queryTerms: string[]): {
    score: number;
    matchedTerms: string[];
    matchDetails: FuzzyMatchResult['matchDetails'];
  } {
    const content = (dump.raw_content || '').toLowerCase();
    const summary = (dump.ai_summary || '').toLowerCase();
    const categoryName = (dump.category?.name || '').toLowerCase();

    const matchDetails: FuzzyMatchResult['matchDetails'] = {};
    const matchedTerms: string[] = [];
    let totalScore = 0;
    let maxPossibleScore = queryTerms.length;

    for (const term of queryTerms) {
      let termScore = 0;
      let termMatched = false;

      // Check exact matches first (highest score)
      if (content.includes(term)) {
        termScore = Math.max(termScore, 1);
        termMatched = true;
        matchDetails.contentMatch = (matchDetails.contentMatch || 0) + 1;
      }

      if (summary.includes(term)) {
        termScore = Math.max(termScore, 0.9);
        termMatched = true;
        matchDetails.summaryMatch = (matchDetails.summaryMatch || 0) + 1;
      }

      if (categoryName.includes(term)) {
        termScore = Math.max(termScore, 0.7);
        termMatched = true;
        matchDetails.categoryMatch = (matchDetails.categoryMatch || 0) + 1;
      }

      // Check fuzzy matches
      if (!termMatched) {
        const fuzzyScore = this.calculateBestFuzzyMatch(term, [content, summary, categoryName]);
        if (fuzzyScore > 0.6) { // Only consider reasonably close matches
          termScore = fuzzyScore * 0.8; // Penalty for fuzzy matches
          termMatched = true;
        }
      }

      if (termMatched) {
        matchedTerms.push(term);
        totalScore += termScore;
      }
    }

    // Normalize score based on query coverage
    const coverage = matchedTerms.length / queryTerms.length;
    const averageScore = maxPossibleScore > 0 ? totalScore / maxPossibleScore : 0;
    const finalScore = averageScore * coverage;

    return {
      score: Math.min(1, finalScore),
      matchedTerms,
      matchDetails,
    };
  }

  /**
   * Calculate the best fuzzy match score for a term against multiple texts
   */
  private calculateBestFuzzyMatch(term: string, texts: string[]): number {
    let bestScore = 0;

    for (const text of texts) {
      const words = text.split(/\s+/);
      
      for (const word of words) {
        if (word.length < 2) continue;
        
        const similarity = this.calculateLevenshteinSimilarity(term, word);
        bestScore = Math.max(bestScore, similarity);
        
        // Early exit for very good matches
        if (bestScore > 0.85) {
          return bestScore;
        }
      }
    }

    return bestScore;
  }

  /**
   * Calculate Levenshtein similarity between two strings
   */
  private calculateLevenshteinSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) {
      return 1;
    }

    const editDistance = this.calculateLevenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private calculateLevenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    // Initialize matrix
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Normalize and tokenize search query
   */
  private normalizeQuery(query: string): string[] {
    return query
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter(term => term.length > 1) // Filter out single characters
      .map(term => term.replaceAll(/[^\w]/g, '')) // Remove special characters
      .filter(term => term.length > 1); // Filter again after cleaning
  }

  /**
   * Advanced fuzzy search with phonetic matching
   */
  async advancedFuzzySearch(request: FuzzyMatchRequest & {
    usePhonetic?: boolean;
    useNGrams?: boolean;
    boostExactMatches?: boolean;
  }): Promise<FuzzyMatchResult[]> {
    const baseResults = await this.search(request);

    if (!request.usePhonetic && !request.useNGrams) {
      return baseResults;
    }

    // Apply additional fuzzy techniques
    let enhancedResults = [...baseResults];

    if (request.usePhonetic) {
      enhancedResults = this.applyPhoneticMatching(enhancedResults, request.query);
    }

    if (request.useNGrams) {
      enhancedResults = this.applyNGramMatching(enhancedResults, request.query);
    }

    if (request.boostExactMatches) {
      enhancedResults = this.boostExactMatches(enhancedResults, request.query);
    }

    // Re-sort after enhancements
    enhancedResults.sort((a, b) => b.score - a.score);

    return enhancedResults;
  }

  /**
   * Apply phonetic matching using Soundex-like algorithm
   */
  private applyPhoneticMatching(results: FuzzyMatchResult[], query: string): FuzzyMatchResult[] {
    const queryPhonetic = this.generatePhoneticCode(query);

    return results.map(result => {
      const contentPhonetic = this.generatePhoneticCode(result.dump.raw_content || '');
      const summaryPhonetic = this.generatePhoneticCode(result.dump.ai_summary || '');

      let phoneticBoost = 0;
      
      if (this.comparePhoneticCodes(queryPhonetic, contentPhonetic)) {
        phoneticBoost += 0.1;
      }
      
      if (this.comparePhoneticCodes(queryPhonetic, summaryPhonetic)) {
        phoneticBoost += 0.08;
      }

      return {
        ...result,
        score: Math.min(1, result.score + phoneticBoost),
      };
    });
  }

  /**
   * Generate simple phonetic code (simplified Soundex)
   */
  private generatePhoneticCode(text: string): string {
    const cleaned = text.toLowerCase().replaceAll(/[^a-z\s]/g, '');
    const words = cleaned.split(/\s+/);
    
    return words.map(word => {
      if (word.length === 0) return '';
      
      let code = word[0];
      for (let i = 1; i < word.length; i++) {
        const char = word[i];
        const prev = word[i - 1];
        
        // Group similar sounding consonants
        if ('bfpv'.includes(char) && !'bfpv'.includes(prev)) code += '1';
        else if ('cgjkqsxz'.includes(char) && !'cgjkqsxz'.includes(prev)) code += '2';
        else if ('dt'.includes(char) && !'dt'.includes(prev)) code += '3';
        else if ('l'.includes(char) && !'l'.includes(prev)) code += '4';
        else if ('mn'.includes(char) && !'mn'.includes(prev)) code += '5';
        else if ('r'.includes(char) && !'r'.includes(prev)) code += '6';
        // Skip vowels and duplicate sounds
      }
      
      return code.slice(0, 4).padEnd(4, '0');
    }).join(' ');
  }

  /**
   * Compare phonetic codes for similarity
   */
  private comparePhoneticCodes(code1: string, code2: string): boolean {
    const words1 = code1.split(' ');
    const words2 = code2.split(' ');
    
    for (const word1 of words1) {
      for (const word2 of words2) {
        if (word1.length >= 3 && word2.length >= 3 && word1 === word2) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Apply N-gram matching for partial word matches
   */
  private applyNGramMatching(results: FuzzyMatchResult[], query: string): FuzzyMatchResult[] {
    const queryNGrams = this.generateNGrams(query, 3);

    return results.map(result => {
      const content = result.dump.raw_content || '';
      const contentNGrams = this.generateNGrams(content, 3);
      
      const intersection = queryNGrams.filter(gram => contentNGrams.includes(gram));
      const similarity = queryNGrams.length > 0 ? intersection.length / queryNGrams.length : 0;
      
      const ngramBoost = similarity * 0.15;

      return {
        ...result,
        score: Math.min(1, result.score + ngramBoost),
      };
    });
  }

  /**
   * Generate N-grams from text
   */
  private generateNGrams(text: string, n: number): string[] {
    const cleaned = text.toLowerCase().replaceAll(/[^a-z]/g, '');
    const ngrams: string[] = [];
    
    for (let i = 0; i <= cleaned.length - n; i++) {
      ngrams.push(cleaned.slice(i, i + n));
    }
    
    return ngrams;
  }

  /**
   * Boost results with exact word matches
   */
  private boostExactMatches(results: FuzzyMatchResult[], query: string): FuzzyMatchResult[] {
    const queryWords = this.normalizeQuery(query);

    return results.map(result => {
      const content = (result.dump.raw_content || '').toLowerCase();
      const summary = (result.dump.ai_summary || '').toLowerCase();
      
      let exactMatchBoost = 0;
      
      for (const word of queryWords) {
        if (content.includes(word)) {
          exactMatchBoost += 0.05;
        }
        if (summary.includes(word)) {
          exactMatchBoost += 0.04;
        }
      }

      return {
        ...result,
        score: Math.min(1, result.score + exactMatchBoost),
      };
    });
  }

  /**
   * Get fuzzy search statistics
   */
  async getFuzzySearchStats(userId: string): Promise<{
    totalSearchableText: number;
    avgWordsPerDump: number;
    commonMisspellings: string[];
  }> {
    try {
      const dumps = await this.dumpRepository
        .createQueryBuilder('dump')
        .select(['dump.raw_content', 'dump.ai_summary'])
        .where('dump.user_id = :userId', { userId })
        .getMany();

      let totalWords = 0;

      for (const dump of dumps) {
        const content = `${dump.raw_content || ''} ${dump.ai_summary || ''}`;
        const words = content.split(/\s+/).filter(w => w.length > 0);
        totalWords += words.length;
      }

      const avgWordsPerDump = dumps.length > 0 ? totalWords / dumps.length : 0;

      return {
        totalSearchableText: totalWords,
        avgWordsPerDump: Math.round(avgWordsPerDump),
        commonMisspellings: [], // Could be implemented with actual misspelling detection
      };
    } catch (error) {
      this.logger.error('Failed to get fuzzy search stats:', error);
      return {
        totalSearchableText: 0,
        avgWordsPerDump: 0,
        commonMisspellings: [],
      };
    }
  }
}