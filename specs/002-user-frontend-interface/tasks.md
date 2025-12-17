# Tasks: User Frontend Interface

**Input**: Design documents from `/specs/002-user-frontend-interface/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests are OPTIONAL per specification - only included where explicitly requested. This feature focuses on implementation-first approach with testing integrated into acceptance criteria.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions
- **New application**: `user-client/src/`, `user-client/tests/`
- **Source for porting**: `admin-dashboard/src/` (reference only, no modifications)
- **Backend**: `backend/` (black box - REST API integration only)

---

## Phase 1: Setup (Scaffolding New Application)

**Purpose**: Initialize new React application and port design system from admin-dashboard

- [x] T001 Initialize new React app with Vite in user-client/ directory (sibling to admin-dashboard)
- [x] T002 Configure user-client to run on port 3000 (separate from admin-dashboard port 3001)
- [x] T003 Install dependencies: react-router-dom@7.9.5, axios@1.13.2, tailwindcss, date-fns, lucide-react, @headlessui/react, class-variance-authority
- [x] T004 Create .env.example with REACT_APP_API_URL=http://localhost:3001 (backend URL)
- [x] T005 [P] Copy tailwind.config.js from admin-dashboard/ to user-client/ (Clutter.AI brand tokens)
- [x] T006 [P] Copy postcss.config.js from admin-dashboard/ to user-client/
- [x] T007 Configure user-client/src/index.css with Tailwind directives (@tailwind base/components/utilities)
- [x] T008 Update user-client/public/index.html with Google Fonts preconnect (Outfit + Inter)
- [x] T009 Create user-client/README.md with setup, run, and build instructions

**Phase 1 Status**: ✅ COMPLETE - Verified build and dev server working on port 3000

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Shared Types

- [x] T010 [P] Create user-client/src/types/dump.types.ts with User, Dump, DumpDerived, ExtractedEntities interfaces and DumpStatus, UrgencyLevel, ContentType, TimeBucket enums
- [x] T011 [P] Create user-client/src/types/search.types.ts with SearchFilters, SearchResults interfaces
- [x] T012 [P] Create user-client/src/types/feedback.types.ts with Feedback interface and FeedbackStatus, FeedbackCategory enums

### Authentication & API Infrastructure

- [x] T013 Port admin-dashboard/src/services/api.ts to user-client/src/services/api.ts (Axios instance with auth interceptor)
- [x] T014 Update user-client/src/services/api.ts baseURL to use import.meta.env.VITE_API_URL
- [x] T015 Port admin-dashboard/src/contexts/AuthContext.tsx to user-client/src/contexts/AuthContext.tsx
- [x] T016 Port admin-dashboard/src/hooks/useAuth.ts to user-client/src/hooks/useAuth.ts
- [x] T017 Port admin-dashboard/src/components/ProtectedRoute.tsx to user-client/src/components/ProtectedRoute.tsx
- [x] T018 Port admin-dashboard/src/pages/auth/Login.tsx to user-client/src/pages/auth/LoginPage.tsx (adapted with Clutter.AI branding)

### Base UI Components (Ported from admin-dashboard)

- [x] T019 [P] Port admin-dashboard/src/components/ui/Button.tsx to user-client/src/components/ui/Button.tsx
- [x] T020 [P] Port admin-dashboard/src/components/ui/Card.tsx to user-client/src/components/ui/Card.tsx
- [x] T021 [P] Port admin-dashboard/src/components/ui/Input.tsx to user-client/src/components/ui/Input.tsx
- [x] T022 [P] Create user-client/src/components/ui/TextArea.tsx (NEW component with Clutter.AI styling)
- [x] T023 [P] Port admin-dashboard/src/components/ui/Modal.tsx to user-client/src/components/ui/Modal.tsx

### New UI Components

- [x] T024 [P] Create user-client/src/components/ui/Badge.tsx with variants (overdue red, pending yellow, approved green, rejected gray)
- [x] T025 [P] Create user-client/src/components/LoadingSpinner.tsx with purple gradient Clutter.AI branding
- [x] T026 [P] Create user-client/src/components/ErrorBoundary.tsx with retry button
- [x] T027 [P] Create user-client/src/components/Toast.tsx for notifications (success, error, info, warning types)
- [x] T028 [P] Create user-client/src/components/EmptyState.tsx with icon, title, message, optional action props

### Layout & Routing

- [x] T029 Create user-client/src/components/DashboardLayout.tsx (user-focused layout with navigation)
- [x] T030 Create user-client/src/App.tsx with React Router v7 routes: /login, /, /search, /tracking, /feedback
- [x] T031 Wrap protected routes (/*, /search, /tracking, /feedback) in ProtectedRoute component
- [x] T032 Configure React.lazy for code-splitting on Dashboard, Search, Tracking, Feedback pages
- [x] T033 Wrap App with AuthProvider, ToastProvider, ErrorBoundary in App.tsx (main.tsx already renders App)

**Phase 2 Status**: ✅ COMPLETE - Foundation ready, build verified, all 24 tasks complete

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - View Daily Action Items (Priority: P1) 🎯 MVP

**Goal**: Display user's actionable items organized by time buckets (Today, Tomorrow, This Week, etc.) with proper sorting and filtering by userId

**Independent Test**: Log in as user with seeded dump data containing various dates/urgency levels, verify today's items appear correctly ordered with Clutter.AI brand identity

### Core Utilities for User Story 1

- [x] T034 [P] [US1] Create user-client/src/utils/time-buckets.ts with assignTimeBucket function using date-fns (calendar-based logic per clarification Q2)
- [x] T035 [P] [US1] Create user-client/src/utils/sorting.ts with sortDumps function (primary: date, secondary: urgency, tertiary: created)
- [x] T036 [P] [US1] Create user-client/src/utils/formatting.ts with date/text display helpers

### API Service for User Story 1

- [x] T037 [US1] Create user-client/src/services/dumps.service.ts with fetchDumps(userId) → GET /api/dumps?userId={userId} (auth header via interceptor)

### State Management for User Story 1

- [x] T038 [US1] Create user-client/src/contexts/DumpsContext.tsx with state (dumps, loading, error) and actions (fetchDumps, refetchDumps)
- [x] T039 [US1] Create user-client/src/hooks/useDumps.ts wrapping DumpsContext with convenience methods
- [x] T040 [US1] Create user-client/src/hooks/useTimeBuckets.ts to compute DumpDerived properties and bucket dumps (overdue, today, tomorrow, thisWeek, nextWeek, future)

### UI Components for User Story 1

- [x] T041 [US1] Create user-client/src/components/DumpCard.tsx displaying category badge, rawContent preview (50 chars), displayDate, urgency indicator, reminder/tracking icons, optional Accept/Reject buttons
- [x] T042 [US1] Add overdue styling to DumpCard: red left border + "OVERDUE" badge for isOverdue=true (per clarification Q1)
- [x] T043 [US1] Create user-client/src/components/TimeBucket.tsx collapsible section with lazy rendering, expand/collapse toggle, empty state message
- [x] T044 [US1] Create user-client/src/pages/Dashboard.tsx using DashboardLayout, fetching dumps via useDumps, grouping via useTimeBuckets, rendering 6 TimeBucket components (Overdue always expanded, Today expanded, others collapsed)
- [x] T045 [US1] Add "Show Actions" toggle to Dashboard header controlling showActions prop on DumpCard components
- [x] T046 [US1] Add loading state (LoadingSpinner) and error state (error message + retry button) to Dashboard

**Checkpoint**: At this point, User Story 1 (View Daily Action Items) should be fully functional and testable independently. Dashboard loads <2s (SC-001).

---

## Phase 4: User Story 2 - Search My Information (Priority: P1)

**Goal**: Enable natural language search with advanced filters, displaying results filtered by userId

**Independent Test**: Create user with diverse dump data, perform various natural language queries, verify results correctly filtered by userId and match search criteria

### API Service for User Story 2

- [x] T047 [P] [US2] Create user-client/src/services/search.service.ts with searchDumps(query, filters) → POST /api/search (auth header via interceptor)
- [x] T048 [P] [US2] Add fetchFilterEnums() → GET /api/metadata/enums to search.service.ts (per clarification Q3)

### State Management for User Story 2

- [x] T049 [US2] Create user-client/src/contexts/SearchContext.tsx with state (query, filters, results, loading, error, pagination) and actions (setQuery, setFilters, executeSearch, nextPage, prevPage, resetSearch)
- [x] T050 [US2] Create user-client/src/hooks/useSearch.ts wrapping SearchContext with debounced search (300ms delay)

### UI Components for User Story 2

- [x] T051 [P] [US2] Create user-client/src/components/SearchBar.tsx with large input, gradient border, search icon, placeholder "Ask anything about your dumps..."
- [x] T052 [US2] Create user-client/src/components/FilterPanel.tsx collapsible panel with multi-select checkboxes (contentTypes, categories, urgencyLevels), minConfidence slider, dateRange pickers, reset button
- [x] T053 [US2] Create user-client/src/pages/Search.tsx with SearchBar at top, FilterPanel below, results grid using DumpCard (showActions=true), pagination (20 per page)
- [x] T054 [US2] Call fetchFilterEnums() on Search page mount, store enum options in SearchContext for FilterPanel dropdowns
- [x] T055 [US2] Add loading state (LoadingSpinner overlay) and empty state (EmptyState component with suggestions) to Search page
- [x] T056 [US2] Implement debounce logic in useSearch hook (300ms) to reduce API calls, cancel previous requests on new input

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently. Search returns results <3s (SC-002).

---

## Phase 5: User Story 3 - Review and Accept Items (Priority: P1)

**Goal**: Provide detail modal for reviewing dumps, editing fields, and accepting with optimistic UI updates

**Independent Test**: Open dump detail modal, edit fields, accept, verify changes persist and status updates to Approved

### Optimistic Update Infrastructure

- [x] T057 [US3] Create user-client/src/hooks/useOptimistic.ts generic hook for optimistic UI updates with rollback pattern (per clarification Q5 and research.md)

### API Service for User Story 3

- [x] T058 [US3] Add updateDump(id, updates) → PATCH /api/dumps/:id to user-client/src/services/dumps.service.ts (auth header via interceptor)

### State Management for User Story 3

- [x] T059 [US3] Add acceptDump(id, updates) action to DumpsContext with optimistic update flow (immediate local update, API call, rollback on failure)

### UI Components for User Story 3

- [x] T060 [US3] Create user-client/src/components/DumpDetailModal.tsx using Modal component, displaying category dropdown, rawContent (readonly), notes textarea, extracted entities display
- [x] T061 [US3] Add form validation to DumpDetailModal: category required, notes optional max 500 chars, show validation errors
- [x] T062 [US3] Add "Accept" button to DumpDetailModal triggering acceptDump with form values
- [x] T063 [US3] Implement modal routing via query param ?dumpId=123 for shareable URLs
- [x] T064 [US3] Wire DumpCard onClick to open DumpDetailModal with selected dump
- [x] T065 [US3] Add optimistic UI handling: status updates immediately, on failure show error toast + revert state + keep modal open + preserve user edits + show "Retry" button (per clarification Q5)
- [x] T066 [US3] Add success state: show success toast, close modal, refresh dashboard without full page reload

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work independently. API operations <300ms (SC-004), optimistic updates functional (SC-005).

---

## Phase 6: User Story 4 - Reject Unwanted Items (Priority: P2)

**Goal**: Enable users to reject dumps with reason/notes, updating status to Rejected

**Independent Test**: Open dump detail modal, select rejection reason, provide notes, verify status updates to Rejected and item removed from dashboard

### State Management for User Story 4

- [x] T067 [US4] Add rejectDump(id, reason) action to DumpsContext with validation (reason min 10 chars) and optimistic update flow

### UI Components for User Story 4

- [x] T068 [US4] Add "Reject" button to DumpDetailModal opening rejection reason textarea + submit flow
- [x] T069 [US4] Add rejection form validation: reason required min 10 chars, show validation errors blocking API call
- [x] T070 [US4] Wire DumpCard "Reject" button (when showActions=true) to open modal with reject mode active
- [x] T071 [US4] Implement optimistic UI for reject: status updates immediately, on failure show error toast + revert + keep modal open + retry button
- [x] T072 [US4] Add success state: show success toast, close modal, remove item from dashboard view without page reload

**Checkpoint**: At this point, User Stories 1-4 should all work independently. Users can accept and reject items.

**Phase 6 Status**: ✅ COMPLETE - Reject workflow implemented with optimistic updates and validation

---

## Phase 7: User Story 5 - Manage Reminders and Tracking (Priority: P2)

**Goal**: Dedicated view filtering dumps with reminder/tracking entities, styled with iconography and timeline layout

**Independent Test**: Create dumps with reminder and tracking entities, navigate to Reminders & Tracking hub, verify correct filtering and visual styling

### UI Components for User Story 5

- [x] T073 [P] [US5] Create user-client/src/components/Timeline.tsx chronological list view with date markers (alternative to time buckets)
- [x] T074 [US5] Create user-client/src/pages/Tracking.tsx filtering dumps by hasReminder=true OR hasTracking=true, grouping into "Reminders" and "Tracking" sections
- [x] T075 [US5] Add reminder styling to DumpCard: Bell icon (lucide-react), warm yellow/orange left border, "Reminder" badge when hasReminder=true
- [x] T076 [US5] Add tracking styling to DumpCard: Package icon (lucide-react), cyan left border, "Tracking" badge when hasTracking=true
- [x] T077 [US5] Add empty state to Tracking page when no reminders/tracking items exist
- [x] T078 [US5] Reuse TimeBucket or Timeline components for organizing reminders/tracking by date buckets

**Checkpoint**: At this point, User Stories 1-5 should all work independently. Specialized views functional.

**Phase 7 Status**: ✅ COMPLETE - Reminders & Tracking hub implemented with Timeline view and visual styling

---

## Phase 8: User Story 6 - View Future Items (Priority: P2)

**Goal**: Display future time buckets (Tomorrow, Next Week, Next Month) collapsed by default with expand/collapse functionality

**Independent Test**: Create dumps with various future dates, verify they appear in correct time buckets, buckets can be expanded/collapsed

### Implementation for User Story 6

- [x] T079 [US6] Verify time bucket calculation logic in user-client/src/utils/time-buckets.ts handles Tomorrow, Next Week, Next Month per calendar-based definitions (clarification Q2)
- [x] T080 [US6] Verify TimeBucket component lazy rendering: only render dump cards when expanded (performance optimization per FR-004)
- [x] T081 [US6] Verify Dashboard renders Tomorrow, This Week, Next Week, Future buckets collapsed by default with "Show Actions" toggle
- [x] T082 [US6] Add expand/collapse state persistence (optional): remember user's expanded buckets in localStorage

**Checkpoint**: At this point, User Stories 1-6 should all work independently. Forward planning enabled.

**Phase 8 Status**: ✅ COMPLETE - Future items functionality verified and enhanced with localStorage persistence

---

## Phase 9: User Story 7 - Provide Product Feedback (Priority: P3)

**Goal**: Feedback submission form and "My Feedback" list with status badges

**Independent Test**: Submit feedback with various categories/messages, view submitted feedback in "My Feedback" list with color-coded status badges

### API Service for User Story 7

- [X] T083 [P] [US7] Create user-client/src/services/feedback.service.ts with submitFeedback(feedback) → POST /api/feedback (auth header via interceptor)
- [X] T084 [P] [US7] Add fetchMyFeedback() → GET /api/feedback?userId={userId} to feedback.service.ts

### UI Components for User Story 7

- [X] T085 [P] [US7] Create user-client/src/components/FeedbackForm.tsx with category dropdown (bug, feature_request, general), message textarea (min 10 chars), rating (1-5 stars), submit button
- [X] T086 [P] [US7] Create user-client/src/components/MyFeedbackList.tsx fetching feedback via fetchMyFeedback, rendering list with status badges
- [X] T087 [US7] Add form validation to FeedbackForm: message ≥10 chars, rating 1-5, category required, show validation errors
- [X] T088 [US7] Create user-client/src/pages/Feedback.tsx with FeedbackForm at top, MyFeedbackList at bottom
- [X] T089 [US7] Implement status badge color coding in MyFeedbackList: Pending=yellow Clock icon, In Review=blue Eye icon, Resolved=green CheckCircle icon, Rejected=red XCircle icon (per clarification Q4)
- [X] T090 [US7] Add success state to FeedbackForm: show success toast "Feedback submitted! We'll review it soon.", clear form, refresh MyFeedbackList
- [X] T091 [US7] Add error handling to FeedbackForm: show error toast with retry button on API failure

**Checkpoint**: All 7 user stories should now be independently functional.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and final QA

### Mobile Responsiveness

- [ ] T092 [P] Test Dashboard at 320px (iPhone SE), 768px (iPad), 1024px (desktop) breakpoints - verify time buckets stack vertically, cards full-width on mobile
- [ ] T093 [P] Test Search page at 3 breakpoints - verify SearchBar full-width, FilterPanel collapsible on mobile, results stack vertically
- [ ] T094 [P] Test Tracking page at 3 breakpoints - verify Timeline view works on mobile, cards stack vertically
- [ ] T095 [P] Test Feedback page at 3 breakpoints - verify FeedbackForm stacks vertically, list responsive
- [ ] T096 [P] Test DumpDetailModal at 3 breakpoints - verify full-screen on mobile with slide-up animation, form fields stack vertically
- [ ] T097 Verify all touch targets ≥44x44px (buttons, links) per iOS guidelines across all pages
- [ ] T098 Test swipe gestures for modal dismiss on mobile devices

### Performance Optimization

- [ ] T099 Verify Dashboard loads in <2 seconds (SC-001) - use Chrome DevTools Lighthouse, optimize if needed
- [ ] T100 Verify Search returns results in <3 seconds (SC-002) - test with various queries, optimize debounce if needed
- [ ] T101 Verify API operations complete in <300ms (SC-004) - monitor network tab, check interceptor overhead
- [ ] T102 Verify smooth 60fps animations and interactions - test time bucket expand/collapse, modal open/close
- [ ] T103 Test system with 1000 concurrent users scenario (SC-008) - load testing if infrastructure available

### Brand Identity Verification

- [X] T104 [P] Verify all Clutter.AI brand elements applied: Electric Purple (#B929EB) + Bright Cyan (#2DD9F6) gradient, Warm Stone (#FAFAF9) background
- [X] T105 [P] Verify typography: Outfit for headings, Inter for body text across all pages
- [X] T106 [P] Verify custom shadows and charming rounded corners applied to cards, modals, buttons

### Cross-Cutting Testing

- [X] T107 Test error handling across all API calls: 401/403 redirects to login, 500 shows error toast with retry
- [X] T108 Test optimistic UI updates across Accept/Reject flows: immediate update, rollback on failure, retry button works (SC-005)
- [X] T109 Test authentication flow: login redirects to dashboard, logout clears state and redirects to login, protected routes enforce auth
- [X] T110 Verify userId filtering on all data operations: user can only see their own dumps/feedback/search results
- [X] T111 Test empty states across all views: Dashboard with no dumps, Search with no results, Tracking with no items, Feedback with no submissions

### Documentation & Final QA

- [X] T112 Update user-client/README.md with: setup instructions, environment variables, run/build commands, port configuration (3000 vs admin 3001)
- [X] T113 Create user-client/Dockerfile for containerized deployment
- [X] T114 Verify .env.example includes all required variables: REACT_APP_API_URL
- [ ] T115 Run final QA against all 10 success criteria from spec.md (SC-001 through SC-010)
- [X] T116 Verify no breaking changes to existing admin-dashboard functionality (admin app still runs independently on port 3001)
- [X] T117 Test deployment readiness: build succeeds, assets optimized, environment variables configurable

**Checkpoint**: All 10 success criteria pass, feature production-ready for independent deployment.

---

## Phase 11: Security Fixes & Missing API Features (Post-Audit)

**Purpose**: Address critical security vulnerabilities and implement missing API features identified in audit

**⚠️ CRITICAL**: Task T118 (Search userId) MUST be completed before production deployment

### Critical Security Fixes

- [ ] T118 [CRITICAL] [SECURITY] Fix search userId filtering - add userId to SearchRequest type and searchDumps() call using useAuth(), verify backend validates userId from JWT token, test cross-user data exposure scenarios

### High Priority Features

- [ ] T119 [P] Create user-client/src/pages/ProfilePage.tsx with GET /auth/profile to display user settings (timezone, language, notification preferences)
- [ ] T120 [P] Add profile update form in ProfilePage with PATCH /auth/profile for timezone, language, digest_time, notification preferences
- [ ] T121 [P] Add profile link to DashboardLayout navigation menu

### Reminder Management (User Story 5 Enhancement)

- [ ] T123 [P] Add snooze button to reminder cards in TrackingPage calling POST /api/reminders/:id/snooze with snooze_until datetime picker
- [ ] T124 [P] Add dismiss button to reminder cards calling POST /api/reminders/:id/dismiss
- [ ] T125 [P] Create EditReminderModal component with form for reminder_text, reminder_date, status fields
- [ ] T126 [P] Wire EditReminderModal to PUT /api/reminders/:id endpoint with validation

### Package Tracking Management (User Story 5 Enhancement)

- [ ] T127 [P] Add "Track Package" button/form to TrackingPage calling POST /api/tracking/package with trackingNumber input
- [ ] T128 [P] Add "Detect Tracking" button on DumpCard calling POST /api/tracking/detect with dumpId (when tracking entities likely present)
- [ ] T129 [P] Create TrackingStatusModal component for updating package status with status text, notes, location fields
- [ ] T130 [P] Wire TrackingStatusModal to PUT /api/tracking/:id/status endpoint
- [ ] T131 [P] Add "Mark Delivered" button to tracking cards calling PUT /api/tracking/:id/complete

### Search Enhancements

- [ ] T132 [P] Implement search suggestions in SearchBar component calling GET /api/search/suggestions on input focus
- [ ] T133 [P] Add debounced suggestion fetching (200ms) with keyboard navigation (arrow keys, enter) in SearchBar
- [ ] T134 [P] Add search result relevance feedback with thumbs up/down icons on search result cards calling POST /api/search/feedback

### Dump Management Features

- [ ] T135 [P] Create "New Dump" button in Dashboard header opening NewDumpModal
- [ ] T136 [P] Create NewDumpModal with text input mode calling POST /api/dumps/enhanced with userId, raw_content, content_type fields
- [ ] T137 [P] Add file upload input to NewDumpModal calling POST /api/dumps/upload (multipart/form-data) with file, userId, caption
- [ ] T138 Add "Delete Forever" button to DumpDetailModal with confirmation modal calling DELETE /api/dumps/:id (permanent deletion vs reject status change)

### Security & UX Improvements

- [ ] T139 Add URL access control verification for ?dumpId= query param - verify dump belongs to authenticated user, show "Access Denied" modal if mismatch, redirect to dashboard on unauthorized access
- [ ] T140 [P] Add content truncation to DumpCard limiting rawContent to 200 characters with "Read More" link expanding to full modal
- [ ] T141 Add upvote capability to MyFeedbackList calling POST /api/feedback/:feedbackId/upvote with upvote count display

**Checkpoint**: Critical security issue resolved, profile management functional, enhanced reminder/tracking management, complete dump lifecycle management.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-9)**: All depend on Foundational phase completion
  - User Story 1 (P1): Can start after Foundational - No dependencies on other stories
  - User Story 2 (P1): Can start after Foundational - No dependencies on other stories
  - User Story 3 (P1): Depends on User Story 1 (needs DumpsContext, DumpCard)
  - User Story 4 (P2): Depends on User Story 3 (extends Accept flow with Reject)
  - User Story 5 (P2): Depends on User Story 1 (filters/styles DumpCard)
  - User Story 6 (P2): Depends on User Story 1 (verifies time bucket logic)
  - User Story 7 (P3): Can start after Foundational - No dependencies on other stories
- **Polish (Phase 10)**: Depends on all desired user stories being complete
- **Security & Features (Phase 11)**: Can start after Phase 10, T118 MUST complete before production deployment

### User Story Dependencies Summary

```
Foundational (Phase 2) [BLOCKS ALL]
    ├─→ User Story 1 (Dashboard) [P1] ─┬─→ User Story 3 (Accept) [P1] ─→ User Story 4 (Reject) [P2]
    │                                   ├─→ User Story 5 (Reminders) [P2]
    │                                   └─→ User Story 6 (Future) [P2]
    ├─→ User Story 2 (Search) [P1] [INDEPENDENT]
    └─→ User Story 7 (Feedback) [P3] [INDEPENDENT]
