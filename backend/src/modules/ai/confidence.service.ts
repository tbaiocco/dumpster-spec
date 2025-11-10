import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dump } from '../../entities/dump.entity';

export interface ConfidenceThresholds {
  minimum: number;  // Below this triggers automatic review
  warning: number;  // Below this shows warning to user
  good: number;     // Above this is considered reliable
}

export interface ConfidenceScores {
  categorization?: number;
  summarization?: number;
  entityExtraction?: number;
  urgencyDetection?: number;
  overall?: number;
}

export interface ConfidenceAnalysis {
  dumpId: string;
  scores: ConfidenceScores;
  overallScore: number;
  recommendation: 'accept' | 'review' | 'reject';
  reasons: string[];
  needsReview: boolean;
  confidence: 'high' | 'medium' | 'low';
}

@Injectable()
export class ConfidenceService {
  private readonly logger = new Logger(ConfidenceService.name);

  // Default confidence thresholds
  private readonly defaultThresholds: ConfidenceThresholds = {
    minimum: 0.4,  // 40% - anything below this needs review
    warning: 0.6,  // 60% - show warning to user
    good: 0.8,     // 80% - reliable results
  };

  constructor(
    @InjectRepository(Dump)
    private readonly dumpRepository: Repository<Dump>,
  ) {}

  /**
   * Analyze confidence for a dump and determine if it needs review
   */
  async analyzeConfidence(dumpId: string): Promise<ConfidenceAnalysis> {
    try {
      const dump = await this.dumpRepository.findOne({
        where: { id: dumpId },
        relations: ['category'],
      });

      if (!dump) {
        throw new Error('Dump not found');
      }

      const scores = this.calculateComponentScores(dump);
      const overallScore = this.calculateOverallScore(scores);
      const analysis = this.generateAnalysis(dumpId, scores, overallScore);

      this.logger.log(`Confidence analysis for dump ${dumpId}: ${analysis.confidence} (${Math.round(overallScore * 100)}%)`);

      return analysis;

    } catch (error) {
      this.logger.error('Error analyzing confidence:', error);
      throw error;
    }
  }

  /**
   * Check if a dump meets confidence thresholds
   */
  isConfidentResult(
    overallScore: number, 
    thresholds?: Partial<ConfidenceThresholds>
  ): boolean {
    const thresholdConfig = { ...this.defaultThresholds, ...thresholds };
    return overallScore >= thresholdConfig.good;
  }

  /**
   * Check if a dump needs manual review based on confidence
   */
  needsReview(
    overallScore: number,
    thresholds?: Partial<ConfidenceThresholds>
  ): boolean {
    const thresholdConfig = { ...this.defaultThresholds, ...thresholds };
    return overallScore < thresholdConfig.minimum;
  }

  /**
   * Batch analyze confidence for multiple dumps
   */
  async batchAnalyzeConfidence(dumpIds: string[]): Promise<ConfidenceAnalysis[]> {
    const analyses: ConfidenceAnalysis[] = [];

    for (const dumpId of dumpIds) {
      try {
        const analysis = await this.analyzeConfidence(dumpId);
        analyses.push(analysis);
      } catch (error) {
        this.logger.error(`Error analyzing confidence for dump ${dumpId}:`, error);
        // Continue with other dumps
      }
    }

    return analyses;
  }

  /**
   * Get confidence statistics for a user
   */
  async getUserConfidenceStats(userId: string): Promise<{
    totalDumps: number;
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
    averageScore: number;
    needsReview: number;
  }> {
    try {
      const dumps = await this.dumpRepository.find({
        where: { user_id: userId },
        select: ['id', 'ai_confidence', 'processing_status'],
      });

      const stats = {
        totalDumps: dumps.length,
        highConfidence: 0,
        mediumConfidence: 0,
        lowConfidence: 0,
        averageScore: 0,
        needsReview: 0,
      };

      if (dumps.length === 0) {
        return stats;
      }

      let totalScore = 0;
      let scoredDumps = 0;

      for (const dump of dumps) {
        if (dump.ai_confidence !== null) {
          totalScore += dump.ai_confidence;
          scoredDumps++;

          if (dump.ai_confidence >= this.defaultThresholds.good) {
            stats.highConfidence++;
          } else if (dump.ai_confidence >= this.defaultThresholds.warning) {
            stats.mediumConfidence++;
          } else {
            stats.lowConfidence++;
          }

          if (this.needsReview(dump.ai_confidence)) {
            stats.needsReview++;
          }
        }
      }

      stats.averageScore = scoredDumps > 0 ? totalScore / scoredDumps : 0;

      return stats;

    } catch (error) {
      this.logger.error('Error getting user confidence stats:', error);
      throw error;
    }
  }

  /**
   * Update confidence score for a dump
   */
  async updateConfidenceScore(
    dumpId: string, 
    scores: ConfidenceScores
  ): Promise<void> {
    try {
      const overallScore = this.calculateOverallScore(scores);
      
      await this.dumpRepository.update(dumpId, {
        ai_confidence: overallScore,
      });

      this.logger.log(`Updated confidence score for dump ${dumpId}: ${Math.round(overallScore * 100)}%`);

    } catch (error) {
      this.logger.error('Error updating confidence score:', error);
      throw error;
    }
  }

