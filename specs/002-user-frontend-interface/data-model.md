# Data Model: User Frontend Interface

**Feature**: `002-user-frontend-interface`  
**Date**: 2025-12-15  
**Status**: Complete

## Overview

This document defines the frontend data models for the User Frontend Interface. These models represent the shape of data as consumed by the React application, derived from backend API responses.

---

## Core Entities

### User

Represents an authenticated user of the system.

```typescript
interface User {
  id: string;                    // Unique user identifier (userId)
  email: string;                 // User email address
  name?: string;                 // Optional display name
  createdAt: string;             // ISO 8601 timestamp
  updatedAt: string;             // ISO 8601 timestamp
}
```

**Validation Rules**:
- `id`: Required, non-empty string
- `email`: Required, valid email format
- `createdAt`, `updatedAt`: Required, valid ISO 8601 format

**State Transitions**: N/A (read-only from user perspective)

---

### Dump

Represents a captured piece of information with AI-extracted entities.

```typescript
interface Dump {
  id: string;                    // Unique dump identifier
  userId: string;                // Owner's user ID
  status: DumpStatus;            // Current processing status
  category: string;              // Classification category
  rawContent: string;            // Original captured text
  notes?: string;                // User-added notes
  extractedEntities: ExtractedEntities; // AI-extracted data
  confidence: number;            // AI confidence score (0-1)
  createdAt: string;             // ISO 8601 timestamp
  updatedAt: string;             // ISO 8601 timestamp
  processedAt?: string;          // ISO 8601 timestamp when AI processed
}

type DumpStatus = 'Pending' | 'Processing' | 'Approved' | 'Rejected';
```

**Validation Rules**:
- `id`, `userId`: Required, non-empty strings
- `status`: Required, must be one of enum values
- `category`: Required, non-empty string
- `rawContent`: Required, non-empty string
- `confidence`: Required, number between 0 and 1
- `extractedEntities`: Required, must contain valid ExtractedEntities structure

**State Transitions**:
```
Pending → Processing → (Approved | Rejected)
                    ↑__________________|
                    (user can re-review)
```

**Derived Properties** (computed client-side):
```typescript
interface DumpDerived extends Dump {
  timeBucket: TimeBucket;        // Computed from extractedEntities.dates
  isOverdue: boolean;            // True if earliest date < today
  displayDate: Date;             // Earliest date from extractedEntities
  hasReminder: boolean;          // True if reminder entity exists
  hasTracking: boolean;          // True if tracking entity exists
}

type TimeBucket = 'overdue' | 'today' | 'tomorrow' | 'nextWeek' | 'nextMonth' | 'later';
```

---

### ExtractedEntities

AI-extracted structured data from a dump's raw content.

```typescript
interface ExtractedEntities {
  dates: DateEntity[];           // Extracted dates/deadlines
  reminders?: ReminderEntity[];  // Optional reminder data
  tracking?: TrackingEntity[];   // Optional package tracking
  urgencyLevel: UrgencyLevel;    // Computed urgency
  contentType: ContentType;      // Type of content
}

type UrgencyLevel = 'Low' | 'Medium' | 'High' | 'Critical';
type ContentType = 'Email' | 'Task' | 'Note' | 'Package' | 'Reminder' | 'Event' | 'Other';

interface DateEntity {
  date: string;                  // ISO 8601 date
  type: 'deadline' | 'event' | 'reminder' | 'generic';
  context?: string;              // Surrounding text for context
}

interface ReminderEntity {
  title: string;                 // Reminder title
  dueDate: string;               // ISO 8601 date
  priority?: 'Low' | 'Medium' | 'High';
  notes?: string;
}

interface TrackingEntity {
  carrier: string;               // Shipping carrier name
  trackingNumber: string;        // Tracking number
  estimatedDelivery?: string;    // ISO 8601 date
  status?: string;               // Current shipping status
}
```

**Validation Rules**:
- `dates`: Required, must contain at least one valid DateEntity
- `urgencyLevel`: Required, must be one of enum values
- `contentType`: Required, must be one of enum values
- `ReminderEntity.title`, `TrackingEntity.carrier`, `TrackingEntity.trackingNumber`: Required when parent exists

---

### Feedback

User-submitted feedback about the product.

```typescript
interface Feedback {
  id: string;                    // Unique feedback identifier
  userId: string;                // Submitter's user ID
  category: FeedbackCategory;    // Feedback type
  message: string;               // Feedback content
  rating: number;                // User rating (1-5)
  status: FeedbackStatus;        // Current status
  response?: string;             // Admin response (if any)
  createdAt: string;             // ISO 8601 timestamp
  updatedAt: string;             // ISO 8601 timestamp
}

type FeedbackCategory = 'Bug' | 'Feature Request' | 'Improvement' | 'Question' | 'Other';
type FeedbackStatus = 'Pending' | 'In Review' | 'Resolved' | 'Rejected';
```

**Validation Rules**:
- `id`, `userId`: Required, non-empty strings
- `category`: Required, must be one of enum values
- `message`: Required, minimum 10 characters
- `rating`: Required, integer between 1 and 5
- `status`: Required, must be one of enum values

**State Transitions**:
```
Pending → In Review → (Resolved | Rejected)
```

---

## UI-Specific Models

### SearchFilters

Represents the state of search filters.

