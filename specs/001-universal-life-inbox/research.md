# Research & Technology Decisions

**Feature**: Clutter.AI Universal Life Inbox  
**Date**: October 22, 2025  
**Phase**: 0 - Research and Architecture

## Quick Reference Index

**For Implementation Cross-References:**
- **Database Schema** → `data-model.md` (6 entities with relationships)
- **API Contracts** → `contracts/openapi.yaml` (25+ endpoints)
- **Development Setup** → `quickstart.md` (environment and testing)
- **Project Structure** → `plan.md` (NestJS modules and React components)

**Key Implementation Patterns:**
- **Authentication Flow** → Phone Verification section + `contracts/openapi.yaml` /auth/verify
- **Content Processing** → Event-Driven Pipeline section + `data-model.md` Dump entity
- **AI Integration** → AI Services section + confidence thresholds in `spec.md` Clarifications
- **Search Implementation** → Database section (pgvector) + `contracts/openapi.yaml` /search
- **Bot Handlers** → Messaging Platform section + `contracts/openapi.yaml` /webhooks

## Technology Stack Decisions

### Backend Framework: NestJS + TypeScript

**Decision**: NestJS (TypeScript) for backend API framework

**Rationale**: 
- Enterprise-ready with built-in support for dependency injection, guards, interceptors
- Excellent TypeScript integration for type safety across the application
- Strong ecosystem for integrations (Telegram, WhatsApp, AI services)
- Built-in support for microservices architecture if needed for scaling
- Familiar to team and widely adopted in enterprise environments

**Alternatives considered**:
- Express.js: Too minimal, requires more boilerplate for enterprise features
- Fastify: Good performance but smaller ecosystem for AI/bot integrations
- Next.js API routes: Not suitable for complex bot webhook handling

### Database & Search: PostgreSQL + pgvector via Supabase

**Decision**: Supabase (managed PostgreSQL) with pgvector extension for semantic search

**Rationale**:
- PostgreSQL provides ACID compliance for sensitive user data (bills, reminders)
- pgvector enables semantic search without additional infrastructure
- Supabase provides managed database, storage, and real-time features
- Generous free tier (500MB database, 1GB storage) suitable for MVP
- Built-in authentication and row-level security for future scaling

**Alternatives considered**:
- MongoDB + Vector Search: Less mature vector search, weaker consistency guarantees
- Pinecone + PostgreSQL: Additional service complexity and cost
- Redis + PostgreSQL: Redis not suitable for primary data storage

### AI Services Integration

**Decision**: Multi-service approach with Claude, Google Cloud Speech-to-Text, and Google Vision

**Rationale**:
- Claude API (Anthropic): Best-in-class for content understanding and categorization
- Google Cloud Speech-to-Text API: Highly accurate voice transcription with 60 minutes free per month
- Google Cloud Vision API: Accurate OCR with generous free tier (1000 requests/month)
- Google Cloud integration provides unified billing and authentication for Speech + Vision
- **Cost-effective for MVP**: Free tiers support initial user validation before scaling costs
- Service diversity reduces vendor lock-in and allows optimization per use case

**Alternatives considered**:
- OpenAI Whisper API: Good but Google Speech-to-Text offers better free tier and integration with Vision API
- OpenAI GPT-4 only: Good but Claude better for understanding nuanced content
- Azure Cognitive Services: More expensive, less generous free tiers for MVP phase

### Messaging Platform Strategy

**Decision**: Telegram (Phase 1) → WhatsApp via Twilio (Phase 2)

**Rationale**:
- Telegram Bot API: Free, simple setup, excellent for MVP validation
- Telegram supports rich formatting for structured bot responses
- WhatsApp via Twilio: Production-ready, pay-as-you-go pricing model
- Phased approach reduces initial complexity while maintaining target platform

**Alternatives considered**:
- WhatsApp Business API directly: Complex approval process, high minimum costs
- Discord/Slack bots: Not aligned with target user behavior (personal organization)
- SMS only: Limited media support, poor user experience

### Frontend Architecture: React + React Native

**Decision**: React for admin dashboard, React Native for future mobile app

**Rationale**:
- Maximum code sharing (60-80%) between web and mobile platforms
- Unified development team skillset and tooling
- Shared business logic, API clients, and styling patterns
- Large ecosystem for bot management and analytics libraries
- Better performance than Angular for real-time dashboard updates

**Alternatives considered**:
- Angular + Ionic: Good but different paradigms reduce code sharing
- Angular web + React Native mobile: Requires maintaining two framework skillsets
- React web + native iOS/Android: Limited code sharing, higher development cost