```

### Parallel Opportunities

- **Phase 1 (Setup)**: Tasks T005, T006 (config copies) can run in parallel
- **Phase 2 (Foundational)**: 
  - Tasks T010-T012 (types) can run in parallel
  - Tasks T019-T023 (ported UI components) can run in parallel
  - Tasks T024-T028 (new UI components) can run in parallel
- **User Story 1**: Tasks T034-T036 (utils) can run in parallel
- **User Story 2**: Tasks T047-T048 (API services) can run in parallel, Task T051 (SearchBar) parallel with T052 (FilterPanel)
- **User Story 7**: Tasks T083-T084 (API services) can run in parallel, Tasks T085-T086 (components) can run in parallel
- **Phase 10 (Polish)**: Tasks T092-T098 (mobile testing), T104-T106 (brand verification) can run in parallel

### Team Parallelization Strategy

With multiple developers after Foundational phase completes:
- **Developer A**: User Story 1 (Dashboard) → User Story 3 (Accept) → User Story 4 (Reject)
- **Developer B**: User Story 2 (Search) → User Story 6 (Future)
- **Developer C**: User Story 5 (Reminders) → User Story 7 (Feedback)
- **All**: Phase 10 (Polish) tasks can be distributed across team

---

## Parallel Example: User Story 1

```bash
# Launch all utility functions together:
Task T034: "Create user-client/src/utils/time-buckets.ts"
Task T035: "Create user-client/src/utils/sorting.ts"
Task T036: "Create user-client/src/utils/formatting.ts"

