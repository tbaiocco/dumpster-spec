# Data Model Design

**Feature**: Clutter.AI Universal Life Inbox  
**Date**: October 22, 2025  
**Phase**: 1 - Data Model and Relationships

## Entity Relationship Overview

```
User 1:M Dump
User 1:M Reminder  
Dump 1:M Reminder
Category 1:M Dump
```

**Simplified MVP Model**: Removed SearchQuery entity (analytics premature for MVP) and Entity table (extracted data stored as JSONB in dumps.extracted_entities for simplicity).

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
| ai_confidence | INTEGER | CHECK 1-5 | AI processing confidence (simplified) |
| category_id | UUID | FOREIGN KEY categories(id) | AI-assigned category |
| urgency_level | INTEGER | CHECK 1-5 | Urgency rating (1=low, 5=urgent) |
| processing_status | ENUM | DEFAULT 'received' | received, processing, completed, failed |
| extracted_entities | JSONB | DEFAULT '{}' | Simplified entity storage |
| content_vector | VECTOR(1536) | NULL | Semantic search embedding |
| created_at | TIMESTAMP | DEFAULT NOW() | Dump creation time |
| processed_at | TIMESTAMP | NULL | AI processing completion |

**Content Type Values**: 'text', 'voice', 'image', 'email'
**Processing Status Values**: 'received', 'processing', 'completed', 'failed' (simplified from 6 to 4 states)

**Simplified Changes**:
- AI confidence changed to 1-5 integer scale (not decimal precision)
- Processing status simplified to 4 states instead of 6
- Entity extraction stored as JSONB instead of separate table
- Single content_vector for semantic search

**Validation Rules**:
- AI confidence required when processing_status = 'completed'
- Media URL required for voice/image content types
- Category assignment required for processed dumps
- Urgency level 1-5 scale (1=low priority, 5=urgent)

**Indexes**:
- `idx_dumps_user_created` on (user_id, created_at DESC)
- `idx_dumps_status` on processing_status
- `idx_dumps_category` on category_id
- `idx_dumps_content_vector` using ivfflat(content_vector vector_cosine_ops)

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
Time-based notifications linked to dumps with simplified scheduling.

**Table**: `reminders`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Reminder identifier |
| user_id | UUID | FOREIGN KEY users(id) | Reminder owner |
| dump_id | UUID | FOREIGN KEY dumps(id) | Associated content |
| reminder_text | TEXT | NOT NULL | Notification message |
| scheduled_for | TIMESTAMP | NOT NULL | Delivery time (UTC) |
| completed_at | TIMESTAMP | NULL | User completion time |
| created_at | TIMESTAMP | DEFAULT NOW() | Reminder creation |

**Simplified Changes**:
- Removed reminder_type enum (unnecessary complexity)
- Removed delivered_at tracking (simpler state model)
- Removed snooze functionality (can add later if needed)

**Validation Rules**:
- Scheduled time must be in future when created

**Indexes**:
- `idx_reminders_scheduled` on scheduled_for WHERE completed_at IS NULL
- `idx_reminders_user_pending` on (user_id, scheduled_for) WHERE completed_at IS NULL

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
```

### Business Logic Constraints
```sql
-- Ensure AI confidence thresholds (simplified to 1-5)
ALTER TABLE dumps ADD CONSTRAINT chk_confidence_range 
    CHECK (ai_confidence >= 1 AND ai_confidence <= 5);

-- Ensure urgency levels
ALTER TABLE dumps ADD CONSTRAINT chk_urgency_range 
    CHECK (urgency_level >= 1 AND urgency_level <= 5);

-- Prevent scheduling reminders in the past
ALTER TABLE reminders ADD CONSTRAINT chk_future_schedule 
    CHECK (scheduled_for > created_at);
```

## State Transitions

### Dump Processing Lifecycle (Simplified)
```
received → processing → [completed | failed]
failed → processing (retry)
```

### Reminder Lifecycle (Simplified)
```
created → scheduled → completed
```

## Semantic Search Schema

### Vector Embeddings
- **dumps.content_vector**: Content embeddings for semantic similarity (1536 dimensions for OpenAI)

### pgvector Configuration
```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Vector column already included in dumps table schema above

-- Create index for fast similarity search
CREATE INDEX idx_dumps_content_vector ON dumps 
    USING ivfflat (content_vector vector_cosine_ops) 
    WITH (lists = 100);

-- Similarity search query example
SELECT d.*, (d.content_vector <=> $2) as similarity
FROM dumps d 
WHERE d.user_id = $1 
ORDER BY d.content_vector <=> $2 
LIMIT 10;
```

**Simplified MVP Data Model**: Removed premature optimizations (SearchQuery entity, Entity table, complex state machines, partitioning) while maintaining core functionality. Focus on simple, working solution that can be enhanced later.