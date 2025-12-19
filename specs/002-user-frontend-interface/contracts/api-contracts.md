# API Contracts: User Frontend Interface

**Feature**: `002-user-frontend-interface`  
**Date**: 2025-12-15  
**Format**: OpenAPI 3.0  
**Base URL**: `/api`

---

## Authentication

All endpoints require authentication via Bearer token in the `Authorization` header.

```http
Authorization: Bearer <jwt_token>
```

All endpoints automatically filter data by the authenticated user's `userId`.

---

## Endpoints

### 1. Get User Dumps

Retrieve all dumps for the authenticated user.

**Endpoint**: `GET /api/dumps`

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | string | Yes | User identifier (automatically set from auth token) |
| `status` | string | No | Filter by status (Pending, Processing, Approved, Rejected) |
| `dateFrom` | string | No | ISO 8601 date - filter dumps with dates after this |
| `dateTo` | string | No | ISO 8601 date - filter dumps with dates before this |

**Response**: `200 OK`
```json
{
  "dumps": [
    {
      "id": "dump_123",
      "userId": "user_456",
      "status": "Pending",
      "category": "Task",
      "rawContent": "Call dentist tomorrow at 2pm",
      "notes": "Important - rescheduled from last week",
      "extractedEntities": {
        "dates": [
          {
            "date": "2025-12-16T14:00:00Z",
            "type": "reminder",
            "context": "tomorrow at 2pm"
          }
        ],
        "reminders": [
          {
            "title": "Call dentist",
            "dueDate": "2025-12-16T14:00:00Z",
            "priority": "Medium"
          }
        ],
        "urgencyLevel": "Medium",
        "contentType": "Reminder"
      },
      "confidence": 0.92,
      "createdAt": "2025-12-15T10:30:00Z",
      "updatedAt": "2025-12-15T10:30:00Z",
      "processedAt": "2025-12-15T10:30:05Z"
    }
  ],
  "total": 1
}
```

**Error Responses**:
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: Attempting to access another user's data
- `500 Internal Server Error`: Server error

---

### 2. Search Dumps

Search dumps using natural language query and filters.

**Endpoint**: `POST /api/search`

**Request Body**:
```json
{
  "query": "dentist appointments",
  "userId": "user_456",
  "contentTypes": ["Reminder", "Event"],
  "categories": ["Health"],
  "urgencyLevels": ["Medium", "High"],
  "minConfidence": 0.8,
  "includeProcessing": false,
  "dateFrom": "2025-12-01T00:00:00Z",
  "dateTo": "2025-12-31T23:59:59Z",
  "page": 1,
  "pageSize": 20
}
```

**Request Schema**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `query` | string | Yes | Natural language search query |
| `userId` | string | Yes | User identifier (from auth token) |
| `contentTypes` | string[] | No | Filter by content types |
| `categories` | string[] | No | Filter by categories |
| `urgencyLevels` | string[] | No | Filter by urgency levels |
| `minConfidence` | number | No | Minimum confidence score (0-1) |
| `includeProcessing` | boolean | No | Include dumps still processing |
| `dateFrom` | string | No | ISO 8601 date |
| `dateTo` | string | No | ISO 8601 date |
| `page` | number | No | Page number (default: 1) |
| `pageSize` | number | No | Items per page (default: 20, max: 100) |

**Response**: `200 OK`
```json
{
  "dumps": [
    {
      "id": "dump_123",
      "userId": "user_456",
      "status": "Approved",
      "category": "Health",
      "rawContent": "Call dentist tomorrow at 2pm",
      "notes": null,
      "extractedEntities": {
        "dates": [
          {
            "date": "2025-12-16T14:00:00Z",
            "type": "reminder",
            "context": "tomorrow at 2pm"
          }
        ],
        "reminders": [
          {
            "title": "Call dentist",
            "dueDate": "2025-12-16T14:00:00Z",
            "priority": "Medium"
          }
        ],
        "urgencyLevel": "Medium",
        "contentType": "Reminder"
      },
      "confidence": 0.92,
      "createdAt": "2025-12-15T10:30:00Z",
      "updatedAt": "2025-12-15T10:30:00Z",
      "processedAt": "2025-12-15T10:30:05Z"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 20,
  "hasMore": false
}
```

**Error Responses**:
- `400 Bad Request`: Invalid query parameters
- `401 Unauthorized`: Missing or invalid authentication token
- `500 Internal Server Error`: Server error

---

### 3. Update Dump (Accept/Reject)

Update dump details and/or change status.

**Endpoint**: `PATCH /api/dumps/:id`

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Dump identifier |

**Request Body** (Accept):
```json
{
  "category": "Health",
  "rawContent": "Call dentist tomorrow at 2pm - UPDATED",
  "notes": "Confirmed appointment",
  "status": "Approved"
}
```

**Request Body** (Reject):
```json
{
  "status": "Rejected",
  "rejectionReason": "Duplicate entry",
  "notes": "Already have this reminder"
}
```

**Request Schema**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `category` | string | No | Updated category |
| `rawContent` | string | No | Updated raw content |
| `notes` | string | No | User notes |
| `status` | string | No | New status (Approved, Rejected) |
| `rejectionReason` | string | Required if status=Rejected | Reason for rejection |

