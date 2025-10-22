# Clutter.AI Universal Life Inbox - Developer Quickstart

## Overview

Clutter.AI is an AI-powered universal life inbox where users dump everything they need to remember via WhatsApp/Telegram, and AI processes, organizes, and reminds them about it. This quickstart guide will get you up and running with the development environment.

## Prerequisites

- Node.js 18+ and npm/yarn
- PostgreSQL 14+ or Supabase account
- Git
- VS Code (recommended) with extensions:
  - TypeScript and JavaScript Language Features
  - REST Client
  - PostgreSQL (for local development)

## Tech Stack

- **Backend**: NestJS + TypeScript
- **Database**: PostgreSQL + pgvector (via Supabase)
- **Frontend**: React + TypeScript (admin dashboard)
- **Mobile**: React Native (future)
- **AI Services**: Claude API, Google Cloud Speech-to-Text, Google Cloud Vision
- **Messaging**: Telegram Bot API (Phase 1), WhatsApp via Twilio (Phase 2)
- **Hosting**: Railway (backend), Vercel (frontend)

**Google Cloud Integration**: Speech-to-Text and Vision APIs provide unified authentication and billing.

## Quick Setup (5 minutes)

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/your-org/clutter-ai.git
cd clutter-ai

# Install backend dependencies
cd backend
npm install

# Install admin dashboard dependencies
cd ../admin-dashboard
npm install
cd ..
```

### 2. Environment Setup

Create environment files:

**backend/.env.local**
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/clutter_ai_dev"

# Supabase (alternative to local PostgreSQL)
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_KEY="your-service-key"

# AI Services
CLAUDE_API_KEY="your-claude-api-key"
GOOGLE_CLOUD_PROJECT_ID="your-gcp-project-id"
GOOGLE_APPLICATION_CREDENTIALS="./path/to/gcp-service-account.json"

# Bot Configuration
TELEGRAM_BOT_TOKEN="your-telegram-bot-token"
TELEGRAM_WEBHOOK_SECRET="your-webhook-secret"

# WhatsApp (Phase 2)
TWILIO_ACCOUNT_SID="your-twilio-sid"
TWILIO_AUTH_TOKEN="your-twilio-token"
WHATSAPP_PHONE_NUMBER="whatsapp:+1234567890"

# JWT & Security
JWT_SECRET="your-jwt-secret-256-bits"
PHONE_VERIFICATION_SERVICE="twilio"  # or "mock" for development

# Application
NODE_ENV="development"
PORT=3000
API_PREFIX="v1"
```

**admin-dashboard/.env.local**
```env
REACT_APP_API_URL="http://localhost:3000/v1"
REACT_APP_ENVIRONMENT="development"
```

### 3. Database Setup

#### Option A: Local PostgreSQL

```bash
# Install PostgreSQL and create database
createdb clutter_ai_dev

# Enable pgvector extension
psql clutter_ai_dev -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Run migrations
cd backend
npm run migration:run
npm run seed:dev
```

#### Option B: Supabase (Recommended for quickstart)

