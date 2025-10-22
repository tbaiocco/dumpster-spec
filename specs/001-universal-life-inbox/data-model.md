# Data Model Design

**Feature**: Clutter.AI Universal Life Inbox  
**Date**: October 22, 2025  
**Phase**: 1 - Data Model and Relationships

## Entity Relationship Overview

```
User 1:M Dump
User 1:M Reminder  
User 1:M SearchQuery
Dump 1:M Entity
Dump 1:M Reminder
Dump 1:1 ProcessingStatus (embedded)
Category 1:M Dump
```

## Core Entities

### User
Represents individual using the system with messaging account linkage and preferences.

**Table**: `users`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique user identifier |
| phone_number | VARCHAR(20) | UNIQUE, NOT NULL | Phone number for verification |
| verified_at | TIMESTAMP | NULL | Phone verification timestamp |
| chat_id_telegram | VARCHAR(50) | UNIQUE, NULL | Telegram chat identifier |
| chat_id_whatsapp | VARCHAR(50) | UNIQUE, NULL | WhatsApp chat identifier |
| timezone | VARCHAR(50) | DEFAULT 'UTC' | User timezone for reminders |
| language | VARCHAR(10) | DEFAULT 'en' | Preferred language |
| digest_time | TIME | DEFAULT '09:00' | Daily digest delivery time |
| notification_preferences | JSONB | DEFAULT '{}' | Notification settings |
| created_at | TIMESTAMP | DEFAULT NOW() | Account creation time |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last profile update |

**Validation Rules**:
- Phone number must be valid E.164 format
- At least one chat_id (telegram or whatsapp) required after verification
- Timezone must be valid IANA timezone string
- Language must be supported locale code (en, es, fr, de)

**Indexes**:
- `idx_users_phone` on phone_number
- `idx_users_telegram` on chat_id_telegram
- `idx_users_whatsapp` on chat_id_whatsapp

### Dump
Core content unit containing original user input and AI analysis results.

**Table**: `dumps`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique dump identifier |
| user_id | UUID | FOREIGN KEY users(id) | Owner reference |
| raw_content | TEXT | NOT NULL | Original user input |
| content_type | ENUM | NOT NULL | text, voice, image, email |
| media_url | VARCHAR(500) | NULL | Supabase storage URL for media |
| ai_summary | TEXT | NULL | AI-generated summary |
| ai_confidence | DECIMAL(3,2) | CHECK 0-1 | AI processing confidence |
| category_id | UUID | FOREIGN KEY categories(id) | AI-assigned category |
| urgency_level | INTEGER | CHECK 1-5 | Urgency rating (1=low, 5=urgent) |
| processing_status | ENUM | DEFAULT 'received' | received, analyzing, processed, failed, needs_review, completed |
| extracted_entities | JSONB | DEFAULT '[]' | Structured entity data |
| created_at | TIMESTAMP | DEFAULT NOW() | Dump creation time |
| processed_at | TIMESTAMP | NULL | AI processing completion |
| completed_at | TIMESTAMP | NULL | User completion time |

**Content Type Values**: 'text', 'voice', 'image', 'email'
**Processing Status Values**: 'received', 'analyzing', 'processed', 'failed', 'needs_review', 'completed'

**Validation Rules**:
- AI confidence required when processing_status = 'processed'
- Media URL required for voice/image content types
- Category assignment required for processed dumps
- Urgency level 1-5 scale (1=low priority, 5=urgent)

**Indexes**:
- `idx_dumps_user_created` on (user_id, created_at DESC)
- `idx_dumps_status` on processing_status
- `idx_dumps_category` on category_id
- `idx_dumps_urgency_pending` on (urgency_level, processing_status) WHERE processing_status != 'completed'

### Category
Classification system for different types of dumped content.

**Table**: `categories`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Category identifier |
| name | VARCHAR(50) | UNIQUE, NOT NULL | Category name |
| description | TEXT | NULL | Category description |
| color_hex | VARCHAR(7) | NULL | UI color code |
| reminder_default | BOOLEAN | DEFAULT false | Auto-create reminders |
| sort_order | INTEGER | DEFAULT 0 | Display ordering |
| created_at | TIMESTAMP | DEFAULT NOW() | Category creation |

**Pre-seeded Categories**:
- bill: Financial obligations and payments
- reminder: Personal tasks and commitments  
- tracking: Package deliveries and shipments
- idea: Creative thoughts and inspiration
- task: Work and project actions
- information: Reference material and facts
- social_commitment: Meetings and social events

**Validation Rules**:
- Name must be lowercase, underscore-separated
- Color hex must be valid 7-character hex code including #
- Sort order used for consistent UI presentation

### Reminder
Time-based notifications linked to dumps with scheduling and completion tracking.

**Table**: `reminders`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Reminder identifier |
| user_id | UUID | FOREIGN KEY users(id) | Reminder owner |
| dump_id | UUID | FOREIGN KEY dumps(id) | Associated content |
| reminder_text | TEXT | NOT NULL | Notification message |
| scheduled_for | TIMESTAMP | NOT NULL | Delivery time (UTC) |
| delivered_at | TIMESTAMP | NULL | Actual delivery time |
| completed_at | TIMESTAMP | NULL | User completion time |
| reminder_type | ENUM | DEFAULT 'manual' | manual, auto, digest, proactive |
| snooze_until | TIMESTAMP | NULL | Postponed delivery time |
| created_at | TIMESTAMP | DEFAULT NOW() | Reminder creation |

**Reminder Type Values**: 'manual', 'auto', 'digest', 'proactive'

**Validation Rules**:
- Scheduled time must be in future when created
- Delivered reminders cannot be rescheduled
- Snooze time must be after original scheduled time