```typescript
interface SearchFilters {
  query: string;                 // Natural language search query
  contentTypes: ContentType[];   // Selected content types
  categories: string[];          // Selected categories
  urgencyLevels: UrgencyLevel[]; // Selected urgency levels
  minConfidence: number;         // Minimum confidence (0-1)
  includeProcessing: boolean;    // Include items still processing
  dateFrom?: string;             // ISO 8601 date
  dateTo?: string;               // ISO 8601 date
}
```

**Default Values**:
```typescript
const defaultFilters: SearchFilters = {
  query: '',
  contentTypes: [],
  categories: [],
  urgencyLevels: [],
  minConfidence: 0,
  includeProcessing: false,
  dateFrom: undefined,
  dateTo: undefined,
};
```

---

### SearchResults

Response structure from search endpoint.

```typescript
interface SearchResults {
  dumps: Dump[];                 // Matching dumps
  total: number;                 // Total matches (for pagination)
  page: number;                  // Current page
  pageSize: number;              // Items per page
  hasMore: boolean;              // More results available
}
```

---

### TimeBucketGroup

Grouped dumps by time bucket for dashboard display.

```typescript
interface TimeBucketGroup {
  bucket: TimeBucket;            // Time bucket identifier
  label: string;                 // Display label
  dumps: DumpDerived[];          // Dumps in this bucket
  isExpanded: boolean;           // Expansion state (UI only)
  count: number;                 // Number of dumps
}
```

**Bucket Labels**:
```typescript
const bucketLabels: Record<TimeBucket, string> = {
  overdue: 'Overdue',
  today: 'Today',
  tomorrow: 'Tomorrow',
  nextWeek: 'Next Week',
  nextMonth: 'Next Month',
  later: 'Later',
};
```

---

### Toast

Notification toast for user feedback.

```typescript
interface Toast {
  id: string;                    // Unique toast identifier
  type: ToastType;               // Toast variant
  message: string;               // Toast content
  action?: ToastAction;          // Optional action button
  duration: number;              // Auto-dismiss time (ms)
}

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastAction {
  label: string;                 // Action button text
  onClick: () => void;           // Action handler
}
```

**Default Duration**: 5000ms (5 seconds)

---

### ModalState

State for managing modal dialogs.

```typescript
interface ModalState {
  isOpen: boolean;               // Modal visibility
  type: ModalType;               // Modal variant
  data?: any;                    // Modal-specific data
}

type ModalType = 'dumpDetail' | 'feedbackForm' | 'none';
```

---

## Relationships

```
User (1) ──── (∞) Dump
User (1) ──── (∞) Feedback

Dump (1) ──── (1) ExtractedEntities
ExtractedEntities (1) ──── (∞) DateEntity
ExtractedEntities (1) ──── (∞) ReminderEntity
ExtractedEntities (1) ──── (∞) TrackingEntity
```

---

## Data Flow

### Dashboard Load
```
1. GET /api/dumps?userId={userId} → Dump[]
2. Client computes DumpDerived properties
3. Client groups by TimeBucket
4. Render TimeBucketGroup components
```

### Search Flow
```
1. User enters query + filters
2. POST /api/search { query, filters, userId } → SearchResults
3. Render search result cards
4. Click card → Open DumpDetail modal
```

### Accept/Reject Flow
```
1. User edits dump in modal
2. Optimistic update: Update local state immediately
3. PATCH /api/dumps/:id { category, rawContent, notes, status }
4. On success: Keep optimistic update
5. On failure: Rollback + show error toast with retry
```

### Feedback Flow
```
1. User fills feedback form
2. POST /api/feedback { userId, category, message, rating }
3. Add to local feedback list optimistically
4. GET /api/feedback?userId={userId} → Feedback[]
5. Display with status badges
```

---

## Enum Values Reference

All enum values are sourced from backend API to maintain consistency (per research decision).

**Frontend References**:
```typescript
// These should be fetched from backend on app init
interface EnumValues {
  contentTypes: ContentType[];
  urgencyLevels: UrgencyLevel[];
  categories: string[];
  feedbackCategories: FeedbackCategory[];
  feedbackStatuses: FeedbackStatus[];
  dumpStatuses: DumpStatus[];
}
```

**Backend Endpoint** (assumed):
```
GET /api/metadata/enums → EnumValues
```

---

## Type Guards

Utility functions for runtime type checking:

```typescript
function isDump(obj: any): obj is Dump {
  return (
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.userId === 'string' &&
    typeof obj.status === 'string' &&
    typeof obj.category === 'string' &&
    typeof obj.rawContent === 'string' &&
    typeof obj.extractedEntities === 'object'
  );
}

function isValidTimeBucket(str: string): str is TimeBucket {
  return ['overdue', 'today', 'tomorrow', 'nextWeek', 'nextMonth', 'later'].includes(str);
}

function isValidDumpStatus(str: string): str is DumpStatus {
  return ['Pending', 'Processing', 'Approved', 'Rejected'].includes(str);
}
```

---

## Notes

- All dates use ISO 8601 format for consistency and timezone safety
- Confidence scores are normalized 0-1 (backend provides this)
- Client-side derived properties (timeBucket, isOverdue) are computed on-demand
- UI state (isExpanded, ModalState) is ephemeral and not persisted
- Backend is source of truth for enum values to prevent drift
