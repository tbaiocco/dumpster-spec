/**
 * Dump Types
 * 
 * Type definitions for dump entities and related data structures.
 * Based on backend API contracts and data model specifications.
 */

// ============================================================================
// Enums
// ============================================================================

// Backend enum: ProcessingStatus from dump.entity.ts
export type ProcessingStatus = 'received' | 'processing' | 'completed' | 'failed';

// Urgency levels (1=low, 2=medium, 3=high)
export type UrgencyLevel = 1 | 2 | 3;

// Backend enum: ContentType from dump.entity.ts
export type ContentType = 'text' | 'voice' | 'image' | 'email';

export type TimeBucket = 'overdue' | 'today' | 'tomorrow' | 'nextWeek' | 'nextMonth' | 'later';

// ============================================================================
// Core Entities
// ============================================================================

/**
 * User entity representing an authenticated user
 * Matches backend AuthResponse user object
 */
export interface User {
  id: string;                    // Unique user identifier (userId)
  phoneNumber: string;           // User phone number (phone_number)
  verifiedAt?: string;           // ISO 8601 timestamp of phone verification
  chatIdTelegram?: string | null; // Telegram chat ID if connected
  chatIdWhatsapp?: string | null; // WhatsApp chat ID if connected
  timezone?: string;             // User timezone (e.g., 'America/New_York')
  language?: string;             // User language preference (e.g., 'en', 'es')
  createdAt: string;             // ISO 8601 timestamp
  updatedAt: string;             // ISO 8601 timestamp
}

/**
 * Date entity extracted from dump content
 */
export interface DateEntity {
  date: string;                  // ISO 8601 date
  type: 'deadline' | 'event' | 'reminder' | 'generic';
  context?: string;              // Surrounding text for context
}

/**
 * Reminder entity extracted from dump content
 */
export interface ReminderEntity {
  title: string;                 // Reminder title
  dueDate: string;               // ISO 8601 date
  priority?: 'Low' | 'Medium' | 'High';
  notes?: string;
}

/**
 * Package tracking entity extracted from dump content
 */
export interface TrackingEntity {
  carrier: string;               // Shipping carrier name
  trackingNumber: string;        // Tracking number
  estimatedDelivery?: string;    // ISO 8601 date
  status?: string;               // Current shipping status
}

/**
 * AI-extracted structured data from dump content
 * Matches backend response structure
 */
export interface ExtractedEntities {
  urgency: string;               // Urgency level: 'low', 'medium', 'high', 'critical'
  entities: {
    dates: string[];             // Array of ISO date strings
    times: string[];             // Array of time strings
    people: string[];            // Array of person names
    amounts: string[];           // Array of monetary amounts
    contacts: {
      urls: string[];
      emails: string[];
      phones: string[];
    };
    locations: string[];         // Array of locations
    organizations: string[];     // Array of organization names
  };
  metadata: {
    source: string;              // Source platform (e.g., 'telegram', 'whatsapp')
    routingInfo: any | null;
    enhancedProcessing: boolean;
  };
  sentiment: string;             // Sentiment: 'positive', 'negative', 'neutral'
  actionItems: string[];         // Array of action items
  autoApplied: boolean;
  entityDetails: Array<{
    type: string;
    value: string;
    context: string;
    confidence: number;
  }>;
  entitySummary: {
    totalEntities: number;
    entitiesByType: Record<string, number>;
    averageConfidence: number;
  };
  categoryReasoning: string;
  categoryConfidence: number;
  alternativeCategories: string[];
}

/**
 * Category entity from backend
 */
export interface Category {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

/**
 * Core dump entity from backend API
 * Uses snake_case to match backend response
 */
export interface Dump {
  id: string;                              // Unique dump identifier
  user_id: string;                         // Owner's user ID
  raw_content: string;                     // Original captured text
  content_type: string;                    // Content type (e.g., 'text', 'image')
  media_url: string | null;                // Media URL if applicable
  ai_summary: string;                      // AI-generated summary
  ai_confidence: number;                   // AI confidence score (0-100)
  category_id: string;                     // Category UUID
  urgency_level: number;                   // Urgency level (1-4)
  processing_status: string;               // Status: 'pending', 'processing', 'completed', 'failed'
  extracted_entities: ExtractedEntities;   // AI-extracted data
  content_vector: number[];                // Embedding vector for semantic search
  created_at: string;                      // ISO 8601 timestamp
  processed_at: string | null;             // ISO 8601 timestamp when AI processed
  user?: User;                             // User object (included in response)
  category?: Category;                     // Category object (included in response)
}

/**
 * Dump with derived/computed properties for UI display
 */
export interface DumpDerived extends Dump {
  timeBucket: TimeBucket;        // Computed from extracted_entities.entities.dates
  isOverdue: boolean;            // True if earliest date < today
  displayDate: Date;             // Earliest date from extracted_entities
  hasReminder: boolean;          // True if action items exist
  hasTracking: boolean;          // True if tracking numbers in content
  // Helper properties for display
  status: ProcessingStatus;      // Processing status from backend
  categoryName?: string;         // Category name for display (optional override)
  notes?: string;                // User notes (if any)
}

// ============================================================================
// UI-Specific Models
// ============================================================================

/**
 * Time bucket group for dashboard display
 */
export interface TimeBucketGroup {
  bucket: TimeBucket;            // Time bucket identifier
  label: string;                 // Display label
  dumps: DumpDerived[];          // Dumps in this bucket
  isExpanded: boolean;           // Expansion state (UI only)
  count: number;                 // Number of dumps
}

/**
 * Bucket display labels
 */
export const BUCKET_LABELS: Record<TimeBucket, string> = {
  overdue: 'Overdue',
  today: 'Today',
  tomorrow: 'Tomorrow',
  nextWeek: 'Next Week',
  nextMonth: 'Next Month',
  later: 'Later',
};

/**
 * Processing status display labels
 */
export const STATUS_LABELS: Record<ProcessingStatus, string> = {
  received: 'Received',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
};

/**
 * Urgency level display labels
 */
export const URGENCY_LABELS: Record<UrgencyLevel, string> = {
  1: 'Low',
  2: 'Medium',
  3: 'High',
};

/**
 * Content type display labels
 */
export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  text: 'Text',
  voice: 'Voice',
  image: 'Image',
  email: 'Email',
};
