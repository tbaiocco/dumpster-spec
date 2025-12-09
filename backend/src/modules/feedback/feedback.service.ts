import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  Feedback,
  FeedbackType,
  FeedbackPriority,
  FeedbackStatus,
} from '../../entities/feedback.entity';

// Re-export enums for backward compatibility
export { FeedbackType, FeedbackPriority, FeedbackStatus };

export interface FeedbackRequest {
  userId: string;
  type: FeedbackType;
  title: string;
  description: string;
  priority?: FeedbackPriority;
  dumpId?: string; // Optional reference to specific dump
  userAgent?: string;
  url?: string;
  reproductionSteps?: string[];
  expectedBehavior?: string;
  actualBehavior?: string;
  additionalContext?: Record<string, any>;
}

export interface FeedbackItem {
  id: string;
  userId: string;
  type: FeedbackType;
  title: string;
  description: string;
  priority: FeedbackPriority;
  status: FeedbackStatus;
  dumpId?: string;
  userAgent?: string;
  url?: string;
  reproductionSteps?: string[];
  expectedBehavior?: string;
  actualBehavior?: string;
  additionalContext?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolution?: string;
  internalNotes?: string[];
  upvotes: number;
  tags: string[];
}

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    @InjectRepository(Feedback)
    private readonly feedbackRepository: Repository<Feedback>,
  ) {}

  /**
   * Submit new feedback
   */
  async submitFeedback(request: FeedbackRequest): Promise<string> {
    try {
      const priority = request.priority || this.determinePriority(request.type);

      const feedback = this.feedbackRepository.create({
        user_id: request.userId,
        type: request.type,
        title: request.title,
        description: request.description,
        priority,
        status: FeedbackStatus.NEW,
        dump_id: request.dumpId,
        user_agent: request.userAgent,
        url: request.url,
        reproduction_steps: request.reproductionSteps,
        expected_behavior: request.expectedBehavior,
        actual_behavior: request.actualBehavior,
        additional_context: request.additionalContext,
        internal_notes: [],
        upvotes: 0,
        tags: this.generateTags(request),
      });

      const savedFeedback = await this.feedbackRepository.save(feedback);

      this.logger.log(
        `Feedback submitted: ${savedFeedback.id} (${request.type}) by user ${request.userId}`,
      );

      // Auto-acknowledge feedback
      await this.processNewFeedback(savedFeedback);

      return savedFeedback.id;
    } catch (error) {
      this.logger.error('Error submitting feedback:', error);
      throw error;
    }
  }

  /**
   * Get feedback by ID
   */
  async getFeedback(feedbackId: string): Promise<FeedbackItem | null> {
    const feedback = await this.feedbackRepository.findOne({
      where: { id: feedbackId },
    });

    return feedback ? this.mapToFeedbackItem(feedback) : null;
  }

  /**
   * Get user's feedback history
   */
  async getUserFeedback(userId: string): Promise<FeedbackItem[]> {
    const feedbacks = await this.feedbackRepository.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });

    return feedbacks.map((f) => this.mapToFeedbackItem(f));
  }

  /**
   * Get all feedback with filtering and pagination
   */
  async getAllFeedback(filters?: {
    type?: FeedbackType;
    status?: FeedbackStatus;
    priority?: FeedbackPriority;
    userId?: string;
    dumpId?: string;
    tags?: string[];
    limit?: number;
    offset?: number;
  }): Promise<{
    items: FeedbackItem[];
    total: number;
  }> {
    const queryBuilder = this.feedbackRepository.createQueryBuilder('feedback');

    // Apply filters
    if (filters?.type) {
      queryBuilder.andWhere('feedback.type = :type', { type: filters.type });
    }
    if (filters?.status) {
      queryBuilder.andWhere('feedback.status = :status', {
        status: filters.status,
      });
    }
    if (filters?.priority) {
      queryBuilder.andWhere('feedback.priority = :priority', {
        priority: filters.priority,
      });
    }
    if (filters?.userId) {
      queryBuilder.andWhere('feedback.user_id = :userId', {
        userId: filters.userId,
      });
    }
    if (filters?.dumpId) {
      queryBuilder.andWhere('feedback.dump_id = :dumpId', {
        dumpId: filters.dumpId,
      });
    }
    if (filters?.tags?.length) {
      queryBuilder.andWhere('feedback.tags && :tags', {
        tags: filters.tags,
      });
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Sort by priority and creation date
    queryBuilder
      .addSelect(
        `CASE feedback.priority 
        WHEN 'critical' THEN 4 
        WHEN 'high' THEN 3 
        WHEN 'medium' THEN 2 
        WHEN 'low' THEN 1 
        END`,
        'priority_order',
      )
      .orderBy('priority_order', 'DESC')
      .addOrderBy('feedback.created_at', 'DESC');

    // Apply pagination
    if (filters?.offset !== undefined) {
      queryBuilder.skip(filters.offset);
    }
    if (filters?.limit !== undefined) {
      queryBuilder.take(filters.limit);
    } else {
      queryBuilder.take(50);
    }

    const feedbacks = await queryBuilder.getMany();

    return {
      items: feedbacks.map((f) => this.mapToFeedbackItem(f)),
      total,
    };
  }

  /**
   * Update feedback status
   */
  async updateFeedbackStatus(
    feedbackId: string,
    status: FeedbackStatus,
    resolution?: string,
    resolvedBy?: string,
  ): Promise<boolean> {
    try {
      const feedback = await this.feedbackRepository.findOne({
        where: { id: feedbackId },
      });

      if (!feedback) {
        return false;
      }

      feedback.status = status;

      if (status === FeedbackStatus.RESOLVED && resolution) {
        feedback.resolution = resolution;
        feedback.resolved_at = new Date();
        if (resolvedBy) {
          feedback.resolved_by = resolvedBy;
        }
      }

      await this.feedbackRepository.save(feedback);

      this.logger.log(`Feedback ${feedbackId} status updated to ${status}`);

      return true;
    } catch (error) {
      this.logger.error('Error updating feedback status:', error);
      throw error;
    }
  }

  /**
   * Add internal note to feedback
   */
  async addInternalNote(feedbackId: string, note: string): Promise<boolean> {
    try {
      const feedback = await this.feedbackRepository.findOne({
        where: { id: feedbackId },
      });

      if (!feedback) {
        return false;
      }

      if (!feedback.internal_notes) {
        feedback.internal_notes = [];
      }

      feedback.internal_notes.push(`${new Date().toISOString()}: ${note}`);

      await this.feedbackRepository.save(feedback);

      return true;
    } catch (error) {
      this.logger.error('Error adding internal note:', error);
      throw error;
    }
  }

  /**
   * Upvote feedback (for prioritization)
   */
  async upvoteFeedback(feedbackId: string): Promise<boolean> {
    try {
      const feedback = await this.feedbackRepository.findOne({
        where: { id: feedbackId },
      });

      if (!feedback) {
        return false;
      }

      feedback.upvotes++;

      await this.feedbackRepository.save(feedback);

      return true;
    } catch (error) {
      this.logger.error('Error upvoting feedback:', error);
      throw error;
    }
  }

  /**
   * Get feedback statistics
   */
  async getFeedbackStats(): Promise<{
    total: number;
    byType: Record<FeedbackType, number>;
    byStatus: Record<FeedbackStatus, number>;
    byPriority: Record<FeedbackPriority, number>;
    avgResolutionTimeHours?: number;
    topTags: Array<{ tag: string; count: number }>;
  }> {
    const allFeedback = await this.feedbackRepository.find();

    const stats = {
      total: allFeedback.length,
      byType: {} as Record<FeedbackType, number>,
      byStatus: {} as Record<FeedbackStatus, number>,
      byPriority: {} as Record<FeedbackPriority, number>,
      avgResolutionTimeHours: undefined as number | undefined,
      topTags: [] as Array<{ tag: string; count: number }>,
    };

    // Initialize counters
    for (const type of Object.values(FeedbackType)) {
      stats.byType[type] = 0;
    }
    for (const status of Object.values(FeedbackStatus)) {
      stats.byStatus[status] = 0;
    }
    for (const priority of Object.values(FeedbackPriority)) {
      stats.byPriority[priority] = 0;
    }

    // Count feedback and calculate resolution time
    const resolvedFeedback: Feedback[] = [];
    const tagCounts: Record<string, number> = {};

    for (const feedback of allFeedback) {
      stats.byType[feedback.type]++;
      stats.byStatus[feedback.status]++;
      stats.byPriority[feedback.priority]++;

      if (feedback.status === FeedbackStatus.RESOLVED && feedback.resolved_at) {
        resolvedFeedback.push(feedback);
      }

      // Count tags
      for (const tag of feedback.tags || []) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }

    // Calculate average resolution time
    if (resolvedFeedback.length > 0) {
      const totalResolutionTimeMs = resolvedFeedback.reduce((sum, feedback) => {
        return (
          sum +
          (feedback.resolved_at!.getTime() - feedback.created_at.getTime())
        );
      }, 0);

      stats.avgResolutionTimeHours =
        totalResolutionTimeMs / (resolvedFeedback.length * 1000 * 60 * 60);
    }

    // Get top tags
    stats.topTags = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return stats;
  }

  private generateFeedbackId(): string {
    return `FB_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  private determinePriority(type: FeedbackType): FeedbackPriority {
    const priorityMap: Record<FeedbackType, FeedbackPriority> = {
      [FeedbackType.BUG_REPORT]: FeedbackPriority.HIGH,
      [FeedbackType.AI_ERROR]: FeedbackPriority.HIGH,
      [FeedbackType.PERFORMANCE_ISSUE]: FeedbackPriority.HIGH,
      [FeedbackType.CATEGORIZATION_ERROR]: FeedbackPriority.MEDIUM,
      [FeedbackType.SUMMARY_ERROR]: FeedbackPriority.MEDIUM,
      [FeedbackType.ENTITY_ERROR]: FeedbackPriority.MEDIUM,
      [FeedbackType.URGENCY_ERROR]: FeedbackPriority.MEDIUM,
      [FeedbackType.CONTENT_QUALITY]: FeedbackPriority.MEDIUM,
      [FeedbackType.FEATURE_REQUEST]: FeedbackPriority.LOW,
      [FeedbackType.GENERAL_FEEDBACK]: FeedbackPriority.LOW,
    };

    return priorityMap[type] || FeedbackPriority.MEDIUM;
  }

  private generateTags(request: FeedbackRequest): string[] {
    const tags: string[] = [];

    // Add type-based tags
    tags.push(request.type);

    // Add context-based tags
    if (request.dumpId) {
      tags.push('has-dump-reference');
    }

    if (request.reproductionSteps?.length) {
      tags.push('reproducible');
    }

    if (request.userAgent?.includes('Mobile')) {
      tags.push('mobile');
    }

    // Add AI-related tags
    if (request.type.includes('ai_') || request.type.includes('_error')) {
      tags.push('ai-related');
    }

    return tags;
  }

  private async processNewFeedback(feedback: Feedback): Promise<void> {
    // In a real implementation, this could:
    // - Send notifications to admins for critical issues
    // - Create tickets in external systems
    // - Trigger automated responses
    // - Update dashboards or metrics

    if (feedback.priority === FeedbackPriority.CRITICAL) {
      this.logger.warn(
        `Critical feedback received: ${feedback.id} - ${feedback.title}`,
      );
    }

    // Auto-acknowledge feedback
    feedback.status = FeedbackStatus.ACKNOWLEDGED;
    await this.feedbackRepository.save(feedback);
  }

  /**
   * Map database entity to FeedbackItem interface for backward compatibility
   */
  private mapToFeedbackItem(feedback: Feedback): FeedbackItem {
    return {
      id: feedback.id,
      userId: feedback.user_id,
      type: feedback.type,
      title: feedback.title,
      description: feedback.description,
      priority: feedback.priority,
      status: feedback.status,
      dumpId: feedback.dump_id,
      userAgent: feedback.user_agent,
      url: feedback.url,
      reproductionSteps: feedback.reproduction_steps,
      expectedBehavior: feedback.expected_behavior,
      actualBehavior: feedback.actual_behavior,
      additionalContext: feedback.additional_context,
      createdAt: feedback.created_at,
      updatedAt: feedback.updated_at,
      resolvedAt: feedback.resolved_at,
      resolvedBy: feedback.resolved_by,
      resolution: feedback.resolution,
      internalNotes: feedback.internal_notes,
      upvotes: feedback.upvotes,
      tags: feedback.tags,
    };
  }
}
