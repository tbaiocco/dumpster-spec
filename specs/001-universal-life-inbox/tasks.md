# Tasks: Clutter.AI Universal Life Inbox

**Input**: Design documents from `/specs/001-universal-life-inbox/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: No explicit test requirements found in specifications - focusing on implementation tasks.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions
Based on plan.md structure: `backend/src/`, `admin-dashboard/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create backend project structure with NestJS in backend/
- [x] T002 Create admin dashboard structure with React in admin-dashboard/
- [x] T003 [P] Configure TypeScript, ESLint, and Prettier for backend in backend/.eslintrc.js and backend/tsconfig.json
- [x] T004 [P] Configure TypeScript, ESLint, and Prettier for frontend in admin-dashboard/.eslintrc.js and admin-dashboard/tsconfig.json
- [x] T005 [P] Setup package.json dependencies for NestJS, TypeORM, Supabase client in backend/package.json
- [x] T006 [P] Setup package.json dependencies for React, testing libraries in admin-dashboard/package.json
- [x] T007 Setup Docker development environment with docker-compose.yml
- [x] T008 Configure environment variables template in backend/.env.example and admin-dashboard/.env.example

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T009 Setup Supabase database connection and TypeORM configuration in backend/src/config/database.config.ts
- [x] T010 Create database migrations for core entities in backend/src/database/migrations/
- [x] T011 [P] Create User entity with TypeORM in backend/src/entities/user.entity.ts
- [x] T012 [P] Create Category entity with TypeORM in backend/src/entities/category.entity.ts  
- [x] T013 [P] Create Dump entity with TypeORM in backend/src/entities/dump.entity.ts
- [x] T014 [P] Create Reminder entity with TypeORM in backend/src/entities/reminder.entity.ts
- [x] T015 Seed categories table with predefined categories in backend/src/database/seeds/categories.seed.ts
- [x] T016 [P] Setup JWT authentication module in backend/src/modules/auth/auth.module.ts
- [x] T017 [P] Implement phone verification service in backend/src/modules/auth/phone-verification.service.ts
- [x] T018 [P] Setup global error handling and logging in backend/src/common/filters/http-exception.filter.ts
- [x] T019 [P] Configure CORS and security middleware in backend/src/main.ts
- [x] T020 [P] Setup Supabase Storage client for media files in backend/src/config/storage.config.ts
- [x] T021 [P] Setup AI services configuration (Claude, Google Cloud) in backend/src/config/ai.config.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Basic Content Capture and AI Processing (Priority: P1) 🎯 MVP

**Goal**: Users can send any content type (text, voice, photo) to WhatsApp bot and receive immediate AI-processed confirmation with categorization and actions taken.

**Independent Test**: Send various content types to WhatsApp bot and verify AI categorization, entity extraction, and confirmation responses work correctly.

### Implementation for User Story 1

