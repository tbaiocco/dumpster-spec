# Clutter.AI Universal Life Inbox - User Documentation (T099)

## Table of Contents
1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Features](#features)
4. [API Documentation](#api-documentation)
5. [Admin Dashboard](#admin-dashboard)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)
8. [FAQ](#faq)

---

## Introduction

**Clutter.AI Universal Life Inbox** is an intelligent system that captures all the "random brain dumps" from your life—texts, screenshots, voice notes, images, PDFs—and makes them instantly searchable and actionable using AI.

### Key Features
- 📥 **Universal Capture**: Dump content from any source (WhatsApp, Telegram, email, web interface)
- 🔍 **Natural Language Search**: Find anything with conversational queries
- 🤖 **AI-Powered Processing**: Automatic categorization, summarization, and entity extraction
- 🔔 **Proactive Reminders**: Smart alerts based on content context
- 📊 **Admin Dashboard**: Monitor and manage content with powerful analytics

---

## Getting Started

### Prerequisites
- Node.js 18+ (for local development)
- PostgreSQL with pgvector extension (or Supabase account)
- API keys for:
  - Anthropic Claude (for AI processing)
  - OpenAI (for embeddings)
  - ElevenLabs (optional, for voice synthesis)

### Installation

#### 1. Clone the Repository
```bash
git clone https://github.com/your-org/clutter-ai-inbox.git
cd clutter-ai-inbox
```

#### 2. Backend Setup
```bash
cd backend
npm install

# Copy environment template
cp .env.example config/environments/.env.development

# Edit environment variables
nano config/environments/.env.development
```

**Required Environment Variables:**
```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Authentication
JWT_SECRET=your-super-secret-jwt-key-32-characters-min

# AI Services
ANTHROPIC_API_KEY=sk-ant-your-key
OPENAI_API_KEY=sk-your-openai-key

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### 3. Database Setup
```bash
# Run migrations
npm run migration:run

# Seed initial data
npm run seed
```

#### 4. Start Backend Server
```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

The API will be available at `http://localhost:3000`.

#### 5. Admin Dashboard Setup
```bash
cd ../admin-dashboard
npm install

# Set API URL
echo "REACT_APP_API_URL=http://localhost:3000" > .env.local

# Start development server
npm start
```

The dashboard will be available at `http://localhost:3001`.

---

## Features

### 1. Content Capture

#### Via WhatsApp Bot
```
# Send a message to the WhatsApp bot
"Remind me to buy groceries tomorrow at 5pm"

# Send images with captions
[Image: Recipe screenshot]
"Try this lasagna recipe this weekend"

# Send voice notes
[Voice: 15 seconds]
"Meeting notes from today's standup..."
```

#### Via Telegram Bot
```
/start - Initialize bot
/dump [message] - Quick dump
/search [query] - Search your dumps
/remind [time] [message] - Set reminder
```

#### Via REST API
```bash
# Create a dump
curl -X POST http://localhost:3000/api/dumps \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Research best practices for NestJS authentication",
    "type": "note",
    "source": "web"
  }'
```

### 2. Natural Language Search

#### Search Endpoints
```bash
# Vector search (semantic)
GET /api/search?q=italian recipes&limit=10

# Full-text search
GET /api/search?q=grocery shopping&type=fulltext

# Hybrid search (vector + full-text)
GET /api/search?q=work meetings last week&mode=hybrid
```

#### Search Examples
- **Semantic**: "Things I need to remember for vacation"
- **Full-text**: "lasagna recipe"
- **Time-based**: "dumps from last month"
- **Category-based**: "work tasks"

#### Response Format
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Vacation Packing List",
      "content": "Passport, sunscreen, camera...",
      "category": {
        "name": "travel",
        "confidence": 0.95
      },
      "similarity": 0.87,
      "created_at": "2024-01-20T10:30:00Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 10
  }
}
```

### 3. AI Processing

#### Automatic Features
- **Categorization**: 12 predefined categories (work, personal, shopping, etc.)
- **Summarization**: Concise summaries for long content
- **Entity Extraction**: People, places, dates, amounts
- **Confidence Scoring**: AI confidence for each prediction

#### Image Processing
```bash
# Upload image with OCR and vision analysis
POST /api/dumps/upload
Content-Type: multipart/form-data

{
  "file": [image file],
  "extract_text": true,
  "analyze_content": true
}
```

**Capabilities:**
- OCR text extraction from images
- Scene description and object detection
- Handwriting recognition
- Document structure analysis

#### Voice Processing
```bash
# Upload audio with transcription
POST /api/dumps/audio
Content-Type: multipart/form-data

{
  "file": [audio file],
  "language": "en-US"
}
```

**Capabilities:**
- Speech-to-text transcription
- Speaker identification (coming soon)
- Sentiment analysis
- Automatic punctuation

### 4. Reminders

#### Create Reminder
```bash
POST /api/reminders
{
  "title": "Call dentist",
  "trigger_at": "2024-01-25T09:00:00Z",
  "dump_id": "uuid-of-related-dump"
}
```

#### Reminder Notifications
- **Channels**: Email, SMS, push notifications, bot messages
- **Snooze**: Reschedule reminders easily
- **Recurring**: Daily, weekly, monthly patterns (coming soon)

---

## API Documentation

### Interactive API Docs (Swagger)
Access full API documentation at:
```
http://localhost:3000/api/docs
```

### Authentication

#### 1. Phone Verification Login
```bash
# Step 1: Request OTP
POST /api/auth/request-otp
{
  "phone": "+1234567890"
}

# Step 2: Verify OTP
POST /api/auth/verify-otp
{
  "phone": "+1234567890",
  "otp": "123456"
}

# Response
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "expires_in": 604800
}
```

#### 2. Using JWT Tokens
```bash
# Include token in Authorization header
curl -X GET http://localhost:3000/api/dumps \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

#### 3. Token Refresh
```bash
POST /api/auth/refresh
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Rate Limiting
- **Default**: 100 requests per minute
- **Search**: 50 requests per 10 seconds
- **Upload**: 10 requests per minute

**Rate Limit Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
```

### Error Handling

All errors follow this format:
```json
{
  "success": false,
  "error": {
    "code": "DUMP_NOT_FOUND",
    "message": "The requested dump could not be found",
    "statusCode": 404
  }
}
```

**Common Error Codes:**
- `400 BAD_REQUEST`: Invalid request parameters
- `401 UNAUTHORIZED`: Missing or invalid authentication
- `403 FORBIDDEN`: Insufficient permissions
- `404 NOT_FOUND`: Resource not found
- `429 TOO_MANY_REQUESTS`: Rate limit exceeded
- `500 INTERNAL_SERVER_ERROR`: Server error

---

## Admin Dashboard

### Accessing the Dashboard
```
http://localhost:3001
```

### Features

#### 1. Login Page
- Phone number verification
- JWT-based authentication
- Automatic token refresh

#### 2. Users Management (`/users`)
- View all registered users
- Search users by phone/email
- Block/unblock users
- View user activity metrics

#### 3. Dumps Overview (`/dumps`)
- Monitor all content dumps
- Filter by category, date, confidence
- Search dumps by content
- View AI processing results

#### 4. System Analytics (`/analytics`)
- **Total Dumps**: Trend over time
- **Active Users**: Daily/weekly/monthly actives
- **AI Processing**: Success rate, confidence distribution
- **Storage Usage**: Media files size tracking

#### 5. Search Metrics (`/analytics/search`)
- Popular search queries
- Search performance (latency, results)
- Vector vs. full-text usage
- Failed searches analysis

#### 6. AI Metrics (`/analytics/ai`)
- Categorization accuracy
- Confidence score distribution
- Processing failures
- Model performance trends

#### 7. Review Interface (`/review`)
- Flagged content moderation
- Low-confidence predictions
- User-reported issues
- Approve/reject actions

### Dashboard Shortcuts
```
Ctrl + K       - Quick search
Ctrl + /       - Command palette
Esc            - Close modals
Ctrl + R       - Refresh data
```

---

## Best Practices

### 1. Content Capture
✅ **DO:**
- Add context to voice notes
- Use descriptive titles for images
- Include dates/times for time-sensitive content
- Tag related dumps together

❌ **DON'T:**
- Send overly long voice notes (>2 minutes)
- Upload low-quality/blurry images
- Dump sensitive information without encryption
- Spam the system with duplicate content

### 2. Search Optimization
✅ **DO:**
- Use natural language queries
- Include context words (when, where, who)
- Try different phrasings if no results
- Use filters (date, category) to narrow results

❌ **DON'T:**
- Use single keywords only
- Expect exact phrase matches
- Search immediately after dumping (allow 1-2 seconds for processing)

### 3. API Usage
✅ **DO:**
- Implement retry logic with exponential backoff
- Cache frequently accessed data
- Use pagination for large result sets
- Handle rate limits gracefully

❌ **DON'T:**
- Poll endpoints continuously
- Store tokens in client-side storage (use httpOnly cookies)
- Skip error handling
- Ignore rate limit headers

### 4. Security
✅ **DO:**
- Use HTTPS for all API requests
- Rotate JWT secrets regularly
- Implement proper CORS policies
- Monitor for suspicious activity

❌ **DON'T:**
- Commit API keys to version control
- Share JWT tokens between users
- Disable authentication for "testing"
- Store plaintext passwords

---

## Troubleshooting

### Common Issues

#### 1. "Database connection failed"
**Cause**: Invalid DATABASE_URL or database not accessible

**Solution:**
```bash
# Test database connectivity
psql "postgresql://user:password@host:5432/database" -c "SELECT 1;"

# Check pgvector extension
psql "postgresql://..." -c "SELECT * FROM pg_extension WHERE extname='vector';"

# Install pgvector if missing
psql "postgresql://..." -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

#### 2. "Vector search not working"
**Cause**: Missing vector index or embeddings not generated

**Solution:**
```sql
-- Check for embeddings
SELECT COUNT(*) FROM dumps WHERE embedding IS NOT NULL;

-- Create HNSW index
CREATE INDEX idx_dumps_embedding_hnsw 
ON dumps USING hnsw(embedding vector_cosine_ops);

-- Regenerate embeddings
UPDATE dumps SET embedding = NULL WHERE embedding IS NULL;
-- Then trigger reprocessing via admin dashboard
```

#### 3. "Rate limit exceeded"
**Cause**: Too many requests in short time window

**Solution:**
```typescript
// Implement exponential backoff
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.response?.status === 429) {
        const delay = Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}