**Response**: `200 OK`
```json
{
  "id": "dump_123",
  "userId": "user_456",
  "status": "Approved",
  "category": "Health",
  "rawContent": "Call dentist tomorrow at 2pm - UPDATED",
  "notes": "Confirmed appointment",
  "extractedEntities": {
    "dates": [
      {
        "date": "2025-12-16T14:00:00Z",
        "type": "reminder",
        "context": "tomorrow at 2pm"
      }
    ],
    "reminders": [
      {
        "title": "Call dentist",
        "dueDate": "2025-12-16T14:00:00Z",
        "priority": "Medium"
      }
    ],
    "urgencyLevel": "Medium",
    "contentType": "Reminder"
  },
  "confidence": 0.92,
  "createdAt": "2025-12-15T10:30:00Z",
  "updatedAt": "2025-12-15T11:45:00Z",
  "processedAt": "2025-12-15T10:30:05Z"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid request body (e.g., Rejected without rejectionReason)
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: Attempting to modify another user's dump
- `404 Not Found`: Dump not found
- `500 Internal Server Error`: Server error

---

### 4. Get Metadata/Enums

Retrieve enum values for filters and categories.

**Endpoint**: `GET /api/metadata/enums`

**Response**: `200 OK`
```json
{
  "contentTypes": [
    "Email",
    "Task",
    "Note",
    "Package",
    "Reminder",
    "Event",
    "Other"
  ],
  "urgencyLevels": [
    "Low",
    "Medium",
    "High",
    "Critical"
  ],
  "categories": [
    "Work",
    "Personal",
    "Health",
    "Finance",
    "Shopping",
    "Travel",
    "Other"
  ],
  "feedbackCategories": [
    "Bug",
    "Feature Request",
    "Improvement",
    "Question",
    "Other"
  ],
  "feedbackStatuses": [
    "Pending",
    "In Review",
    "Resolved",
    "Rejected"
  ],
  "dumpStatuses": [
    "Pending",
    "Processing",
    "Approved",
    "Rejected"
  ]
}
```

**Error Responses**:
- `500 Internal Server Error`: Server error

---

### 5. Submit Feedback

Create new feedback submission.

**Endpoint**: `POST /api/feedback`

**Request Body**:
```json
{
  "userId": "user_456",
  "category": "Bug",
  "message": "The search results are not filtering correctly when I select multiple categories.",
  "rating": 3
}
```

**Request Schema**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | string | Yes | User identifier (from auth token) |
| `category` | string | Yes | Feedback category |
| `message` | string | Yes | Feedback content (min 10 chars) |
| `rating` | number | Yes | User rating (1-5) |

**Response**: `201 Created`
```json
{
  "id": "feedback_789",
  "userId": "user_456",
  "category": "Bug",
  "message": "The search results are not filtering correctly when I select multiple categories.",
  "rating": 3,
  "status": "Pending",
  "response": null,
  "createdAt": "2025-12-15T12:00:00Z",
  "updatedAt": "2025-12-15T12:00:00Z"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid request body (e.g., message too short, invalid rating)
- `401 Unauthorized`: Missing or invalid authentication token
- `500 Internal Server Error`: Server error

---

### 6. Get User Feedback

Retrieve all feedback submissions for the authenticated user.

**Endpoint**: `GET /api/feedback`

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | string | Yes | User identifier (from auth token) |
| `status` | string | No | Filter by status |

**Response**: `200 OK`
```json
{
  "feedback": [
    {
      "id": "feedback_789",
      "userId": "user_456",
      "category": "Bug",
      "message": "The search results are not filtering correctly when I select multiple categories.",
      "rating": 3,
      "status": "In Review",
      "response": "Thank you for reporting this. We're investigating the issue.",
      "createdAt": "2025-12-15T12:00:00Z",
      "updatedAt": "2025-12-15T13:00:00Z"
    }
  ],
  "total": 1
}
```

**Error Responses**:
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: Attempting to access another user's feedback
- `500 Internal Server Error`: Server error

---

## Error Response Format

All error responses follow this structure:

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "The request body is invalid",
    "details": [
      "Field 'category' is required",
      "Field 'rating' must be between 1 and 5"
    ]
  }
}
```

**Common Error Codes**:
- `INVALID_REQUEST`: Malformed request body or parameters
- `UNAUTHORIZED`: Missing or invalid authentication token
- `FORBIDDEN`: Attempting to access unauthorized resources
- `NOT_FOUND`: Resource not found
- `INTERNAL_ERROR`: Server error

---

## Rate Limiting

All endpoints are rate-limited to:
- **Anonymous**: N/A (all endpoints require authentication)
- **Authenticated**: 1000 requests per hour per user

Rate limit headers included in all responses:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1702659600
```

---

## Pagination

Endpoints that support pagination use the following pattern:

**Request**:
```json
{
  "page": 1,
  "pageSize": 20
}
```

**Response**:
```json
{
  "items": [...],
  "total": 100,
  "page": 1,
  "pageSize": 20,
  "hasMore": true
}
```

---

## Contract Testing

Frontend contract tests should verify:

1. **Request structure**: All required fields present and correctly typed
2. **Response structure**: Response matches TypeScript interfaces
3. **Error handling**: Correct error codes and messages
4. **Authentication**: All endpoints reject unauthenticated requests
5. **Authorization**: Users can only access their own data
6. **Enum consistency**: Enum values match between backend and frontend

**Test Framework**: Jest + MSW (Mock Service Worker)

**Example Test**:
```typescript
describe('GET /api/dumps', () => {
  it('should return dumps for authenticated user', async () => {
    const response = await api.get('/dumps', {
      headers: { Authorization: `Bearer ${validToken}` }
    });
    
    expect(response.status).toBe(200);
    expect(response.data.dumps).toBeInstanceOf(Array);
    response.data.dumps.forEach(dump => {
      expect(isDump(dump)).toBe(true);
    });
  });
  
  it('should reject unauthenticated requests', async () => {
    await expect(api.get('/dumps')).rejects.toMatchObject({
      response: { status: 401 }
    });
  });
});
```
