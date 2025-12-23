# API Reference - Clutter.AI Backend

**Version:** 1.1  
**Base URL:** `https://api.theclutter.app`  
**Last Updated:** December 19, 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Health & System](#health--system)
4. [Users](#users)
5. [Dumps (Content)](#dumps-content)
6. [Search](#search)
7. [Reminders](#reminders)
8. [Tracking](#tracking)
9. [Review & Moderation](#review--moderation)
10. [Feedback](#feedback)
11. [Admin Analytics](#admin-analytics)
12. [Email Integration](#email-integration)
13. [Bot Webhooks](#bot-webhooks)
14. [Common Patterns](#common-patterns)

---

## Overview

The Clutter.AI API provides a comprehensive platform for capturing, organizing, and retrieving personal information through multiple channels (Telegram, WhatsApp, Email). The API uses AI-powered processing to extract entities, categorize content, and enable semantic search.

### Key Features
- 🤖 AI-powered content analysis with Claude
- 🔍 Semantic search with pgvector
- 📱 Multi-platform support (Telegram, WhatsApp, Email)
- 🗂️ Automatic categorization and entity extraction
- ⏰ Intelligent reminder detection
- 📦 Tracking system for packages, subscriptions, etc.
- 📊 Comprehensive analytics

---

## Authentication

### JWT-Based Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Base Path: `/auth`

### Endpoints Overview

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | [`/auth/send-code`](#post-authsend-code) | Send verification code to phone number | No |
| `POST` | [`/auth/login`](#post-authlogin) | Login with phone number and verification code | No |
| `GET` | [`/auth/profile`](#get-authprofile) | Get authenticated user profile | Yes (JWT) |
| `PATCH` | [`/auth/profile`](#patch-authprofile) | Update user profile settings | Yes (JWT) |
| `POST` | [`/auth/link-chat`](#post-authlink-chat) | Link Telegram/WhatsApp chat ID to user account | Yes (JWT) |

---

#### POST `/auth/send-code`
Send a verification code to user's phone number.

**Request Body:**
```json
{
  "phone_number": "+351964938153"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Verification code sent successfully"
}
```

**Notes:**
- Phone number must be in E.164 format
- Code expires after 10 minutes
- In development, code is logged to console

---

#### POST `/auth/login`
Login with phone number and verification code.

**Request Body:**
```json
{
  "phone_number": "+351964938153",
  "verification_code": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "phone_number": "+351964938153",
      "verified_at": "2025-12-19T10:00:00Z",
      "chat_id_telegram": "123456789",
      "chat_id_whatsapp": null,
      "timezone": "Europe/Lisbon",
      "language": "pt",
      "role": "USER"
    }
  }
}
```

---

#### GET `/auth/profile`
Get authenticated user's profile.

**Auth Required:** Yes (JWT)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "phone_number": "+351964938153",
    "email": "user@example.com",
    "timezone": "Europe/Lisbon",
    "language": "pt",
    "role": "USER",
    "digest_time": "09:00",
    "notification_preferences": {},
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

---

#### PATCH `/auth/profile`
Update user profile settings.

**Auth Required:** Yes (JWT)

**Request Body:**
```json
{
  "timezone": "Europe/Lisbon",
  "language": "pt",
  "digest_time": "09:00",
  "notification_preferences": {
    "email": true,
    "telegram": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "timezone": "Europe/Lisbon",
    "language": "pt",
    "digest_time": "09:00"
  }
}
```

---

#### POST `/auth/link-chat`
Link Telegram or WhatsApp chat ID to user account.

**Auth Required:** Yes (JWT)

**Request Body:**
```json
{
  "chat_id": "123456789",
  "platform": "telegram"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "chat_id_telegram": "123456789",
    "chat_id_whatsapp": null
  }
}
```

---

## Health & System

### Endpoints Overview

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | [`/health`](#get-health) | Basic health check | No |
| `GET` | [`/health/db`](#get-healthdb) | Database connectivity check | No |
| `GET` | [`/health/detailed`](#get-healthdetailed) | Detailed system health with memory and database metrics | No |
| `GET` | [`/`](#get-) | Root endpoint - welcome message | No |
| `POST` | [`/admin/recreate-vector-index`](#post-adminrecreate-vector-index) | Recreate pgvector index for semantic search | No |
| `GET` | [`/admin/vector-health`](#get-adminvector-health) | Check vector search system health | No |
| `POST` | [`/admin/test-claude`](#post-admintest-claude) | Test Claude AI integration | No |
| `GET` | [`/admin/env-check`](#get-adminenv-check) | Check environment variables configuration | No |

---

### GET `/health`
Basic health check.

**Auth Required:** No

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-19T10:00:00Z",
  "uptime": 12345
}
```

---

### GET `/health/db`
Database connectivity check.

**Auth Required:** No

**Response:**
```json
{
  "status": "ok",
  "database": "connected",
  "latency": 15
}
```

---

### GET `/health/detailed`
Detailed system health with memory and database metrics.

**Auth Required:** No

**Response:**
```json
{
  "status": "ok",
  "uptime": 12345,
  "memory": {
    "used": 123456789,
    "total": 987654321
  },
  "database": {
    "connected": true,
    "latency": 15
  }
}
```

---

### GET `/`
Root endpoint - welcome message.

**Auth Required:** No

**Response:**
```json
"Welcome to Clutter.AI API v1.1"
```

---

### POST `/admin/recreate-vector-index`
Recreate pgvector index for semantic search.

**Auth Required:** No

**Response:**
```json
{
  "success": true,
  "message": "Vector index recreated successfully"
}
```

---

### GET `/admin/vector-health`
Check vector search system health.

**Auth Required:** No

**Response:**
```json
{
  "success": true,
  "data": {
    "indexExists": true,
    "totalVectors": 1234,
    "dimension": 1536
  }
}
```

---

### POST `/admin/test-claude`
Test Claude AI integration.

**Auth Required:** No

**Request Body:**
```json
{
  "text": "Meeting with client tomorrow at 3pm"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": "Client meeting scheduled",
    "category": "work",
    "confidence": 0.95,
    "entities": {
      "dates": ["2025-12-20"],
      "times": ["15:00"]
    }
  }
}
```

---

### GET `/admin/env-check`
Check environment variables configuration.

**Auth Required:** No

**Response:**
```json
{
  "success": true,
  "data": {
    "DATABASE_URL": "configured",
    "CLAUDE_API_KEY": "configured",
    "JWT_SECRET": "configured"
  }
}
```

---

## Users

### Base Path: `/users`

### Endpoints Overview

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | [`/users`](#post-users) | Create a new user | No |
| `GET` | [`/users`](#get-users) | List all users with pagination | No |
| `GET` | [`/users/:id`](#get-usersid) | Get user by ID | No |
| `PATCH` | [`/users/:id`](#patch-usersid) | Update user information | No |
| `DELETE` | [`/users/:id`](#delete-usersid) | Delete user | No |

---

#### POST `/users`
Create a new user.

**Auth Required:** No

**Request Body:**
```json
{
  "phone_number": "+351964938153",
  "timezone": "Europe/Lisbon",
  "language": "pt"
}
```

**Response:** (201 Created)
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "phone_number": "+351964938153",
    "timezone": "Europe/Lisbon",
    "language": "pt",
    "role": "USER",
    "created_at": "2025-12-19T10:00:00Z"
  }
}
```

---

#### GET `/users`
List all users with pagination.

**Auth Required:** No

**Query Parameters:**
- `page` (default: 1) - Page number
- `limit` (default: 20) - Items per page

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [...],
    "total": 100,
    "page": 1,
    "totalPages": 5
  }
}
```

---

#### GET `/users/:id`
Get user by ID.

**Auth Required:** No

**URL Parameters:**
- `id` - User UUID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "phone_number": "+351964938153",
    "email": "user@example.com",
    "timezone": "Europe/Lisbon",
    "language": "pt",
    "role": "USER",
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

---

#### PATCH `/users/:id`
Update user information.

**Auth Required:** No

**URL Parameters:**
- `id` - User UUID

**Request Body:**
```json
{
  "timezone": "America/New_York",
  "language": "en",
  "email": "newemail@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "timezone": "America/New_York",
    "language": "en",
    "email": "newemail@example.com"
  }
}
```

---

#### DELETE `/users/:id`
Delete user.

**Auth Required:** No

**URL Parameters:**
- `id` - User UUID

**Response:** (204 No Content)

---

## Dumps (Content)

### Base Path: `/api/dumps`

Dumps are content items captured from users through various channels (text, voice, images, documents).

### Endpoints Overview

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | [`/api/dumps/enhanced`](#post-apidumpsenhanced) | Create dump with enhanced AI processing (recommended) | No |
| `POST` | [`/api/dumps/upload`](#post-apidumpsupload) | Upload and process media file | No |
| `POST` | [`/api/dumps/voice`](#post-apidumpsvoice) | Process voice message with transcription | No |
| `POST` | [`/api/dumps/screenshot`](#post-apidumpsscreenshot) | Process screenshot with OCR text extraction | No |
| `GET` | [`/api/dumps/user/:userId`](#get-apidumpsuseruserid) | Get all dumps for a user (without pagination) | No |
| `GET` | [`/api/dumps/user/:userId/recent`](#get-apidumpsuseruseridrecent) | Get recent dumps for a user | No |
| `GET` | [`/api/dumps/:id`](#get-apidumpsid) | Get dump by ID | No |
| `PATCH` | [`/api/dumps/:id`](#patch-apidumpsid) | Update dump (partial update) | No |
| `DELETE` | [`/api/dumps/:id`](#delete-apidumpsid) | Delete dump | No |

---

#### POST `/api/dumps/enhanced`
Create dump with enhanced AI processing (recommended).

**Auth Required:** No

**Request Body:**
```json
{
  "userId": "uuid",
  "content": "Reunião com cliente amanhã às 15h no escritório",
  "contentType": "text",
  "metadata": {
    "source": "telegram",
    "messageId": "123",
    "chatId": "456789"
  }
}
```

**Response:** (201 Created)
```json
{
  "success": true,
  "data": {
    "dump": {
      "id": "uuid",
      "user_id": "user-uuid",
      "raw_content": "Reunião com cliente amanhã às 15h no escritório",
      "content_type": "TEXT",
      "ai_summary": "Meeting with client scheduled for tomorrow at 3pm at the office",
      "ai_confidence": 95,
      "category_id": "category-uuid",
      "urgency_level": 2,
      "processing_status": "COMPLETED",
      "extracted_entities": {
        "entities": {
          "dates": ["2025-12-20"],
          "times": ["15:00"],
          "locations": ["office"],
          "people": ["client"]
        },
        "actionItems": ["Schedule meeting"],
        "sentiment": "neutral",
        "urgency": "medium"
      },
      "created_at": "2025-12-19T10:00:00Z"
    },
    "analysis": {
      "summary": "Meeting with client scheduled",
      "category": "work",
      "confidence": 0.95
    },
    "processingSteps": [
      "User validated",
      "Content analyzed",
      "Entity extraction completed: 4 entities found",
      "Categorization completed: work (confidence: 0.95)",
      "Category assigned: work",
      "Dump saved to database",
      "Content vector generated"
    ]
  }
}
```

---

#### POST `/api/dumps/upload`
Upload and process media file.

**Auth Required:** No

**Content-Type:** `multipart/form-data`

**Form Fields:**
- `file` - Media file (required)
- `userId` - User UUID (required)
- `contentType` - "voice", "image", or "document" (required)
- `metadata` - JSON string with metadata (optional)

**Example Request:**
```bash
curl -X POST https://api.theclutter.app/api/dumps/upload \
  -F "file=@audio.ogg" \
  -F "userId=uuid" \
  -F "contentType=voice" \
  -F 'metadata={"source":"telegram","language":"pt"}'
```

**Response:** (201 Created)
```json
{
  "success": true,
  "data": {
    "dump": {
      "id": "uuid",
      "raw_content": "Transcribed text from audio",
      "content_type": "VOICE",
      "ai_summary": "Summary of voice message"
    },
    "processingSteps": [
      "Voice message transcribed with language detection (pt, confidence: 95%)",
      "Content analysis completed"
    ]
  }
}
```

---

#### POST `/api/dumps/voice`
Process voice message with transcription.

**Auth Required:** No

**Content-Type:** `multipart/form-data`

**Form Fields:**
- `file` - Audio file (required)
- `userId` - User UUID (required)
- `language` - Language code (optional, auto-detected if not provided)
- `metadata` - JSON string with metadata (optional)

**Response:** (201 Created)
```json
{
  "success": true,
  "message": "Voice message transcribed and analyzed",
  "data": {
    "dump": {
      "id": "uuid",
      "raw_content": "Preciso comprar leite amanhã de manhã",
      "content_type": "VOICE",
      "ai_summary": "Need to buy milk tomorrow morning"
    }
  }
}
```

---

#### POST `/api/dumps/screenshot`
Process screenshot with OCR text extraction.

**Auth Required:** No

**Content-Type:** `multipart/form-data`

**Form Fields:**
- `file` - Image file (required)
- `userId` - User UUID (required)
- `metadata` - JSON string with metadata (optional)

**Response:** (201 Created)
```json
{
  "success": true,
  "message": "Screenshot processed with text extraction",
  "data": {
    "dump": {
      "id": "uuid",
      "raw_content": "Text extracted from screenshot",
      "content_type": "IMAGE"
    }
  }
}
```

---

#### GET `/api/dumps/user/:userId`
Get all dumps for a user (without pagination).

**Auth Required:** No

**URL Parameters:**
- `userId` - User UUID

**Response:**
```json
{
  "success": true,
  "data": {
    "dumps": [
      {
        "id": "uuid",
        "raw_content": "Content",
        "ai_summary": "Summary",
        "category": {
          "id": "uuid",
          "name": "work"
        },
        "created_at": "2025-12-19T10:00:00Z"
      }
    ],
    "total": 50
  },
  "message": "User dumps retrieved successfully"
}
```

---

#### GET `/api/dumps/user/:userId/recent`
Get recent dumps for a user.

**Auth Required:** No

**URL Parameters:**
- `userId` - User UUID

**Query Parameters:**
- `limit` (default: 5, max: 100) - Number of dumps to return

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "raw_content": "Recent content",
      "ai_summary": "Summary",
      "category": {
        "name": "work"
      },
      "created_at": "2025-12-19T10:00:00Z"
    }
  ],
  "message": "Recent dumps retrieved successfully"
}
```

---

#### GET `/api/dumps/:id`
Get dump by ID.

**Auth Required:** No

**URL Parameters:**
- `id` - Dump UUID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "raw_content": "Content",
    "ai_summary": "Summary",
    "ai_confidence": 95,
    "category": {
      "id": "uuid",
      "name": "work"
    },
    "extracted_entities": {
      "entities": {
        "dates": ["2025-12-20"],
        "times": ["15:00"]
      }
    },
    "user": {
      "id": "uuid",
      "phone_number": "+351964938153"
    },
    "reminders": [],
    "created_at": "2025-12-19T10:00:00Z"
  },
  "message": "Dump retrieved successfully"
}
```

---

#### PATCH `/api/dumps/:id`
Update dump (partial update).

**Auth Required:** No

**URL Parameters:**
- `id` - Dump UUID

**Request Body:**
```json
{
  "raw_content": "Updated content",
  "ai_summary": "Updated summary",
  "category": "personal",
  "extracted_entities": {
    "dates": ["2025-12-21"]
  },
  "metadata": {
    "edited": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "raw_content": "Updated content",
    "ai_summary": "Updated summary"
  },
  "message": "Dump updated successfully"
}
```

---

#### DELETE `/api/dumps/:id`
Delete dump.

**Auth Required:** No

**URL Parameters:**
- `id` - Dump UUID

**Response:** (204 No Content)

---

## Search

### Base Path: `/api/search`

Semantic search with pgvector and AI-enhanced queries.

### Endpoints Overview

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | [`/api/search`](#post-apisearch) | Perform advanced search with filters | No |
| `GET` | [`/api/search/quick`](#get-apisearchquick) | Quick search with simple query | Yes (JWT) |

---

#### POST `/api/search`
Perform advanced search with filters.

**Auth Required:** No

**Request Body:**
```json
{
  "userId": "uuid",
  "query": "reuniões com cliente",
  "limit": 10,
  "offset": 0,
  "filters": {
    "category": "work",
    "contentType": "text",
    "dateRange": {
      "start": "2025-01-01",
      "end": "2025-12-31"
    },
    "minConfidence": 70
  },
  "searchType": "semantic"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": "uuid",
        "content": "Meeting with client content",
        "summary": "AI summary",
        "category": "work",
        "relevanceScore": 0.95,
        "created_at": "2025-12-15T10:00:00Z"
      }
    ],
    "total": 25,
    "page": 1,
    "query": "reuniões com cliente"
  }
}
```

---

#### GET `/api/search/quick`
Quick search with simple query.

**Auth Required:** Yes (JWT)

**Query Parameters:**
- `q` - Search query (required)
- `userId` - User UUID (required)

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [...],
    "total": 5
  }
}
```

---

## Reminders

### Base Path: `/api/reminders`

All reminder endpoints require JWT authentication.

### Endpoints Overview

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | [`/api/reminders`](#post-apireminders) | Create a new reminder | Yes (JWT) |
| `GET` | [`/api/reminders`](#get-apireminders) | Get all reminders with filters | Yes (JWT) |
| `GET` | [`/api/reminders/upcoming`](#get-apiremindersupcoming) | Get upcoming reminders for the next N hours | Yes (JWT) |
| `POST` | [`/api/reminders/:id/snooze`](#post-apiremindersidsnooze) | Snooze a reminder | Yes (JWT) |
| `POST` | [`/api/reminders/:id/dismiss`](#post-apiremindersiddismiss) | Dismiss a reminder | Yes (JWT) |

---

#### POST `/api/reminders`
Create a new reminder.

**Auth Required:** Yes (JWT)

**Request Body:**
```json
{
  "userId": "uuid",
  "dumpId": "dump-uuid",
  "reminder_time": "2025-12-20T15:00:00Z",
  "notification_sent": false,
  "status": "pending"
}
```

**Response:** (201 Created)
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "user_id": "user-uuid",
    "dump_id": "dump-uuid",
    "reminder_time": "2025-12-20T15:00:00Z",
    "status": "pending",
    "created_at": "2025-12-19T10:00:00Z"
  }
}
```

---

#### GET `/api/reminders`
Get all reminders with filters.

**Auth Required:** Yes (JWT)

**Query Parameters:**
- `userId` - User UUID (required)
- `status` - "pending", "sent", "dismissed" (optional)
- `startDate` - Start date ISO string (optional)
- `endDate` - End date ISO string (optional)
- `limit` - Number of results (optional)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "reminder_time": "2025-12-20T15:00:00Z",
      "status": "pending",
      "dump": {
        "id": "uuid",
        "raw_content": "Meeting reminder"
      }
    }
  ]
}
```

---

#### GET `/api/reminders/upcoming`
Get upcoming reminders for the next N hours.

**Auth Required:** Yes (JWT)

**Query Parameters:**
- `userId` - User UUID (required)
- `hours` (default: 24) - Look-ahead window in hours

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "reminder_time": "2025-12-20T15:00:00Z",
      "dump": {
        "raw_content": "Meeting with client"
      }
    }
  ]
}
```

---

#### POST `/api/reminders/:id/snooze`
Snooze a reminder.

**Auth Required:** Yes (JWT)

**URL Parameters:**
- `id` - Reminder UUID

**Request Body:**
```json
{
  "minutes": 30
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "reminder_time": "2025-12-20T15:30:00Z",
    "status": "pending"
  }
}
```

---

#### POST `/api/reminders/:id/dismiss`
Dismiss a reminder.

**Auth Required:** Yes (JWT)

**URL Parameters:**
- `id` - Reminder UUID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "dismissed"
  }
}
```

---

## Tracking

### Base Path: `/api/tracking`

Track time-sensitive items like packages, applications, subscriptions, warranties, loans, and insurance policies.

All tracking endpoints require JWT authentication.

**Tracking Types:**
- `package` - Shipments and deliveries
- `application` - Job/visa/loan applications
- `subscription` - Trial periods, renewals
- `warranty` - Product warranties
- `loan` - Loan applications, payments
- `insurance` - Policy renewals, claims
- `other` - Any other time-sensitive items

**Tracking Status:**
- `pending` - Not yet started
- `in_progress` - Currently tracking
- `completed` - Successfully completed
- `expired` - Deadline passed
- `cancelled` - Tracking cancelled

### Endpoints Overview

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | [`/api/tracking`](#post-apitracking) | Create trackable item | Yes (JWT) |
| `GET` | [`/api/tracking`](#get-apitracking) | Get user's trackable items with filters | Yes (JWT) |
| `GET` | [`/api/tracking/stats`](#get-apitrackingstats) | Get tracking statistics | Yes (JWT) |
| `POST` | [`/api/tracking/package`](#post-apitrackingpackage) | Quick track package by tracking number | Yes (JWT) |
| `PUT` | [`/api/tracking/:id/status`](#put-apitrackingidstatus) | Update tracking status (add checkpoint) | Yes (JWT) |
| `PUT` | [`/api/tracking/:id/complete`](#put-apitrackingidcomplete) | Mark tracking item as completed | Yes (JWT) |
| `POST` | [`/api/tracking/detect`](#post-apitrackingdetect) | Detect tracking opportunities in a dump | Yes (JWT) |

---

#### POST `/api/tracking`
Create trackable item.

**Auth Required:** Yes (JWT)

**Request Body:**
```json
{
  "type": "package",
  "title": "Amazon Order - Laptop Charger",
  "description": "Tracking number: 1Z999AA10123456784",
  "expectedEndDate": "2025-12-25T18:00:00Z",
  "metadata": {
    "carrier": "UPS",
    "trackingNumber": "1Z999AA10123456784",
    "orderNumber": "123-4567890-1234567"
  },
  "dumpId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "user_id": "user-uuid",
    "type": "package",
    "title": "Amazon Order - Laptop Charger",
    "status": "pending",
    "start_date": "2025-12-19T10:00:00Z",
    "expected_end_date": "2025-12-25T18:00:00Z",
    "checkpoints": [],
    "metadata": {
      "carrier": "UPS",
      "trackingNumber": "1Z999AA10123456784"
    },
    "reminder_ids": [],
    "created_at": "2025-12-19T10:00:00Z"
  }
}
```

---

#### GET `/api/tracking`
Get user's trackable items with filters.

**Auth Required:** Yes (JWT)

**Query Parameters:**
- `userId` - User UUID (required)
- `type` - Filter by type (optional)
- `status` - Filter by status (optional)
- `page` - Page number (optional)
- `limit` - Items per page (optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "type": "package",
        "title": "Amazon Order",
        "status": "in_progress",
        "expected_end_date": "2025-12-25T18:00:00Z",
        "checkpoints": [
          {
            "timestamp": "2025-12-19T10:00:00Z",
            "status": "Created",
            "notes": "Item created for tracking"
          }
        ]
      }
    ],
    "total": 15,
    "page": 1,
    "totalPages": 2
  }
}
```

---

#### GET `/api/tracking/stats`
Get tracking statistics.

**Auth Required:** Yes (JWT)

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 15,
    "byType": {
      "package": 8,
      "subscription": 4,
      "warranty": 2,
      "application": 1
    },
    "byStatus": {
      "pending": 3,
      "in_progress": 10,
      "completed": 2,
      "expired": 0,
      "cancelled": 0
    },
    "overdueCount": 1
  }
}
```

---

#### POST `/api/tracking/package`
Quick track package by tracking number.

**Auth Required:** Yes (JWT)

**Request Body:**
```json
{
  "trackingNumber": "1Z999AA10123456784"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "trackableItem": {
      "id": "uuid",
      "type": "package",
      "title": "UPS Package 1Z999AA10123456784",
      "status": "in_progress"
    },
    "packageInfo": {
      "carrier": "UPS",
      "trackingNumber": "1Z999AA10123456784",
      "status": "In Transit",
      "estimatedDelivery": "2025-12-25T18:00:00Z",
      "currentLocation": "Distribution Center"
    }
  }
}
```

---

#### PUT `/api/tracking/:id/status`
Update tracking status (add checkpoint).

**Auth Required:** Yes (JWT)

**URL Parameters:**
- `id` - Tracking item UUID

**Request Body:**
```json
{
  "status": "Out for Delivery",
  "notes": "Package is out for delivery",
  "location": "Local Distribution Center"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "in_progress",
    "checkpoints": [
      {
        "timestamp": "2025-12-19T14:30:00Z",
        "status": "Out for Delivery",
        "location": "Local Distribution Center",
        "notes": "Package is out for delivery"
      }
    ]
  }
}
```

---

#### PUT `/api/tracking/:id/complete`
Mark tracking item as completed.

**Auth Required:** Yes (JWT)

**URL Parameters:**
- `id` - Tracking item UUID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "completed",
    "actual_end_date": "2025-12-19T15:00:00Z"
  }
}
```

---

#### POST `/api/tracking/detect`
Detect tracking opportunities in a dump.

**Auth Required:** Yes (JWT)

**Request Body:**
```json
{
  "dumpId": "dump-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "detected": true,
    "suggestions": [
      {
        "type": "package",
        "title": "UPS Package",
        "description": "Tracking number found: 1Z999AA10123456784",
        "confidence": "high",
        "metadata": {
          "trackingNumber": "1Z999AA10123456784",
          "carrier": "UPS"
        }
      }
    ]
  }
}
```

---

## Review & Moderation

### Base Path: `/review`

Content moderation for flagged dumps with low AI confidence.

All review endpoints require JWT authentication.

### Endpoints Overview

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | [`/review/flagged`](#get-reviewflagged) | Get all flagged content for review | Yes (JWT) |
| `GET` | [`/review/flagged/:dumpId`](#get-reviewflaggerdumpid) | Get specific flagged item details | Yes (JWT) |
| `POST` | [`/review/:dumpId/approve`](#post-reviewdumpidapprove) | Approve flagged dump with optional corrections | Yes (JWT) |
| `POST` | [`/review/:dumpId/reject`](#post-reviewdumpidreject) | Reject flagged dump (deletes it) | Yes (JWT) |

---

#### GET `/review/flagged`
Get all flagged content for review.

**Auth Required:** Yes (JWT)

**Query Parameters:**
- `status` - Filter by status (optional)
- `priority` - Filter by priority (optional)
- `limit` (default: 50) - Number of items to return
- `userId` - Filter by user (optional)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "dump-uuid",
      "dump": {
        "id": "uuid",
        "rawContent": "Content that needs review",
        "category": {
          "name": "work"
        },
        "aiConfidence": 65
      },
      "priority": "medium",
      "status": "pending",
      "flaggedAt": "2025-12-19T10:00:00Z",
      "user": {
        "id": "uuid",
        "phoneNumber": "+351964938153"
      }
    }
  ],
  "meta": {
    "total": 10,
    "limit": 50
  }
}
```

---

#### GET `/review/flagged/:dumpId`
Get specific flagged item details.

**Auth Required:** Yes (JWT)

**URL Parameters:**
- `dumpId` - Dump UUID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "dump-uuid",
    "dump": {
      "rawContent": "Content",
      "aiConfidence": 65
    },
    "priority": "medium",
    "status": "pending"
  }
}
```

---

#### POST `/review/:dumpId/approve`
Approve flagged dump with optional corrections.

**Auth Required:** Yes (JWT)

**URL Parameters:**
- `dumpId` - Dump UUID

**Request Body:**
```json
{
  "raw_content": "Corrected content",
  "category": "work",
  "notes": "Fixed categorization"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Dump approved and updated",
    "dumpId": "uuid",
    "updates": {
      "raw_content": "Corrected content",
      "category": "work",
      "ai_confidence": 100
    },
    "notes": "Fixed categorization"
  }
}
```

---

#### POST `/review/:dumpId/reject`
Reject flagged dump (deletes it).

**Auth Required:** Yes (JWT)

**URL Parameters:**
- `dumpId` - Dump UUID

**Request Body:**
```json
{
  "reason": "Spam content",
  "notes": "User reported as spam"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Dump rejected and deleted",
    "dumpId": "uuid",
    "reason": "Spam content",
    "notes": "User reported as spam"
  }
}
```

---

## Feedback

### Base Path: `/feedback`

User feedback and feature requests system.

### Endpoints Overview

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | [`/feedback/submit`](#post-feedbacksubmit) | Submit new feedback | No |
| `GET` | [`/feedback`](#get-feedback) | Get all feedback with filters | No |
| `PUT` | [`/feedback/:feedbackId/status`](#put-feedbackfeedbackidstatus) | Update feedback status | No |
| `POST` | [`/feedback/:feedbackId/notes`](#post-feedbackfeedbackidnotes) | Add internal admin note to feedback | No |
| `POST` | [`/feedback/:feedbackId/upvote`](#post-feedbackfeedbackidupvote) | Upvote feedback to indicate importance | No |
| `GET` | [`/feedback/stats/overview`](#get-feedbackstatsoverview) | Get feedback statistics | No |
| `GET` | [`/feedback/options/metadata`](#get-feedbackoptionsmetadata) | Get feedback metadata options | No |

---

#### POST `/feedback/submit`
Submit new feedback.

**Auth Required:** No

**Query Parameters:**
- `userId` - User UUID (required)

**Request Body:**
```json
{
  "type": "bug",
  "severity": "medium",
  "title": "Search not working for voice messages",
  "description": "When I search for content from voice messages, results are not accurate",
  "context": {
    "platform": "telegram",
    "feature": "search",
    "timestamp": "2025-12-19T10:00:00Z"
  },
  "metadata": {
    "userAgent": "Telegram/9.0",
    "language": "pt"
  }
}
```

**Example payload (new):**
```json
{
  "type":"bug",
  "severity":"medium",
  "title":"teste de bug",
  "rating":4,
  "description":"test de bug report",
  "context":{
    "platform":"webapp",
    "feature":"reminder",
    "timestamp":"2025-12-23T10:45:58.069Z"
  },
  "metadata":{
    "userAgent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
    "language":"pt"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "type": "bug",
    "severity": "medium",
    "title": "Search not working for voice messages",
    "status": "open",
    "created_at": "2025-12-19T10:00:00Z"
  }
}
```

---

#### GET `/feedback`
Get all feedback with filters.

**Auth Required:** No

**Query Parameters:**
- `type` - Filter by type: "bug", "feature", "improvement" (optional)
- `status` - Filter by status: "open", "in_progress", "resolved", "closed" (optional)
- `priority` - Filter by priority: "low", "medium", "high", "critical" (optional)
- `userId` - Filter by user (optional)
- `dumpId` - Filter by related dump (optional)
- `tags` - Comma-separated tags (optional)
- `limit` (default: 50) - Number of items
- `offset` (default: 0) - Offset for pagination

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "type": "bug",
      "severity": "medium",
      "title": "Search issue",
      "status": "open",
      "upvotes": 5,
      "created_at": "2025-12-19T10:00:00Z"
    }
  ]
}
```

---

#### PUT `/feedback/:feedbackId/status`
Update feedback status.

**Auth Required:** No

**URL Parameters:**
- `feedbackId` - Feedback UUID

**Query Parameters:**
- `userId` - User UUID (optional, for audit)

**Request Body:**
```json
{
  "status": "in_progress",
  "resolution": "Working on fix"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "in_progress",
    "updated_at": "2025-12-19T10:30:00Z"
  }
}
```

---

#### POST `/feedback/:feedbackId/notes`
Add internal admin note to feedback.

**Auth Required:** No

**URL Parameters:**
- `feedbackId` - Feedback UUID

**Request Body:**
```json
{
  "note": "Investigating the issue. Will update soon."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "internal_notes": [
      {
        "timestamp": "2025-12-19T10:30:00Z",
        "note": "Investigating the issue. Will update soon."
      }
    ]
  }
}
```

---

#### POST `/feedback/:feedbackId/upvote`
Upvote feedback to indicate importance.

**Auth Required:** No

**URL Parameters:**
- `feedbackId` - Feedback UUID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "upvotes": 6
  }
}
```

---

#### GET `/feedback/stats/overview`
Get feedback statistics.

**Auth Required:** No

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 150,
    "byType": {
      "bug": 50,
      "feature": 80,
      "improvement": 20
    },
    "byStatus": {
      "open": 60,
      "in_progress": 40,
      "resolved": 30,
      "closed": 20
    },
    "byPriority": {
      "low": 40,
      "medium": 70,
      "high": 30,
      "critical": 10
    }
  }
}
```

---

#### GET `/feedback/options/metadata`
Get feedback metadata options (types, priorities, statuses).

**Auth Required:** No

**Response:**
```json
{
  "success": true,
  "data": {
    "types": [
      {
        "value": "bug",
        "label": "Bug Report",
        "description": "Something isn't working as expected"
      },
      {
        "value": "feature",
        "label": "Feature Request",
        "description": "Suggest a new feature"
      },
      {
        "value": "improvement",
        "label": "Improvement",
        "description": "Suggest an enhancement"
      }
    ],
    "priorities": [
      {"value": "low", "label": "Low"},
      {"value": "medium", "label": "Medium"},
      {"value": "high", "label": "High"},
      {"value": "critical", "label": "Critical"}
    ],
    "statuses": [
      {"value": "open", "label": "Open"},
      {"value": "in_progress", "label": "In Progress"},
      {"value": "resolved", "label": "Resolved"},
      {"value": "closed", "label": "Closed"}
    ]
  }
}
```

---

## Admin Analytics

### Base Path: `/admin`

All admin endpoints require JWT authentication and ADMIN role.

### Endpoints Overview

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | [`/admin/analytics/system`](#get-adminanalyticssystem) | Get system-wide metrics and statistics | Yes (JWT + ADMIN) |
| `GET` | [`/admin/analytics/search`](#get-adminanalyticssearch) | Get search analytics and metrics | Yes (JWT + ADMIN) |
| `GET` | [`/admin/analytics/ai`](#get-adminanalyticsai) | Get AI processing metrics | Yes (JWT + ADMIN) |
| `GET` | [`/admin/analytics/users`](#get-adminanalyticsusers) | Get user statistics | Yes (JWT + ADMIN) |
| `GET` | [`/admin/analytics/features`](#get-adminanalyticsfeatures) | Get feature usage statistics | Yes (JWT + ADMIN) |
| `GET` | [`/admin/dumps`](#get-admindumps) | Get all dumps (admin overview with pagination) | Yes (JWT + ADMIN) |
| `GET` | [`/admin/categories`](#get-admincategories) | Get all categories | Yes (JWT + ADMIN) |

---

#### GET `/admin/analytics/system`
Get system-wide metrics and statistics.

**Auth Required:** Yes (JWT + ADMIN)

**Response:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 1234,
    "totalDumps": 45678,
    "totalReminders": 890,
    "activeUsers": 567,
    "averageProcessingTime": 1.23,
    "processingSuccessRate": 98,
    "dailyStats": [
      {
        "date": "2025-12-19",
        "dumps": 234,
        "users": 12
      }
    ],
    "storage": {
      "totalFiles": 5000,
      "byType": [
        {"type": "TEXT", "count": 3000},
        {"type": "VOICE", "count": 1500},
        {"type": "IMAGE", "count": 500}
      ],
      "totalSizeMB": 4000
    }
  }
}
```

---

#### GET `/admin/analytics/search`
Get search analytics and metrics.

**Auth Required:** Yes (JWT + ADMIN)

**Response:**
```json
{
  "success": true,
  "data": {
    "totalSearches": 5000,
    "topQueries": [
      {"query": "reunião", "count": 250},
      {"query": "cliente", "count": 180}
    ],
    "queryDistribution": [
      {"type": "semantic", "count": 3000},
      {"type": "text", "count": 2000}
    ],
    "averageLatency": 125,
    "latencyByType": [
      {
        "type": "semantic",
        "avgLatency": 150,
        "p95": 250,
        "p99": 400
      }
    ],
    "successRate": 97.5
  }
}
```

---

#### GET `/admin/analytics/ai`
Get AI processing metrics.

**Auth Required:** Yes (JWT + ADMIN)

**Response:**
```json
{
  "success": true,
  "data": {
    "totalProcessed": 50000,
    "successfullyProcessed": 49000,
    "processingSuccessRate": 98,
    "averageConfidence": 0.875,
    "confidenceDistribution": [
      {"range": "0.9-1.0", "count": 30000},
      {"range": "0.8-0.9", "count": 15000},
      {"range": "0.7-0.8", "count": 3000}
    ],
    "categoryBreakdown": [
      {
        "category": "work",
        "count": 20000,
        "avgConfidence": "87.5"
      }
    ],
    "lowConfidenceCount": 2000,
    "needsReview": 2000
  }
}
```

---

#### GET `/admin/analytics/users`
Get user statistics.

**Auth Required:** Yes (JWT + ADMIN)

**Response:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 1234,
    "activeWeek": 456,
    "activeMonth": 789,
    "activeQuarter": 1000,
    "monthlyRegistrations": [
      {"month": "2025-11", "count": 50},
      {"month": "2025-12", "count": 75}
    ],
    "avgDumpsPerUser": 37.5
  }
}
```

---

#### GET `/admin/analytics/features`
Get feature usage statistics.

**Auth Required:** Yes (JWT + ADMIN)

**Response:**
```json
{
  "success": true,
  "data": {
    "totalUsage": 10000,
    "mostPopular": "DUMP_CREATED",
    "breakdown": [
      {
        "feature": "DUMP_CREATED",
        "count": 5000,
        "percentage": 50
      },
      {
        "feature": "SEARCH_PERFORMED",
        "count": 3000,
        "percentage": 30
      }
    ]
  }
}
```

---

#### GET `/admin/dumps`
Get all dumps (admin overview with pagination).

**Auth Required:** Yes (JWT + ADMIN)

**Query Parameters:**
- `page` (default: 1) - Page number
- `limit` (default: 50) - Items per page
- `search` - Search term (optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "dumps": [...],
    "total": 45678,
    "page": 1,
    "limit": 50,
    "totalPages": 914
  }
}
```

---

#### GET `/admin/categories`
Get all categories.

**Auth Required:** Yes (JWT + ADMIN)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "work",
      "description": "Work-related content",
      "color": "#4ECDC4",
      "icon": "briefcase"
    }
  ]
}
```

---

## Email Integration

### Base Path: `/api/email`

Email ingestion webhooks for processing emails as dumps.

### Endpoints Overview

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | [`/api/email/webhook/sendgrid`](#post-apiemailwebhooksendgrid) | SendGrid inbound parse webhook | No (webhook signature validation) |
| `POST` | [`/api/email/webhook/health`](#post-apiemailwebhookhealth) | Email webhook health check | No |

---

#### POST `/api/email/webhook/sendgrid`
SendGrid inbound parse webhook.

**Auth Required:** No (webhook signature validation)

**Content-Type:** `multipart/form-data`

**Form Fields:**
- `to` - Recipient email
- `from` - Sender email
- `subject` - Email subject
- `text` - Plain text body
- `html` - HTML body
- `attachments` - Number of attachments
- `attachment-info` - Attachment metadata
- `attachment1`, `attachment2`, ... - Attachment files

**Response:**
```json
{
  "success": true,
  "message": "Email processed successfully",
  "data": {
    "dumpsCreated": 3,
    "attachmentsProcessed": 2
  }
}
```

---

#### POST `/api/email/webhook/health`
Email webhook health check.

**Auth Required:** No

**Response:**
```json
{
  "success": true,
  "message": "Email webhook is operational"
}
```

---

## Bot Webhooks

### Endpoints Overview

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | [`/api/webhooks/telegram`](#post-apiwebhookstelegram) | Receive Telegram webhook updates | No (webhook validation) |
| `POST` | [`/api/webhooks/whatsapp`](#post-apiwebhookswhatsapp) | Receive Twilio WhatsApp webhook | No (Twilio signature validation) |

---

### Telegram Bot

**Base Path:** `/api/webhooks/telegram`

#### POST `/api/webhooks/telegram`
Receive Telegram webhook updates.

**Auth Required:** No (webhook validation)

**Request Body (Telegram format):**
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
    "text": "/recent"
  }
}
```

**Supported Commands:**
- `/start` - Welcome and registration
- `/help` - Show commands
- `/recent [limit]` - Show recent dumps
- `/upcoming [hours]` - Show upcoming reminders
- `/next` - Alias for `/upcoming`
- `/search <query>` - Search dumps
- `/track [tracking-number]` - Track package or list trackables
- `/stats` - User statistics

**Supported Message Types:**
- Text messages
- Voice messages (auto-transcribed)
- Photos (OCR processed)
- Documents
- Edited messages

**Response:**
```json
{
  "success": true,
  "message": "Update processed"
}
```

---

### WhatsApp Bot (Twilio)

**Base Path:** `/api/webhooks/whatsapp`

#### POST `/api/webhooks/whatsapp`
Receive Twilio WhatsApp webhook.

**Auth Required:** No (Twilio signature validation)

**Request Body (Twilio format):**
```json
{
  "From": "whatsapp:+351964938153",
  "To": "whatsapp:+14155238886",
  "Body": "help",
  "MessageSid": "SMxxxxxxxxx",
  "AccountSid": "ACxxxxxxxxx",
  "NumMedia": "0"
}
```

**Supported Commands:**
- `help` - Show commands
- `recent [limit]` - Show recent dumps
- `upcoming [hours]` - Show upcoming reminders
- `next` - Alias for `upcoming`
- `search <query>` - Search dumps
- `track [tracking-number]` - Track package or list trackables
- `stats` - User statistics

**Response:**
```json
{
  "success": true,
  "message": "Message processed"
}
```

---

## Common Patterns

### Standard Response Format

All API endpoints return responses in this format:

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

### Error Response Format

```json
{
  "success": false,
  "message": "Error description",
  "error": {
    "message": "Detailed error message",
    "code": "ERROR_CODE",
    "details": { ... }
  },
  "statusCode": 400
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `204` - No Content (successful deletion)
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

### Pagination

Paginated endpoints accept these query parameters:

- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20 or 50)
- `offset` - Alternative to page (default: 0)

Response includes:

```json
{
  "data": [...],
  "total": 100,
  "page": 1,
  "limit": 20,
  "totalPages": 5
}
```

### Date Formats

All dates use ISO 8601 format:

```
2025-12-19T10:00:00Z
```

### Phone Number Format

Phone numbers must use E.164 format:

```
+351964938153
```

### Content Types

Supported content types for dumps:

- `text` - Plain text messages
- `voice` - Audio/voice messages
- `image` - Photos, screenshots
- `document` - PDFs, Word docs, etc.

### Language Codes

Use ISO 639-1 two-letter codes:

- `pt` - Portuguese
- `en` - English
- `es` - Spanish
- `fr` - French

### Timezone Format

Use IANA timezone names:

- `Europe/Lisbon`
- `America/New_York`
- `Asia/Tokyo`

---

## Rate Limiting

- **Webhooks:** No rate limiting (trusted sources)
- **Public API:** 100 requests/minute per IP
- **Authenticated API:** 1000 requests/minute per user

Rate limit headers included in responses:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1702989600
```

---

## Webhook Security

### Telegram
- Optional webhook signature validation
- Filters by allowed chat IDs

### WhatsApp (Twilio)
- Validates Twilio request signature
- Checks account SID against configuration

### Email (SendGrid)
- Validates webhook signatures
- Checks sender domains

---

## Support & Documentation

- **API Version:** 1.1
- **Documentation:** This file
- **Base URL:** https://api.theclutter.app
- **Issues:** GitHub repository

---

**Last Updated:** December 19, 2025  
**Maintained by:** Clutter.AI Team