```

#### 4. "AI processing failed"
**Cause**: Invalid API keys, quota exceeded, or service outage

**Solution:**
```bash
# Test Anthropic API
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-3-5-sonnet-20241022","max_tokens":1024,"messages":[{"role":"user","content":"test"}]}'

# Check OpenAI API
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# View processing errors in logs
npm run logs -- --grep "AI processing failed"
```

### Health Checks

```bash
# Basic health
curl http://localhost:3000/health

# Database health
curl http://localhost:3000/health/db

# Detailed metrics
curl http://localhost:3000/health/detailed
```

### Logs

```bash
# View application logs
npm run logs

# Follow logs in real-time
npm run logs -- --follow

# Filter by level
npm run logs -- --level error

# Export logs
npm run logs -- --since 24h > logs_24h.txt
```

---

## FAQ

### General

**Q: What types of content can I dump?**  
A: Text, images (JPEG/PNG/PDF), voice notes (MP3/WAV/M4A), documents (PDF), and URLs.

**Q: How long is content stored?**  
A: Indefinitely by default. You can set auto-deletion rules in settings.

**Q: Is my data encrypted?**  
A: Yes, data is encrypted at rest (database) and in transit (HTTPS/TLS).

### Search

**Q: Why are my search results inaccurate?**  
A: Vector search works best with natural language. Try rephrasing your query or using full-text search.

**Q: Can I search by date?**  
A: Yes! Use filters: `?from=2024-01-01&to=2024-01-31`

**Q: How does semantic search work?**  
A: Content is converted to vector embeddings (3072-dimensional) using OpenAI's text-embedding-3-large model, enabling similarity-based search.

### AI Processing

**Q: What AI models are used?**  
A: Claude 3.5 Sonnet (categorization, summarization), text-embedding-3-large (search), ElevenLabs (voice synthesis).

**Q: Can I customize categories?**  
A: Yes! Admin dashboard allows adding/editing categories.

**Q: How accurate is categorization?**  
A: ~90% accuracy. Low-confidence predictions (<0.7) are flagged for manual review.

### Performance

**Q: Why is processing slow?**  
A: Large files (images >5MB, audio >10MB) take longer. Consider compressing before uploading.

**Q: What are the rate limits?**  
A: 100 requests/minute for most endpoints, 10/minute for uploads, 50/10s for search.

**Q: How to optimize search performance?**  
A: Use pagination, filter by category/date, and prefer hybrid search for best results.

### Deployment

**Q: Can I self-host?**  
A: Yes! Docker images available. See `docker-compose.yml` for configuration.

**Q: What are the infrastructure requirements?**  
A: 2GB RAM minimum, PostgreSQL with pgvector, object storage (S3/Supabase), Node.js 18+.

**Q: How to scale for production?**  
A: Use read replicas, Redis caching, CDN for static assets, and horizontal scaling with load balancers.

---

## Support

- **Documentation**: https://docs.clutter.ai
- **API Reference**: https://api.clutter.ai/docs
- **GitHub Issues**: https://github.com/your-org/clutter-ai-inbox/issues
- **Email**: support@clutter.ai
- **Discord**: https://discord.gg/clutter-ai

---

## License

MIT License - see [LICENSE](../LICENSE) file for details.

---

## Changelog

### v1.0.0 (2024-01-22)
- ✨ Initial release
- 🚀 Universal content capture
- 🔍 Vector + full-text search
- 🤖 AI processing (categorization, summarization, OCR, transcription)
- 🔔 Proactive reminders
- 📊 Admin dashboard with analytics
- 🔒 JWT authentication
- 📱 WhatsApp/Telegram bot integration
- 🐳 Docker deployment support
- 📝 Comprehensive API documentation