  /**
   * Get confidence recommendations for improving AI results
   */
  getConfidenceRecommendations(analysis: ConfidenceAnalysis): string[] {
    const recommendations: string[] = [];

    if (analysis.scores.categorization && analysis.scores.categorization < 0.6) {
      recommendations.push('Consider reviewing category assignment - low categorization confidence');
    }

    if (analysis.scores.summarization && analysis.scores.summarization < 0.6) {
      recommendations.push('AI summary may be inaccurate - consider manual review');
    }

    if (analysis.scores.entityExtraction && analysis.scores.entityExtraction < 0.6) {
      recommendations.push('Entity extraction may have missed important information');
    }

    if (analysis.scores.urgencyDetection && analysis.scores.urgencyDetection < 0.6) {
      recommendations.push('Urgency level detection may be incorrect');
    }

    if (analysis.overallScore < 0.4) {
      recommendations.push('Low overall confidence - manual review strongly recommended');
    } else if (analysis.overallScore < 0.6) {
      recommendations.push('Medium confidence - consider spot-checking results');
    }

    if (recommendations.length === 0) {
      recommendations.push('Confidence levels look good - no immediate action needed');
    }

    return recommendations;
  }

  private calculateComponentScores(dump: Dump): ConfidenceScores {
    const scores: ConfidenceScores = {};

    // Use existing ai_confidence as base, or calculate from components
    if (dump.ai_confidence !== null) {
      scores.overall = dump.ai_confidence;
    }

    scores.categorization = this.calculateCategorizationScore(dump);
    scores.summarization = this.calculateSummarizationScore(dump);
    scores.entityExtraction = this.calculateEntityExtractionScore(dump);
    scores.urgencyDetection = this.calculateUrgencyDetectionScore(dump);

    return scores;
  }

  private calculateCategorizationScore(dump: Dump): number {
    return dump.category_id ? 0.8 : 0.3;
  }

  private calculateSummarizationScore(dump: Dump): number {
    if (!dump.ai_summary) {
      return 0.2;
    }

    const summaryLength = dump.ai_summary.length;
    const contentLength = dump.raw_content.length;
    
    if (summaryLength > 10 && summaryLength < contentLength) {
      return 0.85; // Good summary
    } else if (summaryLength > 0) {
      return 0.6; // Basic summary
    }
    
    return 0.2;
  }

  private calculateEntityExtractionScore(dump: Dump): number {
    const entityCount = dump.extracted_entities && 
      typeof dump.extracted_entities === 'object' 
      ? Object.keys(dump.extracted_entities).length 
      : 0;
    
    if (entityCount > 3) return 0.9;
    if (entityCount > 0) return 0.7;
    return 0.4;
  }

  private calculateUrgencyDetectionScore(dump: Dump): number {
    return (dump.urgency_level !== null && dump.urgency_level > 0) ? 0.75 : 0.5;
  }

  private calculateOverallScore(scores: ConfidenceScores): number {
    // If we have an overall score, use it
    if (scores.overall !== undefined) {
      return Math.max(0, Math.min(1, scores.overall));
    }

    // Otherwise calculate weighted average
    const weights = {
      categorization: 0.25,
      summarization: 0.35,
      entityExtraction: 0.25,
      urgencyDetection: 0.15,
    };

    let weightedSum = 0;
    let totalWeight = 0;

    for (const [component, weight] of Object.entries(weights)) {
      const score = scores[component as keyof ConfidenceScores];
      if (score !== undefined) {
        weightedSum += score * weight;
        totalWeight += weight;
      }
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0.5;
  }

  private generateAnalysis(
    dumpId: string, 
    scores: ConfidenceScores, 
    overallScore: number
  ): ConfidenceAnalysis {
    const reasons: string[] = [];
    let recommendation: 'accept' | 'review' | 'reject';
    let confidence: 'high' | 'medium' | 'low';

    // Determine overall confidence level
    if (overallScore >= this.defaultThresholds.good) {
      confidence = 'high';
      recommendation = 'accept';
      reasons.push('High confidence in AI processing results');
    } else if (overallScore >= this.defaultThresholds.warning) {
      confidence = 'medium';
      recommendation = 'review';
      reasons.push('Medium confidence - spot check recommended');
    } else {
      confidence = 'low';
      recommendation = overallScore < this.defaultThresholds.minimum ? 'reject' : 'review';
      reasons.push('Low confidence - manual review required');
    }

    // Add specific component feedback
    if (scores.categorization && scores.categorization < 0.5) {
      reasons.push('Uncertain about content category');
    }
    if (scores.summarization && scores.summarization < 0.5) {
      reasons.push('AI summary may be incomplete');
    }
    if (scores.entityExtraction && scores.entityExtraction < 0.5) {
      reasons.push('May have missed important entities');
    }

    const needsReview = this.needsReview(overallScore);

    return {
      dumpId,
      scores,
      overallScore,
      recommendation,
      reasons,
      needsReview,
      confidence,
    };
  }
}