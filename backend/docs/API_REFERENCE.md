# API Reference - Clutter.AI Backend

**Version:** 1.0  
**Base URL:** `https://dumpster-spec-production.up.railway.app`  
**Last Updated:** December 3, 2025

---

## Table of Contents

1. [Health & System](#health--system)
2. [Authentication](#authentication)
3. [Users](#users)
4. [Dumps (Content)](#dumps-content)
5. [Search](#search)
6. [Reminders](#reminders)
7. [Reviews & Flagging](#reviews--flagging)
8. [Feedback](#feedback)
9. [Admin](#admin)
10. [Webhooks](#webhooks)
11. [Email](#email)
12. [Notifications (Testing)](#notifications-testing)

---

## Health & System

### Base Path: `/health`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/health` | Basic health check (uptime, timestamp) | No |
| `GET` | `/health/db` | Database connectivity check | No |
| `GET` | `/health/detailed` | Detailed system health (memory, database) | No |

### Base Path: `/` (Root)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/` | Welcome message | No |
| `POST` | `/admin/recreate-vector-index` | Recreate pgvector index | No |
| `GET` | `/admin/vector-index-info` | Get vector index information | No |
| `GET` | `/admin/vector-health` | Check vector search health | No |
| `POST` | `/admin/ensure-vector-index` | Ensure vector index exists | No |
| `POST` | `/admin/clean-dumps` | Delete all dumps (destructive) | No |
| `POST` | `/admin/test-claude` | Test Claude AI integration | No |
| `GET` | `/admin/env-check` | Check environment variables | No |

---

## Authentication

### Base Path: `/auth`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/auth/send-code` | Send verification code to phone number | No |
| `POST` | `/auth/login` | Login with phone number and verification code | No |
| `GET` | `/auth/profile` | Get authenticated user profile | Yes (JWT) |
| `PATCH` | `/auth/profile` | Update user profile (timezone, language, etc.) | Yes (JWT) |
| `POST` | `/auth/link-chat` | Link Telegram/WhatsApp chat ID to user | Yes (JWT) |

**Request Examples:**

```json
// POST /auth/send-code
{
  "phone_number": "+351964938153"
}

// POST /auth/login
{
  "phone_number": "+351964938153",
  "verification_code": "123456"
}

// PATCH /auth/profile
{
  "timezone": "Europe/Lisbon",
  "language": "pt",
  "digest_time": "09:00"
}

// POST /auth/link-chat
{
  "chat_id": "123456789",
  "platform": "telegram" // or "whatsapp"
}
```

---

## Users

### Base Path: `/users`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/users` | Create new user | No |
| `GET` | `/users` | List all users (paginated) | No |
| `GET` | `/users/search` | Search users by query | No |
| `GET` | `/users/active` | Get active users | No |
| `GET` | `/users/:id` | Get user by ID | No |
| `GET` | `/users/:id/stats` | Get user statistics | No |
| `PATCH` | `/users/:id` | Update user information | No |
| `PATCH` | `/users/:id/link-chat` | Link chat ID (Telegram/WhatsApp) | No |
| `DELETE` | `/users/:id` | Delete user | No |

**Request Examples:**

```json
// POST /users
{
  "phone_number": "+351964938153",
  "timezone": "Europe/Lisbon",
  "language": "pt"
}

// PATCH /users/:id/link-chat
{
  "chat_id": "123456789",
  "platform": "telegram"
}
```

---

## Dumps (Content)

### Base Path: `/api/dumps`

Content items captured from users (text, voice, images, documents).

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/dumps` | Create new dump (basic) | No |
| `POST` | `/api/dumps/enhanced` | Create dump with enhanced AI processing | No |
| `POST` | `/api/dumps/upload` | Upload file and create dump | No |
| `GET` | `/api/dumps/user/:userId` | Get all dumps for a user (paginated) | No |
| `GET` | `/api/dumps/user/:userId/stats` | Get user dump statistics | No |
| `GET` | `/api/dumps/user/:userId/recent` | Get recent dumps for a user | No |
| `GET` | `/api/dumps/:id` | Get single dump by ID | No |
| `PATCH` | `/api/dumps/:id` | Update dump (partial update) | No |
| `DELETE` | `/api/dumps/:id` | Delete dump | No |
| `POST` | `/api/dumps/generate-vectors` | Generate embeddings for dumps | No |
| `POST` | `/api/dumps/screenshot` | Process screenshot with OCR | No |
| `POST` | `/api/dumps/voice` | Process voice message | No |
| `POST` | `/api/dumps/document` | Process document (PDF, etc.) | No |

**Request Examples:**

```json
// POST /api/dumps/enhanced
{
  "userId": "uuid-here",
  "content": "Reunião com cliente amanhã às 15h",
  "contentType": "text",
  "metadata": {
    "source": "telegram",
    "chatId": "123456789"
  }
}

// GET /api/dumps/user/:userId/recent?limit=10
// Query parameters:
// - limit: number of recent dumps to return (default: 5, max: 100)
// Response includes related category and user data

// PATCH /api/dumps/:id
{
  "raw_content": "Updated content text",
  "ai_summary": "Updated summary",
  "category": "work",
  "extracted_entities": {
    "dates": ["2025-12-01"],
    "people": ["John Doe"]
  },
  "metadata": {
    "custom_field": "value"
  }
}

// POST /api/dumps/screenshot (multipart/form-data)
{
  "userId": "uuid-here",
  "file": <image file>,
  "caption": "Optional caption"
}
```

---

## Search

### Base Path: `/api/search`

Semantic search with pgvector and AI-enhanced queries.

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/search` | Semantic search across user's dumps | No |
| `GET` | `/api/search/quick` | Quick search suggestions | No |
| `GET` | `/api/search/suggestions` | Get search suggestions | No |
| `GET` | `/api/search/analytics` | Search analytics and insights | No |
| `POST` | `/api/search/reindex` | Reindex all dumps for search | No |
| `GET` | `/api/search/health` | Search system health check | No |
| `GET` | `/api/search/categories/:categoryId` | Search within category | No |
| `GET` | `/api/search/content-types/:contentType` | Search by content type | No |
| `POST` | `/api/search/feedback` | Submit search result feedback | No |

**Request Examples:**

```json
// POST /api/search
{
  "userId": "uuid-here",
  "query": "reunião com cliente",
  "limit": 10,
  "offset": 0,
  "filters": {
    "category": "work",
    "dateRange": {
      "start": "2025-01-01",
      "end": "2025-12-31"
    }
  }
}
```

---

## Reminders

### Base Path: `/api/reminders`

Manage time-based reminders extracted from content.

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/reminders` | Create new reminder | No |
| `GET` | `/api/reminders` | Get all reminders (filtered) | No |
| `GET` | `/api/reminders/upcoming` | Get upcoming reminders | No |
| `GET` | `/api/reminders/stats` | Get reminder statistics | No |
| `GET` | `/api/reminders/:id` | Get single reminder | No |
| `PUT` | `/api/reminders/:id` | Update reminder | No |
| `POST` | `/api/reminders/:id/snooze` | Snooze reminder | No |
| `POST` | `/api/reminders/:id/dismiss` | Dismiss reminder | No |
| `POST` | `/api/reminders/:id/mark-sent` | Mark reminder as sent | No |
| `DELETE` | `/api/reminders/:id` | Delete reminder | No |

**Request Examples:**

```json
// POST /api/reminders
{
  "userId": "uuid-here",
  "dumpId": "dump-uuid",
  "reminder_time": "2025-12-01T15:00:00Z",
  "notification_sent": false,
  "status": "pending"
}

// POST /api/reminders/:id/snooze
{
  "snooze_until": "2025-12-01T16:00:00Z"
}
```

---

## Reviews & Flagging

### Base Path: `/reviews`

Flag content for review due to low confidence or errors.

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/reviews/flag` | Flag a dump for review | No |
| `GET` | `/reviews/user/:userId` | Get all reviews for user | No |
| `GET` | `/reviews/pending` | Get pending reviews | No |
| `PUT` | `/reviews/:reviewId/resolve` | Resolve a review | No |
| `GET` | `/reviews/stats` | Get review statistics | No |
| `POST` | `/reviews/:dumpId/auto-check` | Auto-check dump quality | No |
| `GET` | `/reviews/flags` | Get all flags | No |

### Base Path: `/review`

Alternative review endpoints (legacy).

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/review/flagged` | Get all flagged dumps | No |
| `GET` | `/review/flagged/:dumpId` | Get flagged dump details | No |
| `POST` | `/review/:dumpId/approve` | Approve flagged dump | No |
| `POST` | `/review/:dumpId/reject` | Reject and fix flagged dump | No |

**Request Examples:**

```json
// POST /reviews/flag
{
  "dumpId": "uuid-here",
  "userId": "uuid-here",
  "reason": "Low AI confidence",
  "confidence_score": 0.45,
  "metadata": {
    "processingIssue": "Entity extraction failed"
  }
}
```

---

## Feedback

### Base Path: `/feedback`

User feedback and feature requests.

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/feedback/submit` | Submit new feedback | No |
| `GET` | `/feedback/:feedbackId` | Get feedback by ID | No |
| `GET` | `/feedback/user/:userId` | Get user's feedback | No |
| `GET` | `/feedback` | List all feedback (filtered) | No |
| `PUT` | `/feedback/:feedbackId/status` | Update feedback status | No |
| `POST` | `/feedback/:feedbackId/notes` | Add admin notes to feedback | No |
| `POST` | `/feedback/:feedbackId/upvote` | Upvote feedback | No |
| `GET` | `/feedback/stats/overview` | Get feedback statistics | No |
| `GET` | `/feedback/options/metadata` | Get feedback metadata options | No |

**Request Examples:**

```json
// POST /feedback/submit
{
  "userId": "uuid-here",
  "type": "bug", // "bug", "feature", "improvement"
  "severity": "medium", // "low", "medium", "high", "critical"
  "title": "Search not working for voice messages",
  "description": "When I search for content from voice messages...",
  "context": {
    "platform": "telegram",
    "feature": "search"
  }
}
```

---

## Admin

### Base Path: `/admin`

Administrative analytics and management. **All endpoints require JWT authentication.**

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/admin/analytics/system` | System-wide analytics | Yes (JWT) |
| `GET` | `/admin/analytics/search` | Search analytics | Yes (JWT) |
| `GET` | `/admin/analytics/ai` | AI processing analytics | Yes (JWT) |
| `GET` | `/admin/analytics/users` | User analytics | Yes (JWT) |
| `GET` | `/admin/dumps` | List all dumps (admin view) | Yes (JWT) |
| `GET` | `/admin/categories` | Get all categories | Yes (JWT) |

**Query Parameters for `/admin/dumps`:**
- `page` (default: 1) - Page number
- `limit` (default: 50) - Items per page
- `search` (optional) - Search term for filtering dumps

---

## Webhooks

### Telegram Bot

**Base Path:** `/api/webhooks/telegram`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/webhooks/telegram` | Receive Telegram webhook updates | No |

**Purpose:** Handles incoming messages from Telegram Bot API.

**Supported Message Types:**
- **Text messages**: Direct text input from users
- **Voice messages**: Audio files (transcribed automatically)
- **Photos**: Images with optional captions (OCR processed)
- **Documents**: Files with optional captions
- **Edited messages**: Updates to previously sent messages

**Supported Commands:**
- `/start` - Welcome message and registration prompt
- `/help` - Show available commands
- `/recent` - Show recent dumps (default: 5)
- `/upcoming` - Show upcoming reminders (default: next 24h)
- `/next` - Alias for `/upcoming`
- `/search <query>` - Semantic search across dumps
- `/stats` - Show user statistics
- `/digest` - Get daily digest on-demand

**Auto-Registration:**
- Detects phone numbers in user messages
- Automatically registers new users when phone number is detected
- Links Telegram chat ID to user account

**Request Format:**
```json
{
  "update_id": 123456789,
  "message": {
    "message_id": 1,
    "from": {
      "id": 123456789,
      "first_name": "John",
      "username": "johndoe"
    },
    "chat": {
      "id": 123456789,
      "type": "private"
    },
    "date": 1701234567,
    "text": "Example message"
  }
}
```

### WhatsApp Bot

**Base Path:** `/api/webhooks/whatsapp`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/webhooks/whatsapp` | Receive Twilio WhatsApp webhook | No |

**Purpose:** Handles incoming messages from Twilio WhatsApp API.

**Supported Message Types:**
- **Text messages**: Direct text input with command support
- **Voice messages**: Audio files (transcribed)
- **Photos**: Images with captions (OCR processed)
- **Documents**: Files with captions

**Supported Commands:**
- `help` - Show available commands
- `recent` - Show recent dumps (default: 5)
- `upcoming` - Show upcoming reminders (default: next 24h)
- `next` - Alias for `upcoming`
- `search <query>` - Semantic search across dumps
- `stats` - Show user statistics
- `digest` - Get daily digest on-demand

**Auto-Registration:**
- Uses phone number from Twilio webhook payload (`From` field)
- Format: `whatsapp:+351964938153`
- Automatically creates user account on first message
- No manual phone number entry required

**Request Format (Twilio):**
```json
{
  "From": "whatsapp:+351964938153",
  "To": "whatsapp:+14155238886",
  "Body": "Example message",
  "MessageSid": "SMxxxxxxxxx",
  "AccountSid": "ACxxxxxxxxx",
  "NumMedia": "0"
}
```

**Media Handling:**
- `NumMedia` > 0 indicates media attachments
- `MediaUrl0`, `MediaContentType0` for first media item
- Automatically processes images, audio, and documents

---

## Email

### Base Path: `/api/email`

Email ingestion via webhooks from SendGrid, Mailgun, etc.

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/email/webhook/inbound` | Generic inbound email webhook | No |
| `POST` | `/api/email/webhook/sendgrid` | SendGrid-specific webhook | No |
| `POST` | `/api/email/webhook/mailgun` | Mailgun-specific webhook | No |
| `POST` | `/api/email/webhook/health` | Email webhook health check | No |

**Purpose:** Process emails sent to the system and convert them into dumps.

**Features:**
- Automatic user identification via email address
- HTML and plain text parsing
- Attachment processing (images, PDFs, documents)
- Thread detection and conversation tracking
- Subject line and body extraction

**Supported Email Providers:**
- **SendGrid**: Inbound Parse Webhook
- **Mailgun**: Routes and Webhooks
- **Generic**: Standard email webhook format

---

## Notifications (Testing)

### Base Path: `/test/notifications`

Testing endpoints for notification system (development only).

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/test/notifications/digest/morning/:userId` | Test morning digest | No |
| `POST` | `/test/notifications/digest/evening/:userId` | Test evening digest | No |
| `POST` | `/test/notifications/reminders/check` | Test reminder checking | No |
| `POST` | `/test/notifications/send/:userId` | Send test notification | No |
| `GET` | `/test/notifications/cron/status` | Get cron job status | No |
| `GET` | `/test/notifications/config` | Get notification configuration | No |

---

## Common Response Formats

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error information",
  "statusCode": 400
}
```

### Paginated Response
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

Get a JWT token by calling `POST /auth/login` with valid credentials.

---

## Rate Limiting

- **Webhooks:** No rate limiting (trusted sources)
- **Public API:** 100 requests/minute per IP
- **Authenticated API:** 1000 requests/minute per user

---

## Webhook Security

### Telegram
- Validates webhook signature (optional)
- Filters by allowed chat IDs

### WhatsApp (Twilio)
- Validates Twilio signature
- Checks account SID

### Email
- Validates webhook signatures from SendGrid/Mailgun
- Checks sender domains

---

## Content Types Supported

### Dumps
- **text**: Plain text messages
- **voice**: Audio/voice messages (transcribed)
- **image**: Photos, screenshots (OCR processed)
- **document**: PDFs, Word docs, etc.

### Search
- Semantic search using pgvector
- Full-text search
- Category filtering
- Date range filtering

---

## AI Features

### Powered by Claude AI (Anthropic)

1. **Content Analysis**
   - Categorization
   - Entity extraction (dates, amounts, people, places)
   - Sentiment analysis
   - Urgency detection
   - Action item identification

2. **Search Enhancement**
   - Query expansion
   - Semantic understanding
   - Context-aware results

3. **Document Processing**
   - OCR for images/screenshots
   - PDF text extraction
   - Handwriting recognition

4. **Voice Processing**
   - Speech-to-text transcription
   - Content summarization

---

## Database

- **PostgreSQL 15+** with **pgvector** extension
- Vector embeddings for semantic search
- Full-text search with tsvector
- Automatic backup and replication

---

## Deployment

- **Platform:** Railway
- **URL:** https://dumpster-spec-production.up.railway.app
- **Environment:** Production
- **Region:** US West

---

## Support & Contact

For API support or questions:
- **Documentation:** This file
- **Issues:** GitHub repository issues
- **Email:** (To be configured)

---

**Last Updated:** December 3, 2025  
**API Version:** 1.0
