import { Injectable, Logger } from '@nestjs/common';

export enum FeedbackType {
  BUG_REPORT = 'bug_report',
  FEATURE_REQUEST = 'feature_request',
  AI_ERROR = 'ai_error',
  CATEGORIZATION_ERROR = 'categorization_error',
  SUMMARY_ERROR = 'summary_error',
  ENTITY_ERROR = 'entity_error',
  URGENCY_ERROR = 'urgency_error',
  GENERAL_FEEDBACK = 'general_feedback',
  CONTENT_QUALITY = 'content_quality',
  PERFORMANCE_ISSUE = 'performance_issue',
}

export enum FeedbackPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum FeedbackStatus {
  NEW = 'new',
  ACKNOWLEDGED = 'acknowledged',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

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
  private readonly feedbackItems: Map<string, FeedbackItem> = new Map();

  /**
   * Submit new feedback
   */
  async submitFeedback(request: FeedbackRequest): Promise<string> {
    try {
      const feedbackId = this.generateFeedbackId();
      const priority = request.priority || this.determinePriority(request.type);

      const feedbackItem: FeedbackItem = {
        id: feedbackId,
        userId: request.userId,
        type: request.type,
        title: request.title,
        description: request.description,
        priority,
        status: FeedbackStatus.NEW,
        dumpId: request.dumpId,
        userAgent: request.userAgent,
        url: request.url,
        reproductionSteps: request.reproductionSteps,
        expectedBehavior: request.expectedBehavior,
        actualBehavior: request.actualBehavior,
        additionalContext: request.additionalContext,
        createdAt: new Date(),
        updatedAt: new Date(),
        internalNotes: [],
        upvotes: 0,
        tags: this.generateTags(request),
      };

      this.feedbackItems.set(feedbackId, feedbackItem);

      this.logger.log(
        `Feedback submitted: ${feedbackId} (${request.type}) by user ${request.userId}`,
      );

      // In a real implementation, this could trigger notifications or integrations
      await this.processNewFeedback(feedbackItem);

      return feedbackId;
    } catch (error) {
      this.logger.error('Error submitting feedback:', error);
      throw error;
    }
  }

  /**
   * Get feedback by ID
   */
  async getFeedback(feedbackId: string): Promise<FeedbackItem | null> {
    return this.feedbackItems.get(feedbackId) || null;
  }

  /**
   * Get user's feedback history
   */
  async getUserFeedback(userId: string): Promise<FeedbackItem[]> {
    const userFeedback = Array.from(this.feedbackItems.values())
      .filter((item) => item.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return userFeedback;
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
    let filteredItems = Array.from(this.feedbackItems.values());

    // Apply filters
    if (filters) {
      if (filters.type) {
        filteredItems = filteredItems.filter(
          (item) => item.type === filters.type,
        );
      }
      if (filters.status) {
        filteredItems = filteredItems.filter(
          (item) => item.status === filters.status,
        );
      }
      if (filters.priority) {
        filteredItems = filteredItems.filter(
          (item) => item.priority === filters.priority,
        );
      }
      if (filters.userId) {
        filteredItems = filteredItems.filter(
          (item) => item.userId === filters.userId,
        );
      }
      if (filters.dumpId) {
        filteredItems = filteredItems.filter(
          (item) => item.dumpId === filters.dumpId,
        );
      }
      if (filters.tags?.length) {
        filteredItems = filteredItems.filter((item) =>
          filters.tags!.some((tag) => item.tags.includes(tag)),
        );
      }
    }

    // Sort by priority and creation date
    filteredItems.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority];
      const bPriority = priorityOrder[b.priority];

      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }

      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    const total = filteredItems.length;

    // Apply pagination
    if (filters?.limit || filters?.offset) {
      const offset = filters.offset || 0;
      const limit = filters.limit || 50;
      filteredItems = filteredItems.slice(offset, offset + limit);
    }

    return { items: filteredItems, total };
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
      const feedbackItem = this.feedbackItems.get(feedbackId);
      if (!feedbackItem) {
        return false;
      }

      feedbackItem.status = status;
      feedbackItem.updatedAt = new Date();

      if (status === FeedbackStatus.RESOLVED && resolution) {
        feedbackItem.resolution = resolution;
        feedbackItem.resolvedAt = new Date();
        feedbackItem.resolvedBy = resolvedBy;
      }

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
      const feedbackItem = this.feedbackItems.get(feedbackId);
      if (!feedbackItem) {
        return false;
      }

      feedbackItem.internalNotes ??= [];

      feedbackItem.internalNotes.push(`${new Date().toISOString()}: ${note}`);
      feedbackItem.updatedAt = new Date();

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
      const feedbackItem = this.feedbackItems.get(feedbackId);
      if (!feedbackItem) {
        return false;
      }

      feedbackItem.upvotes++;
      feedbackItem.updatedAt = new Date();

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
    const allFeedback = Array.from(this.feedbackItems.values());

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
    const resolvedFeedback: FeedbackItem[] = [];
    const tagCounts: Record<string, number> = {};

    for (const feedback of allFeedback) {
      stats.byType[feedback.type]++;
      stats.byStatus[feedback.status]++;
      stats.byPriority[feedback.priority]++;

      if (feedback.status === FeedbackStatus.RESOLVED && feedback.resolvedAt) {
        resolvedFeedback.push(feedback);
      }

      // Count tags
      for (const tag of feedback.tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }

    // Calculate average resolution time
    if (resolvedFeedback.length > 0) {
      const totalResolutionTimeMs = resolvedFeedback.reduce((sum, feedback) => {
        return (
          sum + (feedback.resolvedAt!.getTime() - feedback.createdAt.getTime())
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

  private async processNewFeedback(feedbackItem: FeedbackItem): Promise<void> {
    // In a real implementation, this could:
    // - Send notifications to admins for critical issues
    // - Create tickets in external systems
    // - Trigger automated responses
    // - Update dashboards or metrics

    if (feedbackItem.priority === FeedbackPriority.CRITICAL) {
      this.logger.warn(
        `Critical feedback received: ${feedbackItem.id} - ${feedbackItem.title}`,
      );
    }

    // Auto-acknowledge feedback
    feedbackItem.status = FeedbackStatus.ACKNOWLEDGED;
    feedbackItem.updatedAt = new Date();
  }
}