- [x] T022 [P] [US1] Create AuthController with phone verification endpoints in backend/src/modules/auth/auth.controller.ts
- [x] T023 [P] [US1] Implement AuthService with JWT token generation in backend/src/modules/auth/auth.service.ts
- [x] T024 [P] [US1] Create UserService with CRUD operations in backend/src/modules/users/user.service.ts
- [x] T025 [P] [US1] Setup Telegram Bot API integration in backend/src/modules/bots/telegram.service.ts
- [x] T026 [P] [US1] Setup WhatsApp webhook handler via Twilio in backend/src/modules/bots/whatsapp.service.ts
- [x] T027 [P] [US1] Create Claude AI service for content understanding in backend/src/modules/ai/claude.service.ts
- [x] T028 [P] [US1] Create Google Cloud Speech-to-Text service in backend/src/modules/ai/speech.service.ts
- [x] T029 [P] [US1] Create Google Cloud Vision OCR service in backend/src/modules/ai/vision.service.ts
- [x] T030 [US1] Implement DumpService for content processing workflow in backend/src/modules/dumps/dump.service.ts
- [x] T031 [US1] Create WebhookController for Telegram bot interactions in backend/src/modules/dumps/controllers/telegram-webhook.controller.ts
- [x] T032 [US1] Create WebhookController for WhatsApp interactions in backend/src/modules/dumps/controllers/whatsapp-webhook.controller.ts
- [x] T033 [US1] Implement content categorization logic with confidence scoring in backend/src/modules/dumps/services/categorization.service.ts
- [x] T034 [US1] Implement entity extraction from text content in backend/src/modules/ai/extraction.service.ts
- [x] T035 [US1] Create bot response formatter for structured confirmations in backend/src/modules/ai/formatter.service.ts
- [x] T036 [US1] Add media file upload handling to Supabase Storage in backend/src/modules/ai/media-processor.service.ts
- [x] T037 [US1] Implement voice message transcription workflow in backend/src/modules/ai/voice-processor.service.ts
- [x] T038 [US1] Implement image OCR processing workflow in backend/src/modules/ai/image-processor.service.ts
- [x] T039 [US1] Add error handling for AI service failures with fallback responses in backend/src/modules/ai/fallback-handler.service.ts

**Checkpoint**: At this point, User Story 1 should be fully functional - users can dump content and receive AI-processed confirmations

---

## Phase 4: User Story 2 - Natural Language Search and Retrieval (Priority: P2)

**Goal**: Users can find previously dumped content using natural conversational language with fuzzy matching and semantic search.

**Independent Test**: Dump various content, then search with natural language queries and verify relevant results are returned with context.

### Implementation for User Story 2

- [x] T040 [P] [US2] Setup pgvector extension and embedding generation in backend/src/modules/search/vector.service.ts (✅ Implemented)
- [x] T041 [P] [US2] Create SearchService with natural language processing in backend/src/modules/search/search.service.ts (✅ Implemented)  
- [x] T042 [P] [US2] Implement search query enhancement using Claude API in backend/src/modules/search/query-enhancement.service.ts (✅ Implemented)
- [x] T043 [P] [US2] Create SearchController with search endpoints in backend/src/modules/search/search.controller.ts
- [x] T044 [US2] Implement semantic similarity search using pgvector in backend/src/modules/search/semantic-search.service.ts
- [x] T045 [US2] Add search result ranking and relevance scoring in backend/src/modules/search/ranking.service.ts
- [x] T046 [US2] Implement fuzzy text matching for partial queries in backend/src/modules/search/fuzzy-match.service.ts
- [x] T047 [US2] Add time-based filtering for search results in backend/src/modules/search/filters.service.ts
- [x] T048 [US2] Integrate search functionality into bot commands (/search) in backend/src/modules/bots/commands/search.command.ts
- [x] T049 [US2] Add search result formatting for bot responses in backend/src/modules/bots/formatters/search-formatter.service.ts

**Checkpoint**: At this point, User Story 2 should be fully functional - users can search and retrieve content using natural language

---

## Phase 4.1: US2 Production Optimization (Infrastructure) 

**Purpose**: Optimize natural language search for production performance and complete vector coverage

**⚠️ CRITICAL**: These tasks are essential for production-ready search performance

- [x] T049A Create vector performance index in database: CREATE INDEX CONCURRENTLY idx_dumps_content_vector ON dumps USING ivfflat (content_vector vector_cosine_ops);
- [x] T049B Run database migration 1730381000000-UpdateVectorDimension.ts to ensure schema consistency in production environment
- [x] T049C Complete vector backfill for existing 29 dumps without embeddings using validated embedding pipeline
- [x] T049D Add vector health monitoring and performance metrics to SearchService in backend/src/modules/search/search.service.ts

**Checkpoint**: US2 search is now production-ready with optimized performance and full coverage

---

## Phase 5: User Story 4 - Error Recovery and Manual Correction (Priority: P2)