**Indexes**:
- `idx_reminders_scheduled` on scheduled_for WHERE completed_at IS NULL
- `idx_reminders_user_pending` on (user_id, scheduled_for) WHERE completed_at IS NULL
- `idx_reminders_dump` on dump_id

### Entity
Extracted information from dumps with confidence scoring and type classification.

**Table**: `entities`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Entity identifier |
| dump_id | UUID | FOREIGN KEY dumps(id) | Source dump |
| entity_type | ENUM | NOT NULL | Type of extracted entity |
| entity_value | TEXT | NOT NULL | Extracted value |
| confidence_score | DECIMAL(3,2) | CHECK 0-1 | Extraction confidence |
| metadata | JSONB | DEFAULT '{}' | Type-specific data |
| created_at | TIMESTAMP | DEFAULT NOW() | Extraction time |

**Entity Type Values**: 'date', 'amount', 'name', 'tracking_number', 'phone', 'email', 'location', 'deadline'

**Metadata Examples**:
- date: `{"parsed_date": "2025-10-25", "format": "relative", "original": "tomorrow"}`
- amount: `{"currency": "USD", "numeric_value": 180.00, "original": "$180"}`
- tracking_number: `{"carrier": "DHL", "status": "in_transit", "last_checked": "2025-10-22T10:00:00Z"}`

**Validation Rules**:
- Confidence score required and between 0.0-1.0
- Metadata structure varies by entity_type
- Entity value cannot be empty

**Indexes**:
- `idx_entities_dump` on dump_id
- `idx_entities_type_confidence` on (entity_type, confidence_score DESC)

### SearchQuery
User search requests with query enhancement and result tracking for analytics.

**Table**: `search_queries`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Query identifier |
| user_id | UUID | FOREIGN KEY users(id) | Query owner |
| original_query | TEXT | NOT NULL | User's search input |
| enhanced_query | TEXT | NULL | AI-enhanced query |
| result_count | INTEGER | DEFAULT 0 | Number of results |
| clicked_dump_ids | UUID[] | DEFAULT '{}' | Results user clicked |
| search_vector | VECTOR(1536) | NULL | Embedding for semantic search |
| created_at | TIMESTAMP | DEFAULT NOW() | Query time |

**Validation Rules**:
- Original query cannot be empty
- Result count must be non-negative
- Clicked dump IDs must reference valid dumps

**Indexes**:
- `idx_search_user_time` on (user_id, created_at DESC)
- `idx_search_vector` using ivfflat(search_vector) FOR SEMANTIC SEARCH

## Relationships and Constraints

### Foreign Key Constraints
```sql
ALTER TABLE dumps ADD CONSTRAINT fk_dumps_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE dumps ADD CONSTRAINT fk_dumps_category 
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;

ALTER TABLE reminders ADD CONSTRAINT fk_reminders_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE reminders ADD CONSTRAINT fk_reminders_dump 
    FOREIGN KEY (dump_id) REFERENCES dumps(id) ON DELETE CASCADE;

ALTER TABLE entities ADD CONSTRAINT fk_entities_dump 
    FOREIGN KEY (dump_id) REFERENCES dumps(id) ON DELETE CASCADE;

ALTER TABLE search_queries ADD CONSTRAINT fk_search_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
```

### Business Logic Constraints
```sql
-- Ensure AI confidence thresholds
ALTER TABLE dumps ADD CONSTRAINT chk_confidence_range 
    CHECK (ai_confidence >= 0.0 AND ai_confidence <= 1.0);

-- Ensure urgency levels
ALTER TABLE dumps ADD CONSTRAINT chk_urgency_range 
    CHECK (urgency_level >= 1 AND urgency_level <= 5);

-- Ensure entity confidence
ALTER TABLE entities ADD CONSTRAINT chk_entity_confidence 
    CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0);

-- Prevent scheduling reminders in the past
ALTER TABLE reminders ADD CONSTRAINT chk_future_schedule 
    CHECK (scheduled_for > created_at);
```

## State Transitions

### Dump Processing Lifecycle
```
received → analyzing → [processed | failed | needs_review]
processed → completed (user action)
failed → analyzing (retry)
needs_review → analyzing (after manual correction)
```

### Reminder Lifecycle  
```
created → scheduled → delivered → [completed | snoozed]
snoozed → scheduled (when snooze expires)
```

## Semantic Search Schema

### Vector Embeddings
- **search_queries.search_vector**: User query embeddings (1536 dimensions for OpenAI)
- **dumps.content_vector**: Content embeddings for semantic similarity (added via migration)

### pgvector Configuration
```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create vector column for semantic search
ALTER TABLE dumps ADD COLUMN content_vector VECTOR(1536);

-- Create index for fast similarity search
CREATE INDEX idx_dumps_content_vector ON dumps 
    USING ivfflat (content_vector vector_cosine_ops) 
    WITH (lists = 100);

-- Similarity search query example
SELECT d.*, (d.content_vector <=> query_vector) as similarity
FROM dumps d 
WHERE d.user_id = $1 
ORDER BY d.content_vector <=> $2 
LIMIT 10;
```

## Performance Optimization

### Partitioning Strategy
```sql
-- Partition dumps by creation month for performance
CREATE TABLE dumps_y2025m10 PARTITION OF dumps
    FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

-- Monthly partitions for better query performance and maintenance
```

### Archival Strategy
- Archive completed dumps older than 2 years
- Maintain search index on archived data
- User-controlled retention policies via settings

This data model supports all functional requirements while maintaining performance and scalability for the target user base of 1000+ users with 10k+ daily dumps.