### Hosting & Infrastructure

**Decision**: Railway for backend hosting, Vercel for admin dashboard

**Rationale**:
- Railway: Simple deployment, generous free tier, excellent for NestJS applications
- Automatic SSL, environment management, and database connections
- Vercel: Optimized for React applications, seamless CI/CD integration
- Cost-effective for MVP while providing clear scaling path

**Alternatives considered**:
- AWS/GCP: Overcomplicated for MVP, higher initial costs
- Heroku: More expensive than Railway with similar features
- DigitalOcean: Requires more DevOps management

## Architecture Patterns

### Simplified Processing Pipeline

**Decision**: Synchronous processing for MVP with async upgrade path

**MVP Rationale**:
- Direct webhook → AI processing → database storage flow
- Simpler debugging and error handling for initial validation
- Lower latency for immediate user feedback
- **Future**: Add Bull/BullMQ queuing when volume requires it

**Constitutional Compliance**: Follows "Simplicity First" principle - avoid premature optimization

**Pattern**: Webhook → Validate → Process (Claude API) → Store → Respond

### Repository Pattern with TypeORM

**Decision**: Repository pattern with TypeORM for data access

**Rationale**:
- Provides abstraction layer for testing and future database changes
- TypeORM offers excellent TypeScript integration and migration support
- Repository pattern enables clean separation of business logic
- Supports both active record and data mapper patterns

### Simplified Monolith

**Decision**: Simple modular structure with clear boundaries

**Rationale**:
- Single deployment for MVP simplicity
- Clear module separation for future extraction if needed
- Shared database for ACID consistency
- Reduced complexity for initial development

**Modules**: Auth, Webhooks, AI, Content, Search, Reminders

## Security & Privacy Decisions

### Phone Number Verification

**Decision**: SMS/WhatsApp verification for user authentication

**Rationale**:
- Aligns with messaging platform trust model
- Familiar user experience, minimal friction
- Sufficient security for personal productivity application
- Enables linking multiple messaging accounts to single user

### Data Encryption Strategy

**Decision**: Encryption at rest and in transit with optional client-side encryption

**Rationale**:
- Supabase provides encryption at rest by default
- HTTPS/TLS for all API communications
- Optional client-side encryption for sensitive content (bills, personal info)
- Row-level security for multi-tenant data isolation

### GDPR/Privacy Compliance

**Decision**: Privacy-by-design with explicit consent and data export

**Rationale**:
- Clear consent flow during onboarding
- User-controlled data retention policies
- Complete data export capability (FR-042)
- Transparent AI processing with user control (/report command)

## Performance & Scaling Strategy

### Caching Strategy

**Decision**: Multi-layer caching with Redis for hot data

**Rationale**:
- Redis for frequently accessed user preferences and recent dumps
- PostgreSQL query optimization for search operations
- CDN caching for static assets and media files
- Application-level caching for AI service responses

### AI Service Optimization

**Decision**: Intelligent batching and confidence-based routing

**Rationale**:
- Batch similar content types for improved processing efficiency
- Cache common OCR and transcription results
- Route based on confidence scores to reduce manual review overhead
- Implement fallback chains for service outages

**Processing Flow**: Content → Classification → Route by confidence → Process → Store → Confirm

## Implementation Priority

### Phase 1: Core MVP (4-6 weeks)
1. Telegram bot with basic content capture
2. Claude integration for categorization  
3. PostgreSQL storage with basic search
4. Phone verification authentication
5. Simple admin dashboard for content review

### Phase 2: Enhanced Processing (2-4 weeks)
1. Voice transcription with Whisper
2. OCR integration with Google Vision
3. Semantic search with pgvector
4. Proactive reminders and daily digest
5. Error recovery and manual correction

### Phase 3: Production Ready (2-3 weeks)
1. WhatsApp integration via Twilio
2. Performance optimization and caching
3. Comprehensive monitoring and alerting
4. Mobile app foundation (React Native)
5. Advanced analytics dashboard

## Risk Mitigation

### AI Service Dependencies
- Implement circuit breakers for external API calls
- Fallback to manual review when services unavailable
- Cache successful responses to reduce API calls
- Monitor costs and implement usage limits

### Data Loss Prevention
- Immediate persistence of all user inputs
- Redundant storage for critical user data
- Regular database backups with point-in-time recovery
- Transaction logging for audit trails

### Performance Degradation
- Database connection pooling and query optimization
- Horizontal scaling strategy with load balancers
- Content delivery network for media files
- Progressive enhancement for mobile users

This research phase has resolved all technical uncertainties and provided a clear foundation for Phase 1 design and implementation.