1. Create account at [supabase.com](https://supabase.com)
2. Create new project
3. Go to SQL Editor and run:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
4. Copy connection details to `.env.local`
5. Run migrations:
   ```bash
   cd backend
   npm run migration:run
   npm run seed:dev
   ```

### 4. Start Development Servers

```bash
# Terminal 1: Backend API
cd backend
npm run start:dev

# Terminal 2: Admin Dashboard
cd admin-dashboard
npm start

# Terminal 3: Telegram Bot (for testing)
cd backend
npm run bot:telegram
```

## Development Workflow

### Project Structure

```
clutter-ai/
├── backend/                 # NestJS API server
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/        # Phone verification
│   │   │   ├── bots/        # Telegram/WhatsApp handlers
│   │   │   ├── ai/          # Claude, Google Speech-to-Text, Vision
│   │   │   ├── dumps/       # Content processing
│   │   │   ├── search/      # Semantic search
│   │   │   └── reminders/   # Notifications
│   │   ├── common/          # Shared utilities
│   │   └── database/        # TypeORM entities & migrations
│   ├── test/                # Jest tests
│   └── package.json
├── admin-dashboard/         # React admin interface
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── pages/           # Admin pages
│   │   ├── services/        # API clients
│   │   └── hooks/           # Custom React hooks
│   └── package.json
└── docs/                    # Documentation
    ├── api/                 # API documentation
    └── deployment/          # Deployment guides
```

### Key Development Commands

```bash
# Backend
npm run start:dev          # Start dev server with hot reload
npm run test               # Run unit tests
npm run test:e2e           # Run end-to-end tests
npm run migration:generate # Generate new migration
npm run migration:run      # Run pending migrations
npm run lint               # ESLint check
npm run format             # Prettier format

# Admin Dashboard
npm start                  # Start React dev server
npm test                   # Run React tests
npm run build              # Production build
npm run analyze            # Bundle size analysis
```

## Testing Your Setup

### 1. API Health Check

```bash
curl http://localhost:3000/v1/health
# Expected: {"status": "ok", "database": "connected"}
```

### 2. Create Test User

```bash
# Request verification code
curl -X POST http://localhost:3000/v1/auth/verify/request \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "+1234567890"}'

# In development, check logs for verification code
# Confirm verification
curl -X POST http://localhost:3000/v1/auth/verify/confirm \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "+1234567890", "verification_code": "123456"}'
```

### 3. Test Content Processing

```bash
# Create a dump (use token from verification response)
curl -X POST http://localhost:3000/v1/dumps \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "raw_content": "Remind me to pay electricity bill by Friday, it is $180",
    "content_type": "text"
  }'

# Check processing status
curl http://localhost:3000/v1/dumps \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 4. Test Telegram Bot (if configured)

1. Start Telegram bot: `npm run bot:telegram`
2. Send `/start` to your bot
3. Send test message: "Remind me to call dentist tomorrow"
4. Verify response and database entry

### 5. Admin Dashboard

1. Open http://localhost:3001
2. Login with verified phone number
3. View dumps and processing status
4. Test manual correction features

## Key Features to Implement

### Phase 1: Core MVP (4-6 weeks)

**Week 1-2: Foundation**
- [x] Project setup and database schema → *See: data-model.md for complete schema*
- [ ] Phone verification authentication → *Implementation: contracts/openapi.yaml /auth/verify endpoints*
- [ ] Basic Telegram bot integration → *Implementation: contracts/openapi.yaml /webhooks/telegram*
- [ ] Claude + Google Cloud AI integration → *Architecture: research.md AI Services Integration*

**Implementation Sequence for Week 1-2:**
1. **Database Setup** (`backend/src/database/`)
   - Create TypeORM entities from `data-model.md` schemas
   - Set up migrations for User, Category, Dump tables
   - Configure Supabase connection per environment setup above
   
2. **Authentication Module** (`backend/src/modules/auth/`)
   - Implement phone verification service (Twilio or mock)
   - Create JWT token generation and validation
   - Add auth guard for protected endpoints
   - *Reference*: `contracts/openapi.yaml` auth endpoints for exact API contract

3. **Core Infrastructure** (`backend/src/common/`)
   - Set up logging and error handling
   - Configure environment validation
   - Add health check endpoint
   - *Reference*: Testing section below for validation procedures

**Week 3-4: Core Processing**
- [ ] Content ingestion pipeline → *Architecture: research.md Event-driven processing*
- [ ] AI analysis with confidence thresholds (40-50%) → *Specification: spec.md Clarifications session*
- [ ] Entity extraction and storage → *Schema: data-model.md Entity table*
- [ ] Basic search functionality → *API: contracts/openapi.yaml /search endpoint*

**Implementation Sequence for Week 3-4:**
1. **Content Processing Module** (`backend/src/modules/dumps/`)
   - Create Dump entity with processing status tracking
   - Implement content validation and storage
   - Set up media file handling via Supabase Storage
   - *Reference*: `data-model.md` Dump table schema and validation rules

2. **AI Integration Module** (`backend/src/modules/ai/`)
   - Set up Claude API client with error handling
   - Configure Google Cloud Speech-to-Text for voice processing
   - Configure Google Cloud Vision API for image/OCR processing
   - Implement confidence-based routing (40-50% threshold)
   - Create entity extraction service
   - Add fallback mechanisms for AI service failures
   - *Reference*: `research.md` AI Services Integration section

3. **Bot Integration Module** (`backend/src/modules/bots/`)
   - Create Telegram webhook handler
   - Implement structured response formatting
   - Add command processing (/start, /search, /recent, /report)
   - *Reference*: `contracts/openapi.yaml` webhook endpoints and `spec.md` bot commands

**Week 5-6: User Interface**
- [ ] Admin dashboard for content review → *Structure: plan.md admin-dashboard/ layout*
- [ ] Manual correction system (/report equivalent) → *API: contracts/openapi.yaml /dumps/{id}/report*
- [ ] Basic reminders and notifications → *Schema: data-model.md Reminder table*
- [ ] Error handling and status tracking → *Implementation: research.md Error recovery patterns*

**Implementation Sequence for Week 5-6:**
1. **Admin Dashboard Foundation** (`admin-dashboard/src/`)
   - Set up React project with TypeScript
   - Create API client using OpenAPI specification
   - Implement authentication flow with JWT tokens
   - *Reference*: `contracts/openapi.yaml` for complete API integration

2. **Content Management UI** (`admin-dashboard/src/pages/`)
   - Build dumps list with filtering and pagination
   - Create dump detail view with AI analysis display
   - Add manual correction interface for AI errors
   - Implement status tracking dashboard
   - *Reference*: `data-model.md` for data relationships and constraints

3. **Reminder System** (`backend/src/modules/reminders/`)
   - Create reminder scheduling service
   - Implement notification delivery via bot
   - Add snooze and completion tracking
   - *Reference*: `data-model.md` Reminder table schema and business logic

### Phase 2: Enhanced Features (2-4 weeks)

- [ ] Voice transcription (Whisper API)
- [ ] OCR processing (Google Vision)
- [ ] Semantic search with pgvector
- [ ] Proactive reminders and daily digest
- [ ] WhatsApp integration via Twilio

### Phase 3: Production Ready (2-3 weeks)

- [ ] Performance optimization and caching
- [ ] Comprehensive monitoring and alerting
- [ ] Mobile app foundation (React Native)
- [ ] Advanced analytics dashboard

## Development Guidelines

### Code Quality Standards

- **TypeScript**: Strict mode enabled, full type coverage
- **Linting**: ESLint with Airbnb config + Prettier
- **Testing**: >80% code coverage required
- **Documentation**: JSDoc for public APIs
- **Git**: Conventional commits, feature branches

### Testing Strategy

```bash
# Unit tests (Jest)
npm run test                # All unit tests
npm run test:watch          # Watch mode
npm run test:coverage       # Coverage report

# Integration tests
npm run test:integration    # API endpoints
npm run test:e2e           # Full user flows

# Database tests
npm run test:db            # Testcontainers with real PostgreSQL
```

### AI Integration Patterns

```typescript
// AI service abstraction
interface AIProcessor {
  process(content: string, type: ContentType): Promise<ProcessingResult>;
  confidence(): number;
}

// Confidence-based routing
if (result.confidence < 0.4) {
  await this.flagForReview(dump, result);
} else {
  await this.saveProcessedDump(dump, result);
}

// Fallback chain
const processors = [claudeProcessor, fallbackProcessor];
for (const processor of processors) {
  try {
    return await processor.process(content, type);
  } catch (error) {
    this.logger.warn(`Processor failed: ${error.message}`);
  }
}
```

### Performance Monitoring

- **Response Time**: <200ms for interactive endpoints
- **AI Processing**: <10s for content analysis
- **Search Performance**: <3s for semantic queries
- **Database**: Connection pooling, query optimization
- **Caching**: Redis for frequently accessed data

## Deployment

### Development Deployment

```bash
# Railway (Backend)
npm install -g @railway/cli
railway login
railway init
railway add postgresql
railway deploy

# Vercel (Frontend)
npm install -g vercel
vercel login
vercel --prod
```

### Environment Variables

Copy and configure environment variables for production:

- Database connection strings
- API keys for AI services
- Bot tokens and webhook secrets
- JWT secrets and security configuration
- Monitoring and analytics tokens

## Troubleshooting

### Common Issues

**Database Connection Errors**
```bash
# Check PostgreSQL service
pg_ctl status
# Verify connection string format
echo $DATABASE_URL
```

**AI Service Configuration**
```bash
# Check Claude API key
curl -H "Authorization: Bearer $CLAUDE_API_KEY" https://api.anthropic.com/v1/health

# Verify Google Cloud credentials
gcloud auth application-default print-access-token

# Test Google Cloud Speech API
curl -H "Authorization: Bearer $(gcloud auth application-default print-access-token)" \
     -H "Content-Type: application/json" \
     "https://speech.googleapis.com/v1/speech:recognize"
```

**Bot Webhook Issues**
```bash
# Verify webhook URL is publicly accessible
curl https://your-domain.railway.app/v1/webhooks/telegram
```

### Debug Mode

```bash
# Enable verbose logging
DEBUG=clutter:* npm run start:dev

# Database query logging
NODE_ENV=development npm run start:dev
```

## Next Steps

1. **Complete Phase 1 MVP**: Focus on core dump-analyze-retrieve cycle
2. **User Testing**: Deploy to staging and gather feedback
3. **Performance Optimization**: Implement caching and monitoring
4. **Mobile App**: Start React Native development
5. **Production Launch**: Deploy with monitoring and analytics

## Support

- **Documentation**: `/docs` directory
- **API Reference**: `/docs/api` or OpenAPI spec
- **Issues**: GitHub Issues for bug reports
- **Discussions**: GitHub Discussions for questions

Happy coding! 🚀