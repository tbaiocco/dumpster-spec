import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dump, ProcessingStatus } from '../../../entities/dump.entity';

export enum ReviewFlag {
  INCORRECT_CATEGORY = 'incorrect_category',
  INCORRECT_SUMMARY = 'incorrect_summary',
  MISSING_ENTITIES = 'missing_entities',
  WRONG_URGENCY = 'wrong_urgency',
  CONTENT_QUALITY = 'content_quality',
  PROCESSING_ERROR = 'processing_error',
  FALSE_POSITIVE = 'false_positive',
  SPAM = 'spam',
  OTHER = 'other',
}

export enum ReviewPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface ReviewRequest {
  dumpId: string;
  userId: string;
  flag: ReviewFlag;
  priority?: ReviewPriority;
  description?: string;
  suggestedCategory?: string;
  suggestedSummary?: string;
  reportedBy?: 'user' | 'system' | 'confidence_check';
}

export interface ReviewItem {
  id: string;
  dumpId: string;
  userId: string;
  flag: ReviewFlag;
  priority: ReviewPriority;
  description?: string;
  suggestedCategory?: string;
  suggestedSummary?: string;
  reportedBy: 'user' | 'system' | 'confidence_check';
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolution?: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'dismissed';
}

@Injectable()
export class ReviewService {
  private readonly logger = new Logger(ReviewService.name);
  private readonly reviewItems: Map<string, ReviewItem> = new Map();

  constructor(
    @InjectRepository(Dump)
    private readonly dumpRepository: Repository<Dump>,
  ) {}

  /**
   * Flag a dump for manual review
   */
  async flagForReview(request: ReviewRequest): Promise<string> {
    try {
      // Validate that the dump exists and belongs to the user
      const dump = await this.dumpRepository.findOne({
        where: {
          id: request.dumpId,
          user_id: request.userId,
        },
        relations: ['user', 'category'],
      });

      if (!dump) {
        throw new Error('Dump not found or access denied');
      }

      // Create review item
      const reviewId = this.generateReviewId();
      const reviewItem: ReviewItem = {
        id: reviewId,
        dumpId: request.dumpId,
        userId: request.userId,
        flag: request.flag,
        priority: request.priority || this.determinePriority(request.flag),
        description: request.description,
        suggestedCategory: request.suggestedCategory,
        suggestedSummary: request.suggestedSummary,
        reportedBy: request.reportedBy || 'user',
        createdAt: new Date(),
        status: 'pending',
      };

      // Store review item (in a real implementation, this would go to a database)
      this.reviewItems.set(reviewId, reviewItem);

      // Update dump status if needed
      if (dump.processing_status === ProcessingStatus.COMPLETED) {
        await this.dumpRepository.update(dump.id, {
          processing_status: ProcessingStatus.PROCESSING, // Mark as needs attention
        });
      }

      this.logger.log(
        `Review flagged: ${reviewId} for dump ${request.dumpId} by ${request.reportedBy}`,
      );

      return reviewId;
    } catch (error) {
      this.logger.error('Error flagging dump for review:', error);
      throw error;
    }
  }

  /**
   * Get pending review items for a user
   */
  async getUserReviews(userId: string): Promise<ReviewItem[]> {
    const userReviews = Array.from(this.reviewItems.values())
      .filter((item) => item.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return userReviews;
  }

  /**
   * Get all pending review items (admin function)
   */
  async getPendingReviews(): Promise<ReviewItem[]> {
    const pendingReviews = Array.from(this.reviewItems.values())
      .filter((item) => item.status === 'pending')
      .sort((a, b) => {
        // Sort by priority first, then by creation time
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.priority];
        const bPriority = priorityOrder[b.priority];

        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }

        return b.createdAt.getTime() - a.createdAt.getTime();
      });

