# Implementation Plan: Clutter.AI Universal Life Inbox

**Branch**: `001-universal-life-inbox` | **Date**: October 22, 2025 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-universal-life-inbox/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Universal life inbox where users dump everything via WhatsApp/Telegram (text, voice, photos) and AI processes, organizes, and reminds them. Core dump-analyze-retrieve-remind cycle with robust fallback systems and aggressive AI automation (40-50% confidence threshold) for MVP validation.

## Technical Context

**Language/Version**: TypeScript 5.0+, Node.js 18+  
**Primary Dependencies**: NestJS (backend framework), Supabase (PostgreSQL + storage), pgvector (semantic search)  
**Storage**: PostgreSQL via Supabase (structured data), Supabase Storage (media files 1GB free tier)  
**Testing**: Jest (unit), Supertest (integration), Testcontainers (database testing)  
**Target Platform**: Railway (hosting), Telegram Bot API (Phase 1), WhatsApp via Twilio (Phase 2)  
**Project Type**: Web application (backend API + admin dashboard)  
**Performance Goals**: <10s content processing, <3s search queries, 1000 concurrent users  
**Constraints**: <200ms interactive responses, aggressive AI automation (40-50% confidence), phone verification auth  
**Scale/Scope**: MVP 1000 users, ~10k daily dumps, multi-modal content (text/voice/images)

**AI Services Integration**:
- Claude API (Anthropic) - content understanding and categorization
- OpenAI Whisper API - voice transcription  
- Google Cloud Vision API - OCR text extraction

**Frontend Technology**: React (admin dashboard) + React Native (future mobile app) for maximum code sharing and unified development experience

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Quality Gates Verification:**
- [x] **Specification Review**: Requirements are clear, testable, and aligned with user needs (5 prioritized user stories with acceptance criteria)
- [x] **Architecture Review**: Technical approach supports maintainability and performance goals (NestJS + Supabase for scalability)  
- [x] **Security Review**: Security implications assessed and mitigated appropriately (phone verification auth, sensitive data handling)
- [x] **Performance Impact**: Resource usage and response time implications evaluated (<10s processing, <3s search, 1000 concurrent users)
- [x] **Backward Compatibility**: Migration strategy defined for any breaking changes (N/A for new feature, future API versioning planned)

**Constitution Compliance:**
- [x] Code quality standards defined and enforceable (TypeScript strict mode, ESLint, Prettier, NestJS conventions)
- [x] Testing strategy covers unit, integration, and contract testing (Jest, Supertest, Testcontainers for DB testing)
- [x] UX consistency maintained with existing patterns (structured bot responses, consistent error handling)
- [x] Performance benchmarks defined (≤200ms interactive, ≤2s complex queries, ≤10s AI processing)
- [x] Backward compatibility or migration path documented (new feature, API versioning strategy for future changes)

## Project Structure

### Documentation (this feature)

```
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```
# Web application: Backend API + React Admin Dashboard
backend/
├── src/
│   ├── modules/
│   │   ├── auth/           # Phone verification, user management
│   │   ├── bots/           # Telegram/WhatsApp bot handlers  
│   │   ├── ai/             # Claude, Whisper, OCR services
│   │   ├── dumps/          # Content processing and storage
│   │   ├── search/         # Natural language search with pgvector
│   │   └── reminders/      # Proactive notifications and digests
│   ├── common/            # Shared utilities, guards, filters
│   ├── database/          # Migrations, seeds, entities
│   └── config/            # Environment and service configuration
├── test/
│   ├── unit/              # Jest unit tests
│   ├── integration/       # API endpoint tests with Supertest
│   └── e2e/               # End-to-end bot interaction tests
└── package.json

admin-dashboard/
├── src/
│   ├── components/        # Reusable React components
│   ├── pages/             # Admin pages (users, dumps, analytics)
│   ├── services/          # API clients and business logic
│   ├── hooks/             # Custom React hooks
│   └── utils/             # Shared utilities
├── public/                # Static assets
├── tests/                 # React Testing Library tests
└── package.json