**Goal**: When AI fails or misunderstands content, users can report issues and system handles edge cases gracefully without losing information.

**Independent Test**: Send ambiguous content, use /report command, and verify fallback systems work correctly with manual review workflow.

### Implementation for User Story 4

- [ ] T050 [P] [US4] Create bot command handlers for /recent, /report, /help in backend/src/modules/bots/commands/ 
- [ ] T051 [P] [US4] Implement manual review flagging system in backend/src/modules/dumps/review.service.ts
- [ ] T052 [P] [US4] Create review flagging API endpoints in backend/src/modules/dumps/review.controller.ts
- [ ] T053 [US4] Add confidence threshold handling for low-confidence AI results in backend/src/modules/ai/confidence.service.ts
- [ ] T054 [US4] Implement error reporting and user feedback collection in backend/src/modules/feedback/feedback.service.ts
- [ ] T055 [US4] Create FeedbackController for error reporting endpoints in backend/src/modules/feedback/feedback.controller.ts
- [ ] T056 [US4] Add graceful degradation for AI service outages in backend/src/modules/ai/resilience.service.ts
- [ ] T057 [US4] Implement content backup and recovery mechanisms in backend/src/modules/dumps/backup.service.ts

**Checkpoint**: At this point, User Story 4 should be fully functional - system gracefully handles AI failures and user corrections

---

## Phase 6: User Story 5 - Multi-Modal Content Processing (Priority: P2)

**Goal**: Users can dump any content type (voice, photos, emails, screenshots) and AI extracts meaningful information from each format.

**Independent Test**: Send various content types and verify appropriate processing for each format with extracted entities.

### Implementation for User Story 5

- [ ] T058 [P] [US5] Enhance image processing for document types (bills, receipts) in backend/src/modules/ai/document-processor.service.ts
- [ ] T059 [P] [US5] Implement email forwarding integration in backend/src/modules/email/email-processor.service.ts
- [ ] T060 [P] [US5] Add screenshot text extraction capabilities in backend/src/modules/ai/screenshot-processor.service.ts
- [ ] T061 [US5] Create content type detection and routing service in backend/src/modules/dumps/content-router.service.ts
- [ ] T062 [US5] Implement multi-language support for voice transcription in backend/src/modules/ai/multi-lang-speech.service.ts
- [ ] T063 [US5] Add handwriting recognition for photographed notes in backend/src/modules/ai/handwriting.service.ts
- [ ] T064 [US5] Create email ingestion webhook endpoint in backend/src/modules/email/email.controller.ts

**Checkpoint**: At this point, User Story 5 should be fully functional - system processes all content types effectively

---

## Phase 7: User Story 3 - Daily Digest, Proactive Reminders + Bot Search Integration (Priority: P3)

**Goal**: Users receive morning digests and contextual reminders at optimal times with proactive assistance. Users can search their content through natural conversation with bots.

**Independent Test**: Set up various dumps with different urgencies and verify digest content and reminder timing work correctly. Test conversational search through WhatsApp/Telegram bots.

### Implementation for User Story 3 + Bot Search

#### Core Reminder & Digest Features
- [ ] T065 [P] [US3] Create ReminderService with scheduling logic in backend/src/modules/reminders/reminder.service.ts
- [ ] T066 [P] [US3] Implement daily digest generation service in backend/src/modules/notifications/digest.service.ts
- [ ] T067 [P] [US3] Create ReminderController with reminder endpoints in backend/src/modules/reminders/reminder.controller.ts
- [ ] T068 [P] [US3] Setup cron jobs for digest delivery in backend/src/modules/notifications/cron.service.ts
- [ ] T069 [US3] Implement proactive reminder logic based on content analysis in backend/src/modules/reminders/proactive.service.ts
- [ ] T070 [US3] Create notification delivery service for multiple channels in backend/src/modules/notifications/delivery.service.ts
- [ ] T071 [US3] Add reminder completion tracking and follow-up logic in backend/src/modules/reminders/tracking.service.ts
- [ ] T072 [US3] Implement calendar integration for extracted events in backend/src/modules/calendar/calendar.service.ts
- [ ] T073 [US3] Add package tracking integration for delivery updates in backend/src/modules/tracking/package-tracking.service.ts