    return pendingReviews;
  }

  /**
   * Resolve a review item
   */
  async resolveReview(
    reviewId: string,
    resolution: string,
    resolvedBy: string,
  ): Promise<boolean> {
    try {
      const reviewItem = this.reviewItems.get(reviewId);
      if (!reviewItem) {
        throw new Error('Review item not found');
      }

      // Update review item
      reviewItem.status = 'resolved';
      reviewItem.resolvedAt = new Date();
      reviewItem.resolvedBy = resolvedBy;
      reviewItem.resolution = resolution;

      // Apply any suggested changes to the dump
      await this.applyResolution(reviewItem);

      this.logger.log(`Review resolved: ${reviewId} by ${resolvedBy}`);

      return true;
    } catch (error) {
      this.logger.error('Error resolving review:', error);
      throw error;
    }
  }

  /**
   * Automatically flag dumps with low confidence scores for review
   */
  async checkConfidenceThreshold(dumpId: string): Promise<string | null> {
    try {
      const dump = await this.dumpRepository.findOne({
        where: { id: dumpId },
        relations: ['user', 'category'],
      });

      if (!dump?.ai_confidence) {
        return null;
      }

      // Flag for review if confidence is too low
      const confidenceThreshold = 0.6; // 60%
      if (dump.ai_confidence < confidenceThreshold) {
        const reviewId = await this.flagForReview({
          dumpId: dump.id,
          userId: dump.user_id,
          flag: ReviewFlag.CONTENT_QUALITY,
          priority: ReviewPriority.MEDIUM,
          description: `Low AI confidence score: ${Math.round(dump.ai_confidence * 100)}%`,
          reportedBy: 'confidence_check',
        });

        this.logger.log(
          `Auto-flagged dump ${dumpId} for review due to low confidence: ${dump.ai_confidence}`,
        );

        return reviewId;
      }

      return null;
    } catch (error) {
      this.logger.error('Error checking confidence threshold:', error);
      return null;
    }
  }

  /**
   * Get review statistics
   */
  async getReviewStats(): Promise<{
    pending: number;
    inProgress: number;
    resolved: number;
    byFlag: Record<ReviewFlag, number>;
    byPriority: Record<ReviewPriority, number>;
  }> {
    const allReviews = Array.from(this.reviewItems.values());

    const stats = {
      pending: 0,
      inProgress: 0,
      resolved: 0,
      byFlag: {} as Record<ReviewFlag, number>,
      byPriority: {} as Record<ReviewPriority, number>,
    };

    // Initialize counters
    for (const flag of Object.values(ReviewFlag)) {
      stats.byFlag[flag] = 0;
    }
    for (const priority of Object.values(ReviewPriority)) {
      stats.byPriority[priority] = 0;
    }

    // Count reviews
    for (const review of allReviews) {
      if (review.status === 'pending') stats.pending++;
      else if (review.status === 'in_progress') stats.inProgress++;
      else if (review.status === 'resolved') stats.resolved++;

      stats.byFlag[review.flag]++;
      stats.byPriority[review.priority]++;
    }

    return stats;
  }

  private generateReviewId(): string {
    return `REV_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  private determinePriority(flag: ReviewFlag): ReviewPriority {
    const priorityMap: Record<ReviewFlag, ReviewPriority> = {
      [ReviewFlag.PROCESSING_ERROR]: ReviewPriority.HIGH,
      [ReviewFlag.SPAM]: ReviewPriority.HIGH,
      [ReviewFlag.INCORRECT_CATEGORY]: ReviewPriority.MEDIUM,
      [ReviewFlag.INCORRECT_SUMMARY]: ReviewPriority.MEDIUM,
      [ReviewFlag.WRONG_URGENCY]: ReviewPriority.MEDIUM,
      [ReviewFlag.MISSING_ENTITIES]: ReviewPriority.LOW,
      [ReviewFlag.CONTENT_QUALITY]: ReviewPriority.LOW,
      [ReviewFlag.FALSE_POSITIVE]: ReviewPriority.LOW,
      [ReviewFlag.OTHER]: ReviewPriority.LOW,
    };

    return priorityMap[flag] || ReviewPriority.LOW;
  }

  private async applyResolution(reviewItem: ReviewItem): Promise<void> {
    try {
      const updates: Partial<Dump> = {};

      // Apply suggested changes based on the review
      if (reviewItem.suggestedCategory) {
        // In a real implementation, we'd look up the category ID
        // For now, just log the suggestion
        this.logger.log(
          `Suggested category change for dump ${reviewItem.dumpId}: ${reviewItem.suggestedCategory}`,
        );
      }

      if (reviewItem.suggestedSummary) {
        updates.ai_summary = reviewItem.suggestedSummary;
      }

      // Mark as completed if resolution was successful
      updates.processing_status = ProcessingStatus.COMPLETED;

      if (Object.keys(updates).length > 0) {
        await this.dumpRepository.update(reviewItem.dumpId, updates);
        this.logger.log(
          `Applied resolution changes to dump ${reviewItem.dumpId}`,
        );
      }
    } catch (error) {
      this.logger.error('Error applying resolution:', error);
      // Don't throw here - the review is still marked as resolved
    }
  }
}