# Future mobile app structure (Phase 3)
mobile/
├── src/
│   ├── components/        # Shared components from admin-dashboard
│   ├── screens/           # Mobile-specific screens
│   ├── services/          # Shared API clients
│   └── navigation/        # React Navigation setup
└── package.json
```

**Structure Decision**: Web application architecture chosen to support bot API backend with React admin dashboard. React/React Native stack selected for maximum code sharing with future mobile app. Modular NestJS backend structure for scalability and maintainability.

## Phase 0: Research & Design Decisions

✅ **COMPLETED** - Generated `research.md` with comprehensive technology stack decisions and architectural patterns. All NEEDS CLARIFICATION items resolved with frontend technology choice (React + React Native) for maximum code sharing with future mobile app.

## Phase 1: Design & Contracts

✅ **COMPLETED** - Generated complete design artifacts:

- **`data-model.md`**: Comprehensive PostgreSQL schema with 6 core entities, foreign key constraints, semantic search support via pgvector, and performance optimization strategies
- **`contracts/openapi.yaml`**: Full REST API specification with 25+ endpoints covering authentication, content management, search, reminders, and admin functionality
- **`quickstart.md`**: Developer onboarding guide with environment setup, testing procedures, and development workflow
- **Agent context updated**: GitHub Copilot context file updated with NestJS + TypeScript + Supabase technology stack

## Constitution Check (Post-Design)

*Re-evaluation after Phase 1 design completion*

**Quality Gates Verification:**
- [x] **Specification Review**: Requirements implemented in API contracts with clear CRUD operations and search functionality
- [x] **Architecture Review**: NestJS modular architecture supports maintainability with clear separation of concerns (auth, bots, ai, dumps, search, reminders)  
- [x] **Security Review**: Phone verification auth implemented, JWT tokens, sensitive data encryption at rest via Supabase
- [x] **Performance Impact**: pgvector semantic search, Redis caching strategy, database partitioning for scale defined
- [x] **Backward Compatibility**: API versioning strategy documented, semantic versioning for schema changes

**Constitution Compliance:**
- [x] Code quality standards defined and enforceable (TypeScript strict mode, ESLint Airbnb config, >80% test coverage requirement)
- [x] Testing strategy covers unit, integration, and contract testing (Jest, Supertest, Testcontainers, OpenAPI contract validation)
- [x] UX consistency maintained with existing patterns (structured API responses, consistent error formatting, standardized bot command responses)
- [x] Performance benchmarks defined and measurable (≤200ms API responses, ≤10s AI processing, ≤3s search queries, 1000 concurrent users)
- [x] Backward compatibility strategy documented (API versioning, database migrations, graceful service degradation)

**Additional Compliance Notes:**
- **Simplicity First**: NestJS chosen for enterprise readiness while maintaining developer productivity
- **Proven Technologies**: All tech stack choices are industry-standard (PostgreSQL, TypeScript, React, OpenAPI)
- **Long-term Viability**: Supabase provides managed infrastructure with clear scaling path, React/React Native enables code sharing
- **Team Capability**: TypeScript across full stack reduces context switching, extensive documentation provided
- **Documentation**: All architectural decisions documented with rationale in research.md

## Next Steps

✅ **Phase 0 & 1 Complete** - Ready for Phase 2 implementation planning via `/speckit.tasks`

The implementation plan provides comprehensive technical foundation including:
- **Data Model**: 6 entities with relationships, constraints, and semantic search capability  
- **API Design**: 25+ endpoints with full OpenAPI specification
- **Architecture**: Event-driven processing pipeline with microservices-ready modular design
- **Development Environment**: Complete quickstart guide with testing procedures
- **Technology Stack**: Enterprise-grade technologies with clear scaling path

## Implementation Readiness Assessment

### ✅ **Strengths**
- Complete data model with database schema (`data-model.md`)
- Full API specification with all endpoints (`contracts/openapi.yaml`)
- Comprehensive technology stack decisions with rationale (`research.md`)
- Developer onboarding guide with environment setup (`quickstart.md`)

### ⚠️ **Identified Gaps Requiring `/speckit.tasks`**
1. **Missing granular task breakdown**: High-level phases need day-by-day actionable tasks
2. **No cross-reference mapping**: Implementation steps should reference specific sections in detail files
3. **Unclear dependency sequences**: Need explicit order of what components must be built first
4. **Vague implementation patterns**: Architecture patterns need concrete code examples and setup instructions

### 📋 **Required Task Generation**

The next `/speckit.tasks` command should generate:

#### **Phase 1: Foundation (Week 1-2)**
**Task Group 1.1: Database & Auth Foundation**
- Task 1.1.1: Set up Supabase project → *Reference: quickstart.md Environment Setup*
- Task 1.1.2: Implement User entity → *Reference: data-model.md User table schema*
- Task 1.1.3: Create phone verification endpoints → *Reference: contracts/openapi.yaml /auth/verify*
- Task 1.1.4: Add JWT authentication middleware → *Reference: research.md Security decisions*

**Task Group 1.2: Core NestJS Setup**
- Task 1.2.1: Initialize NestJS project structure → *Reference: plan.md Project Structure*
- Task 1.2.2: Configure TypeORM with Supabase → *Reference: data-model.md Entity definitions*
- Task 1.2.3: Set up module boundaries → *Reference: research.md Microservices-ready monolith*
- Task 1.2.4: Implement health check endpoint → *Reference: quickstart.md API Health Check*

#### **Phase 1: Core Processing (Week 3-4)**
**Task Group 1.3: Content Ingestion**
- Task 1.3.1: Create Dump entity and processing pipeline → *Reference: data-model.md Dump schema + research.md Event-driven pipeline*
- Task 1.3.2: Set up Telegram bot webhook → *Reference: contracts/openapi.yaml /webhooks/telegram*
- Task 1.3.3: Implement Claude API client → *Reference: research.md AI Services Integration*
- Task 1.3.4: Add confidence-based routing (40-50% threshold) → *Reference: spec.md Clarifications*

#### **Dependency Tree Examples**
```
Phone Verification (1.1.2-1.1.4) → Bot Authentication (1.3.2) → Content Processing (1.3.3-1.3.4)
Database Setup (1.1.1-1.1.2) → Entity Definitions (1.3.1) → AI Processing (1.3.3)
```

**Recommended next command**: `/speckit.tasks` to generate detailed implementation tasks with proper cross-references and dependency management.

