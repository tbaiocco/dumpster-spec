# Clutter.AI - Product Overview & Capabilities (v2.1)

The Universal Life Inbox Powered by AI

Last Updated: May 19, 2026

---

## Executive Summary

Clutter.AI is an AI-native personal organization platform where users can capture anything and recover it later with high confidence.

The platform is now positioned as a 100% ready MVP with production-capable backend services and two dedicated web interfaces:
- user client for personal operations,
- admin dashboard for internal operations, moderation, and analytics.

Core value proposition:
- capture from chat and API channels,
- AI-assisted understanding and categorization,
- natural-language retrieval,
- reminders and tracking workflows,
- feedback loop and platform analytics for rapid iteration.

---

## MVP Status (Current)

### Product Stage
- MVP implementation: complete.
- Backend architecture: modular and deployable.
- Primary workflows: implemented across auth, capture, search, reminders, tracking, review, feedback, and analytics.

### Delivery Readiness
- Railway deployment path documented and implemented.
- Health checks and operational endpoints are present.
- Admin analytics pipeline is implemented with persisted metrics entities.

### Operational Readiness
- Human-in-the-loop moderation flow exists for low-confidence content.
- Platform-level diagnostics for vector and AI operations are available.
- User and admin web clients are active surfaces against the same backend core.

---

## Core Capabilities

### 1. Universal Content Capture

Multi-channel ingestion is implemented through backend modules and webhooks:
- Telegram webhook ingestion.
- WhatsApp webhook ingestion.
- Email webhook ingestion.
- API-driven text and media ingestion.

Supported content types in core entities and processing paths:
- text,
- voice/audio,
- image,
- email,
- document uploads through enhanced processing paths.

Enhanced dump endpoints support direct processing and file upload workflows.

---

### 2. AI Processing Pipeline

The backend processes captured content through a layered AI pipeline:
- content routing and processor selection,
- speech transcription for voice inputs,
- OCR and image/document extraction,
- Claude-powered content analysis,
- entity extraction with normalization,
- categorization with confidence and alternatives,
- embedding generation for semantic retrieval.

Important current implementation detail:
- embeddings are generated with local sentence-transformer inference via transformers.js and stored in pgvector-compatible columns.

---

### 3. Entity Extraction and Temporal Normalization

Extracted entities include:
- dates and times,
- locations,
- people and organizations,
- amounts,
- contact information (phone, email, URL).

Temporal normalization is implemented to convert relative expressions into machine-usable values, improving reminder quality and downstream automation consistency.

---

### 4. Natural Language Search

Search combines multiple strategies:
- semantic similarity,
- fuzzy matching,
- exact matching,
- unified ranking and pagination.

Filtering supports user-relevant dimensions such as content type, category, date ranges, confidence thresholds, urgency, and processing state.

Search telemetry is tracked asynchronously for performance and relevance monitoring.

---

### 5. Reminders and Time-Based Workflows

Reminder APIs support:
- creation,
- listing and upcoming queries,
- updates,
- snooze/dismiss/mark-sent actions,
- per-user stats.

This enables deadline and commitment workflows as part of the MVP, rather than leaving reminders as passive metadata only.

---

### 6. Tracking Workflows

Tracking module supports:
- trackable item creation and listing,
- status updates and completion,
- package tracking-oriented endpoints,
- detection helpers,
- per-user tracking stats.

This provides concrete package and item monitoring capabilities within the MVP backend.

---

### 7. Review and Moderation Loop

Low-confidence or flagged items can be reviewed through dedicated endpoints:
- list flagged content,
- inspect a flagged item,
- approve with edits,
- reject with reason.

This creates a practical quality-control loop between AI output and human validation.

---

### 8. Feedback System

Feedback is a first-class module in MVP:
- feedback submission,
- status lifecycle management,
- notes and upvotes,
- feedback analytics views in admin surface.

This supports continuous product improvement based on real user signal.

---

### 9. Admin Analytics and Observability

Admin analytics endpoints provide system and product telemetry across:
- system health and volume metrics,
- search performance metrics,
- AI processing metrics,
- user activity statistics,
- feature usage breakdown.

Metrics are persisted via dedicated entities for:
- search metrics,
- AI metrics,
- feature usage metrics.

Tracking is fire-and-forget by design to avoid blocking primary user flows.

---

### 10. Authentication, Authorization, and Profiles

Authentication model:
- phone verification code flow,
- JWT-based access for protected routes.

Profile support includes:
- read/update profile,
- timezone/language and notification preferences,
- chat-linking support for bot channels.

Role-based protection is enforced at admin interface level for operational areas.

---

## User and Admin Surfaces (MVP)

### User Client
Implemented user operations include:
- dashboard and personal dump review,
- natural-language search + filters,
- review queue interaction,
- reminders and tracking page,
- feedback submission/history,
- profile and preference management.

### Admin Dashboard
Implemented admin operations include:
- users and dumps management views,
- review moderation workflows,
- feedback operations,
- analytics suite (system/search/AI/users/features).

---

## Technical Infrastructure (Current)

Backend core:
- NestJS + TypeScript,
- TypeORM with PostgreSQL,
- pgvector extension for vector search,
- modular domain architecture.

AI and media stack:
- Claude for analysis and generation tasks,
- speech and vision processing services,
- local embeddings via transformers.js pipeline.

Deployment and operations:
- containerized production deploy via Docker,
- Railway deployment configuration and scripts,
- health endpoints and operational diagnostics.

---

## What Changed Since the Previous Overview

This update aligns the document to current implementation reality:
- marks MVP as complete and operationally ready,
- reflects local embedding architecture (not external embedding API dependency),
- confirms implemented reminders/tracking/review/feedback/admin analytics modules,
- emphasizes user-client and admin-dashboard as active product surfaces,
- removes investor-heavy and speculative framing from the core product status narrative.

---

## MVP Boundaries and Next Steps

### Included in MVP
- end-to-end ingestion to retrieval pipeline,
- moderation and quality loops,
- telemetry-backed admin operations,
- deployable backend with documented runbooks.

### Post-MVP Expansion (Roadmap)
- broader automation and proactive agent behaviors,
- deeper integrations (calendar, assistant surfaces, ecosystem connectors),
- more advanced multi-user coordination and enterprise controls.

These are expansion tracks, not blockers for current MVP readiness.

---

## Success Criteria for This MVP

Operational criteria:
- stable ingestion and processing across supported channels,
- reliable search with acceptable relevance and latency,
- measurable AI and feature telemetry in admin analytics,
- effective moderation throughput for flagged content.

Product criteria:
- users can capture, find, review, and act on information in one system,
- admins can monitor health and improve quality without direct database intervention.

---

## Conclusion

Clutter.AI backend is currently in a 100% ready MVP state for the intended product scope.

The system has moved beyond concept validation into an operational platform with implemented ingestion, intelligence, retrieval, moderation, tracking, reminders, feedback, and analytics. Current efforts can focus on scale, polish, and post-MVP expansion rather than foundational capability completion.