# After utilities complete, launch components in parallel:
Task T041: "Create user-client/src/components/DumpCard.tsx"
Task T043: "Create user-client/src/components/TimeBucket.tsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1-3 Only - Core P1)

1. Complete Phase 1: Setup (scaffold new app, port design system)
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (View Daily Action Items)
4. Complete Phase 4: User Story 2 (Search)
5. Complete Phase 5: User Story 3 (Accept)
6. **STOP and VALIDATE**: Test User Stories 1-3 independently
7. Run basic Phase 10 QA (T099-T111)
8. Deploy/demo MVP

### Incremental Delivery

1. MVP (Stories 1-3) → Deploy
2. Add User Story 4 (Reject) → Test → Deploy
3. Add User Story 5 (Reminders) → Test → Deploy
4. Add User Story 6 (Future) → Test → Deploy
5. Add User Story 7 (Feedback) → Test → Deploy
6. Complete Phase 10 (Polish) → Final Deploy

Each story adds value without breaking previous stories.

### Full Feature Completion

1. Complete Phase 1 (Setup) - App scaffolded
2. Complete Phase 2 (Foundational) - Foundation ready
3. Complete Phases 3-9 (All 7 User Stories) - All features implemented
4. Complete Phase 10 (Polish) - Production ready
5. Final QA against all 10 success criteria
6. Deploy as standalone application

