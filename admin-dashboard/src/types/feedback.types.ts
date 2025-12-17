/**
 * Feedback Types and Interfaces
 */

export enum FeedbackType {
  BUG_REPORT = 'BUG_REPORT',
  FEATURE_REQUEST = 'FEATURE_REQUEST',
  AI_ERROR = 'AI_ERROR',
  CATEGORIZATION_ERROR = 'CATEGORIZATION_ERROR',
  SUMMARY_ERROR = 'SUMMARY_ERROR',
  ENTITY_ERROR = 'ENTITY_ERROR',
  URGENCY_ERROR = 'URGENCY_ERROR',
  GENERAL_FEEDBACK = 'GENERAL_FEEDBACK',
  CONTENT_QUALITY = 'CONTENT_QUALITY',
  PERFORMANCE_ISSUE = 'PERFORMANCE_ISSUE',
}

export enum FeedbackPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum FeedbackStatus {
  NEW = 'NEW',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  WONT_FIX = 'WONT_FIX',
}

export interface Feedback {
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
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolution?: string;
  internalNotes?: string[];
  upvotes: number;
  tags: string[];
}

export interface FeedbackFilters {
  type?: FeedbackType;
  status?: FeedbackStatus;
  priority?: FeedbackPriority;
  userId?: string;
  dumpId?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface FeedbackStats {
  total: number;
  byType: Record<FeedbackType, number>;
  byStatus: Record<FeedbackStatus, number>;
  byPriority: Record<FeedbackPriority, number>;
  averageResolutionTime?: number;
  topTags?: Array<{ tag: string; count: number }>;
}