#### Bot Search Integration (User-Facing Search Interface)
- [ ] T074 [P] [US2+US3] Implement /search command handler for Telegram bot in backend/src/modules/bots/commands/search.command.ts
- [ ] T075 [P] [US2+US3] Implement /search command handler for WhatsApp bot in backend/src/modules/bots/whatsapp/search-handler.service.ts
- [ ] T076 [US2+US3] Create conversational search result formatter in backend/src/modules/bots/formatters/search-result.formatter.ts
- [ ] T077 [US2+US3] Integrate contextual search into daily digests ("You also have 3 items about...") in backend/src/modules/notifications/digest.service.ts
- [ ] T078 [US2+US3] Add search suggestions in proactive reminders ("Related to your task...") in backend/src/modules/reminders/proactive.service.ts
- [ ] T079 [US2+US3] Implement follow-up search queries ("/more" command) for additional results in backend/src/modules/bots/commands/more.command.ts

**Checkpoint**: At this point, User Story 3 should be fully functional - users receive timely digests, proactive reminders, AND can search their content through conversational bot commands (/search)

---

## Phase 8: Admin Dashboard (Cross-cutting)

**Purpose**: Administrative interface for system monitoring, analytics, and management
**Note**: Focus on monitoring and analytics - no user-facing search UI (that's handled by bots in Phase 7)

- [ ] T080 [P] Create admin authentication pages in admin-dashboard/src/pages/auth/
- [ ] T081 [P] Create user management interface in admin-dashboard/src/pages/users/UserListPage.tsx
- [ ] T082 [P] Create dumps overview and status monitoring in admin-dashboard/src/pages/dumps/DumpsPage.tsx
- [ ] T083 [P] Create system analytics dashboard (performance, usage metrics) in admin-dashboard/src/pages/analytics/AnalyticsPage.tsx
- [ ] T084 [P] Implement API client for admin operations in admin-dashboard/src/services/api.service.ts
- [ ] T085 [P] Create reusable UI components library in admin-dashboard/src/components/
- [ ] T086 [P] Add search performance monitoring dashboard (admin analytics only) in admin-dashboard/src/pages/analytics/SearchMetricsPage.tsx
- [ ] T087 [P] Create AI processing metrics and confidence tracking interface in admin-dashboard/src/pages/analytics/AIMetricsPage.tsx
- [ ] T088 Setup admin dashboard routing and navigation in admin-dashboard/src/App.tsx
- [ ] T089a [P] [US4] Create admin interface for reviewing flagged content in admin-dashboard/src/pages/ReviewPage.tsx

### Existing Admin Endpoints (Already Implemented)

**✅ COMPLETED**: The following admin functionality is already available in backend/src/app.controller.ts:
- [x] T088a Admin vector index recreation endpoint (/admin/recreate-vector-index)
- [x] T088b Admin vector health monitoring (/admin/vector-health) 
- [x] T088c Admin database cleanup utilities (/admin/clean-dumps)
- [x] T088d Admin AI service testing (/admin/test-claude)
- [x] T088e Admin environment diagnostics (/admin/env-check)

---

## Phase 9: Polish & Production Readiness

**Purpose**: Final optimizations and production deployment preparation

- [ ] T090 [P] Add comprehensive error logging and monitoring integration
- [ ] T091 [P] Implement rate limiting for API endpoints in backend/src/common/guards/throttle.guard.ts
- [ ] T092 [P] Add API documentation with Swagger in backend/src/main.ts
- [ ] T093 [P] Setup health check endpoints in backend/src/health/health.controller.ts
- [ ] T094 [P] Configure production environment variables and secrets
- [ ] T095 [P] Setup CI/CD pipeline configuration
- [ ] T096 Optimize database queries and add performance monitoring
- [ ] T097 Add security headers and HTTPS configuration
- [ ] T098 Setup backup and disaster recovery procedures
- [ ] T099 Create user documentation and onboarding materials

---

## Dependencies & Execution Strategy

### User Story Completion Order
```
Phase 1 (Setup) → Phase 2 (Foundation) → Phase 3 (US1) → Phase 4 (US2) → Phase 5 (US4) → Phase 6 (US5) → Phase 7 (US3) → Phase 8 (Admin) → Phase 9 (Polish)
```

### Parallel Execution Opportunities

**Within Phase 2 (Foundation)**: Tasks T011-T014 (entities), T016-T017 (auth), T018-T021 (config) can run in parallel

**Within Phase 3 (US1)**: Tasks T022-T029 (controllers and AI services) can run in parallel, then T030-T039 depend on earlier completion

**Within Phase 4 (US2)**: Tasks T040-T043 (search infrastructure) can run in parallel, then T044-T049 depend on search foundation

### Independent Test Criteria

- **US1**: Can send text/voice/image to bot and receive categorized AI response
- **US2**: Can search for dumped content using natural language and get relevant results  
- **US3**: Receives scheduled digests and proactive reminders based on content
- **US4**: Can report AI errors and system gracefully handles failures
- **US5**: All content types (email, screenshots, documents) are processed correctly

### MVP Scope Recommendation

**Suggested MVP**: Phase 1 + Phase 2 + Phase 3 (User Story 1 only)
- Core content capture and AI processing
- Basic bot interaction with confirmation responses
- Foundation for all other features

This provides immediate value while establishing the technical foundation for incremental feature delivery.

---

## ✅ REMEDIATION SUMMARY (November 4, 2025)

**Fixed Critical Issues:**
1. **Phase Dependency Resolved**: Split T052 into backend API (Phase 5) and frontend UI (Phase 8) 
2. **Task Status Updated**: Marked completed implementations (T040-T042, T050, T043-T049)
3. **Admin Endpoints Documented**: Added existing admin functionality (T088a-T088e)

**Key Changes:**
- T052: Split into backend API + frontend UI to resolve Phase 5→8 dependency
- T050: Marked complete (bot commands implemented in telegram.service.ts)
- T040-T049: Marked complete (search functionality fully implemented)
- Added T089a: Admin review interface moved to Phase 8
- Added T088a-e: Document existing admin endpoints

**Status**: Phase dependency conflicts resolved ✅ | Implementation gaps identified ✅ | Task organization improved ✅

---

## Summary

- **Total Tasks**: 98 tasks across 9 phases (+ Phase 4.1 production optimization)
- **User Story Distribution**: 
  - US1 (Basic Capture): 18 tasks
  - US2 (Search API): **10 tasks ✅ COMPLETE + 4 production optimization tasks**  
  - US2+US3 (Bot Search Integration): **6 new tasks for conversational search interface**
  - US3 (Reminders & Digest): 9 tasks + bot search integration
  - US4 (Error Recovery): 8 tasks
  - US5 (Multi-Modal): 7 tasks
  - Infrastructure/Admin: 9 tasks (production optimization + admin monitoring/analytics)
- **Search Implementation Strategy**: 
  - ✅ **API Layer Complete**: REST endpoint functional with semantic search
  - 🔄 **User Interface**: Bot commands (Phase 7) - conversational, not web-based
  - 📊 **Admin Interface**: Performance monitoring only (Phase 8)
- **Parallel Opportunities**: 52 tasks marked [P] can run in parallel within their phases
- **MVP Tasks**: 39 tasks (Phases 1-3) for core functionality, **US2 API already complete**
- **Independent Testing**: Each user story has clear test criteria and can be validated independently