---

## Notes

- **Separation of Concerns**: This feature builds a completely separate React application (`user-client/`) alongside `admin-dashboard/`. All file paths reference `user-client/src/...`
- **Design System Consistency**: Tailwind config and UI components (Button, Card, Modal, Input, etc.) are ported from `admin-dashboard/` in Phase 2 to ensure visual consistency
- **Independent Deployment**: `user-client/` runs on port 3000 (vs admin-dashboard on 3001), has its own `package.json`, and deploys independently
- **Backend Integration**: Backend is treated as black box - all integration via REST API with authentication headers (enforced by Axios interceptor)
- **[P] tasks**: Different files, no dependencies - can run in parallel
- **[Story] label**: Maps task to specific user story for traceability
- **Each user story**: Should be independently completable and testable
- **Granularity**: 1 task = 1 PR (117 total tasks across 10 phases)
- **Commit strategy**: Commit after each task or logical group of [P] tasks
- **Testing approach**: Implementation-first with acceptance criteria validation (tests optional, not explicitly requested in spec)
- **Performance targets**: Dashboard <2s (SC-001), Search <3s (SC-002), API <300ms (SC-004)
- **Brand compliance**: All Clutter.AI brand elements non-negotiable (colors, fonts, shadows)
- **Mobile-first**: Responsive design mandatory, tested at 3 breakpoints (320px, 768px, 1024px)
