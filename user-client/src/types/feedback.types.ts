/**
 * Feedback Types
 * 
 * Type definitions for user feedback submission and management.
 */

// ============================================================================
// Enums
// ============================================================================

export type FeedbackCategory = 'Bug' | 'Feature Request' | 'Improvement' | 'Question' | 'Other';

export type FeedbackStatus = 'Pending' | 'In Review' | 'Resolved' | 'Rejected';

// ============================================================================
// Core Entity
// ============================================================================

/**
 * Feedback entity representing user-submitted feedback
 */
export interface Feedback {
  id: string;                    // Unique feedback identifier
  userId: string;                // Submitter's user ID
  category: FeedbackCategory;    // Feedback type
  message: string;               // Feedback content (min 10 chars)
  rating: number;                // User rating (1-5)
  status: FeedbackStatus;        // Current status
  response?: string;             // Admin response (if any)
  createdAt: string;             // ISO 8601 timestamp
  updatedAt: string;             // ISO 8601 timestamp
}

/**
 * Feedback submission request payload
 */
export interface FeedbackSubmission {
  category: FeedbackCategory;
  message: string;               // Minimum 10 characters
  rating: number;                // 1-5 integer
}

// ============================================================================
// Display Labels
// ============================================================================

/**
 * Feedback category display labels
 */
export const FEEDBACK_CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  Bug: 'Bug Report',
  'Feature Request': 'Feature Request',
  Improvement: 'Improvement Suggestion',
  Question: 'Question',
  Other: 'Other',
};

/**
 * Feedback status display labels
 */
export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
  Pending: 'Pending Review',
  'In Review': 'Under Review',
  Resolved: 'Resolved',
  Rejected: 'Rejected',
};

/**
 * Validation constants
 */
export const FEEDBACK_VALIDATION = {
  MIN_MESSAGE_LENGTH: 10,
  MIN_RATING: 1,
  MAX_RATING: 5,
};
