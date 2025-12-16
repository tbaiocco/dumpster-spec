# Implementation Plan: User Frontend Interface

**Branch**: `002-user-frontend-interface` | **Date**: 2025-12-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-user-frontend-interface/spec.md`

## Summary

Build a modern, charming, and efficient client-side application for Clutter.AI that allows users to view, search, review, and manage their captured information dumps. The frontend interfaces with an existing NestJS backend via REST APIs, implementing time-bucketed dashboards, natural language search, optimistic UI updates, and a design system adhering to the Clutter.AI brand identity (Electric Purple + Bright Cyan gradient, Warm Stone background, Outfit/Inter typography).

## Technical Context

**Language/Version**: TypeScript 4.9.5, React 19.2.0, Node.js 18+  
**Primary Dependencies**: 
- React Router DOM 7.9.5 (routing)
- Axios 1.13.2 (API client with interceptors)
- Tailwind CSS 3.x (utility-first styling)
- date-fns (date manipulation for time buckets)
- Lucide React (icon library)
- Headless UI (accessible component primitives)
- Class Variance Authority (component variants)

**Storage**: N/A (frontend only; backend handles persistence via PostgreSQL)  
**Testing**: Jest, React Testing Library, MSW (Mock Service Worker for contract tests)  
**Target Platform**: Modern web browsers (Chrome, Firefox, Safari, Edge), mobile-responsive  
**Project Type**: Web application (frontend single-page application)  
**Performance Goals**:
- Dashboard initial load: <2 seconds
- Search results: <3 seconds
- API operations: <300ms response time
- Smooth 60fps animations and interactions

**Constraints**:
- Mobile-first responsive design (mandatory)
- All API calls must include authentication headers
- Strict userId filtering on all data operations
- Optimistic UI updates for Accept/Reject actions
- Brand identity adherence (colors, fonts, shapes, shadows non-negotiable)

**Scale/Scope**:
- Support 1000 concurrent users (per success criteria)
- Handle hundreds of dumps per user
- 7 main user stories (3x P1, 3x P2, 1x P3)
- 4 primary routes (/, /search, /tracking, /feedback)
- 25 functional requirements

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Quality Gates Verification:**
- [x] **Specification Review**: Requirements are clear, testable, and aligned with user needs
  - 25 functional requirements validated via requirements.md checklist (16/16 passed)
  - All clarifications integrated (overdue logic, time buckets, filter enums, feedback status, optimistic errors)
  - Edge cases documented in spec.md (empty states, error handling, partial data)
  - Acceptance criteria testable (e.g., "Dashboard loads in <2s", "Search returns results in <3s")

- [x] **Architecture Review**: Technical approach supports maintainability and performance goals
  - React Context chosen over Redux (justified in research.md - simpler for scope)
  - Component hierarchy documented in data-model.md (DashboardLayout > TimeBucket > DumpCard)
  - API contracts defined in api-contracts.md (6 REST endpoints with OpenAPI-style docs)
  - Code-splitting strategy defined (React.lazy for routes)
  - Performance targets achievable (<2s dashboard, <3s search, <300ms API)

- [x] **Security Review**: Security implications assessed and mitigated appropriately
  - All API calls require Bearer token authentication (emphasized per user request)
  - Backend enforces userId filtering (no client-side spoofing)
  - Input validation on all forms (edit modal requires category/notes, feedback requires 10-char message)
  - No sensitive data persisted client-side (stateless token in memory)
  - HTTPS-only deployment (standard practice)

- [x] **Performance Impact**: Resource usage and response time implications evaluated
  - Dashboard load <2s via lazy loading future buckets (FR-004)
  - Search <3s (backend responsibility, frontend optimized with debounce)
  - API operations <300ms (measured via SC-004)
  - Optimistic UI reduces perceived latency for Accept/Reject
  - Virtual scrolling NOT required unless datasets exceed 100+ items per time bucket

- [x] **Backward Compatibility**: Migration strategy defined for any breaking changes
  - Additive feature (no existing functionality modified)
  - Reuses existing auth flow (no migration required)
  - Backend API already operational (integration-only work)
  - No database schema changes (backend responsibility)
  - Isolated feature branch deployment (002-user-frontend-interface)

**Constitution Compliance:**
- [x] Code quality standards defined and enforceable: TypeScript strict mode, ESLint + Prettier, React best practices
- [x] Testing strategy covers unit, integration, and contract testing: Jest + React Testing Library (≥80% coverage), MSW for API mocking
- [x] UX consistency maintained with existing patterns: Reuses DashboardLayout.tsx, follows Tailwind utility patterns, maintains Clutter.AI brand identity
- [x] Performance benchmarks defined: Dashboard <2s (SC-001), Search <3s (SC-002), API <300ms (SC-004), 60fps animations
- [x] Backward compatibility documented: Additive feature with no breaking changes, isolated feature branch deployment

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
user-client/ (NEW - separate React application for end users)
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── ui/              # Base components (Button, Card, Modal, Badge, Input) - PORTED from admin-dashboard
│   │   ├── DashboardLayout.tsx  # Main layout wrapper (NEW - user-focused)
│   │   ├── ProtectedRoute.tsx   # Auth wrapper (PORTED from admin-dashboard)
│   │   ├── LoadingSpinner.tsx   # Loading component (NEW)
│   │   ├── ErrorBoundary.tsx    # Error boundary (NEW)
│   │   ├── Toast.tsx            # Toast notifications (NEW)
│   │   └── EmptyState.tsx       # Empty state component (NEW)
│   ├── pages/               # Route components
│   │   ├── Dashboard.tsx    # Main dashboard with time buckets (NEW)
│   │   ├── Search.tsx       # Search interface (NEW)
│   │   ├── Tracking.tsx     # Reminders/tracking hub (NEW)
│   │   ├── Feedback.tsx     # Feedback submission/list (NEW)
│   │   └── auth/            # Login/auth pages (PORTED from admin-dashboard)
│   │       ├── Login.tsx
│   │       └── Logout.tsx
│   ├── services/            # API client layer
│   │   ├── api.ts           # Axios instance with auth interceptor (PORTED from admin-dashboard)
│   │   ├── dumps.service.ts # GET/PATCH /api/dumps (NEW)
│   │   ├── search.service.ts # POST /api/search (NEW)
│   │   └── feedback.service.ts # POST/GET /api/feedback (NEW)
│   ├── contexts/            # React Context providers
│   │   ├── AuthContext.tsx  # Auth state (PORTED from admin-dashboard)
│   │   ├── DumpsContext.tsx # Dump state management (NEW)
│   │   └── SearchContext.tsx # Search state management (NEW)
│   ├── hooks/               # Custom hooks
│   │   ├── useAuth.ts       # Auth hook (PORTED from admin-dashboard)
│   │   ├── useDumps.ts      # Dump fetching/mutations (NEW)
│   │   ├── useSearch.ts     # Search logic (NEW)
│   │   ├── useOptimistic.ts # Optimistic update pattern (NEW)
│   │   └── useTimeBuckets.ts # Time bucket calculations (NEW)
│   ├── utils/               # Helper functions
│   │   ├── time-buckets.ts  # Date manipulation logic (NEW)
│   │   ├── sorting.ts       # Dump sorting algorithms (NEW)
│   │   └── formatting.ts    # Display formatting (NEW)
│   ├── types/               # TypeScript definitions
│   │   ├── dump.types.ts    # Dump, DumpDerived, ExtractedEntities (NEW)
│   │   ├── search.types.ts  # SearchFilters, SearchResults (NEW)
│   │   └── feedback.types.ts # Feedback, FeedbackStatus (NEW)
│   ├── App.tsx              # Root component (NEW)
│   └── index.tsx            # Entry point (NEW)
├── tests/
│   ├── unit/                # Component/hook unit tests
│   │   ├── components/
│   │   ├── hooks/
│   │   └── utils/
│   ├── integration/         # Multi-component integration tests
│   │   ├── Dashboard.integration.test.tsx
│   │   ├── Search.integration.test.tsx
│   │   └── Feedback.integration.test.tsx
│   └── contract/            # API contract tests with MSW
│       ├── dumps.contract.test.ts
│       ├── search.contract.test.ts
│       └── feedback.contract.test.ts
├── public/
│   ├── index.html           # HTML entry point
│   ├── manifest.json        # PWA manifest
│   └── robots.txt
├── tailwind.config.js       # Tailwind with Clutter.AI brand tokens (PORTED from admin-dashboard)
├── postcss.config.js        # PostCSS config
├── tsconfig.json            # TypeScript config
├── package.json             # Dependencies (NEW - includes React 19, Axios, Tailwind, date-fns, etc.)
├── Dockerfile               # Docker config for containerization
├── .env.example             # Environment variables template (API_URL, PORT)
└── README.md                # Project documentation (NEW)

admin-dashboard/ (EXISTING - no changes, source for ported components)
├── src/
│   ├── components/
│   │   ├── ui/              # SOURCE: UI components to port to user-client
│   │   ├── DashboardLayout.tsx  # REFERENCE: Layout pattern
│   │   └── ProtectedRoute.tsx   # SOURCE: Auth wrapper to port
│   ├── services/
│   │   └── api.ts           # SOURCE: Axios config to port
│   ├── contexts/
│   │   └── AuthContext.tsx  # SOURCE: Auth context to port
│   └── hooks/
│       └── useAuth.ts       # SOURCE: Auth hook to port
├── tailwind.config.js       # SOURCE: Brand tokens to port
└── package.json

backend/ (EXISTING - integration only, no structural changes)
├── src/
│   ├── modules/
│   │   ├── dumps/           # GET/PATCH /api/dumps endpoints
│   │   ├── search/          # POST /api/search endpoint
│   │   ├── feedback/        # POST/GET /api/feedback endpoints
│   │   └── metadata/        # GET /api/metadata/enums endpoint
└── tests/
```

**Structure Decision**: Separate web application structure selected. New `user-client/` app created as sibling to `admin-dashboard/`. Design system consistency maintained by porting Tailwind config and UI components from admin-dashboard. Apps run independently on different ports (admin: 3001, user-client: 3000). Backend integration only via REST API calls - no backend code changes required. Frontend follows component-based architecture with clear separation: components (UI), pages (routes), services (API), contexts (state), hooks (logic), utils (helpers), types (TypeScript definitions).

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

**No complexity violations detected.** All Constitution quality gates passed. Architecture decisions (React Context, Axios interceptors, Tailwind CSS) align with simplicity principles and existing codebase patterns.

---

## Implementation Phases

### Phase 1: Foundation & Design System
**Goal**: Scaffold new React application, port design system from admin-dashboard, and establish routing/UI components.

**Tasks** (each = 1 PR):

1. **Scaffold New React Application (user-client)**
   - Create new React 19 project: `npx create-react-app user-client --template typescript`
   - Directory: `/home/baiocte/personal/dumpster/user-client/`
   - Install dependencies: `react-router-dom@7.9.5`, `axios@1.13.2`, `tailwindcss`, `date-fns`, `lucide-react`, `@headlessui/react`, `class-variance-authority`
   - Configure to run on port 3000 (different from admin-dashboard port 3001)
   - Update `.env.example` with `REACT_APP_API_URL=http://localhost:3001` (backend URL)
   - Create basic `README.md` with setup instructions
   - **Acceptance**: `npm start` runs on port 3000, app displays default React page, all dependencies installed

2. **Port Tailwind Config with Clutter.AI Brand Tokens**
   - Copy `admin-dashboard/tailwind.config.js` to `user-client/tailwind.config.js`
   - Verify brand colors: `stone` (#FAFAF9), `electric-purple` (#B929EB), `bright-cyan` (#2DD9F6)
   - Verify custom gradient utilities: `bg-gradient-to-r from-electric-purple to-bright-cyan`
   - Verify custom shadows, border radius (charming rounded corners per spec)
   - Verify responsive breakpoints: `xs: 320px`, `sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`
   - Configure PostCSS: Copy `admin-dashboard/postcss.config.js`
   - Update `src/index.css` with Tailwind directives
   - **Acceptance**: `npm run build` succeeds, Tailwind purges unused styles, gradient classes work

3. **Add Google Fonts (Outfit + Inter)**
   - Update `public/index.html` with Google Fonts preconnect
   - Add font imports for Outfit (headings) and Inter (body)
   - Verify Tailwind `fontFamily` config: `heading: ['Outfit']`, `body: ['Inter']`
   - **Acceptance**: Fonts load on page refresh, no FOUT visible, headings use Outfit, body uses Inter

4. **Port Base UI Component: Button**
   - Copy `admin-dashboard/src/components/ui/Button.tsx` to `user-client/src/components/ui/Button.tsx`
   - Verify props: `variant` (primary gradient | secondary outline | danger red), `size` (sm | md | lg), `disabled`, `loading`, `onClick`, `children`
   - Verify `class-variance-authority` usage for variant management
   - Verify loading spinner with lucide-react `Loader2` icon
   - **Acceptance**: Component renders 3 variants correctly, passes accessibility audit (contrast ratio ≥4.5:1)

5. **Port Base UI Components: Card, Input, TextArea**
   - Copy from admin-dashboard to user-client:
     - `Card.tsx` (shadow, padding, rounded props)
     - `Input.tsx` (label, placeholder, value, onChange, error, helperText, disabled)
     - `TextArea.tsx` (same props as Input)
   - Verify Clutter.AI styling: Stone background, purple focus ring, error state in red
   - **Acceptance**: Components render correctly, focus states visible, error messages display, responsive on mobile

6. **Port Base UI Component: Modal**
   - Copy `admin-dashboard/src/components/ui/Modal.tsx` to `user-client/src/components/ui/Modal.tsx`
   - Verify `@headlessui/react` `Dialog` component usage
   - Verify props: `isOpen`, `onClose`, `title`, `children`, `footer`
   - Verify backdrop (semi-transparent stone), animations (fade in/out, slide up on mobile)
   - **Acceptance**: ESC key closes modal, backdrop click closes modal, focus trap works

7. **Create Base UI Component: Badge**
   - File: `user-client/src/components/ui/Badge.tsx` (NEW - not in admin-dashboard)
   - Props: `variant` (overdue red | pending yellow | approved green | rejected gray), `children`
   - Support status icons (lucide-react: AlertCircle, Clock, CheckCircle, XCircle)
   - **Acceptance**: 4 variants render with correct colors per spec clarification Q4

8. **Port Auth Components & Setup Routing**
   - Copy auth components from admin-dashboard:
     - `src/contexts/AuthContext.tsx` → `user-client/src/contexts/AuthContext.tsx`
     - `src/hooks/useAuth.ts` → `user-client/src/hooks/useAuth.ts`
     - `src/components/ProtectedRoute.tsx` → `user-client/src/components/ProtectedRoute.tsx`
     - `src/pages/auth/Login.tsx` → `user-client/src/pages/auth/Login.tsx` (adapt for user-focused UI)
   - Create `user-client/src/App.tsx` with React Router v7 routes
   - Routes: `/login`, `/` (Dashboard), `/search`, `/tracking`, `/feedback`
   - Wrap protected routes in `ProtectedRoute` component
   - Use `React.lazy` for code-splitting: `const Dashboard = lazy(() => import('./pages/Dashboard'))`
   - **Acceptance**: Navigation works, login redirects to dashboard, protected routes redirect to login if unauthenticated, lazy loading verified

9. **Port API Service & Create Utility Components**
   - Copy `admin-dashboard/src/services/api.ts` to `user-client/src/services/api.ts` (Axios instance with auth interceptor)
   - Update `baseURL` to use `process.env.REACT_APP_API_URL`
   - Create `src/components/LoadingSpinner.tsx` (full-page spinner with purple gradient)
   - Create `src/components/ErrorBoundary.tsx` (React error boundary with retry button)
   - **Acceptance**: Axios interceptor adds auth headers, API calls use correct base URL, error boundary catches errors, loading spinner displays

**Phase 1 Success Criteria**: New user-client app scaffolded, all design system components ported and functional, routing configured, auth flow works, brand identity consistent with admin-dashboard, ≥80% test coverage on ported components, app runs independently on port 3000.

---

### Phase 2: Dashboard Core (P1)
**Goal**: Implement main dashboard with time-bucketed dumps, API integration, and sorting logic.

**Tasks** (each = 1 PR):

1. **Create TypeScript Type Definitions**
   - Files: `src/types/dump.types.ts`, `src/types/search.types.ts`, `src/types/feedback.types.ts`
   - Copy interfaces from `data-model.md`: `User`, `Dump`, `DumpDerived`, `ExtractedEntities`, `SearchFilters`, `Feedback`
   - Export enums: `DumpStatus`, `UrgencyLevel`, `ContentType`, `TimeBucket`, `FeedbackStatus`, `FeedbackCategory`
   - **Acceptance**: TypeScript compilation succeeds, no `any` types used

2. **Implement Time Bucket Calculation Logic**
   - File: `src/utils/time-buckets.ts`
   - Function: `assignTimeBucket(dump: Dump): TimeBucket`
   - Logic (per clarification Q2 - calendar-based):
     - Overdue: Any date < today
     - Today: Dates matching current calendar day
     - Tomorrow: Next calendar day (not +24hrs, but next date)
     - This Week: Monday-Sunday of current week
     - Next Week: Monday-Sunday of following week
     - Future: All other dates
   - Use `date-fns`: `isToday`, `isTomorrow`, `isThisWeek`, `startOfWeek`, `endOfWeek`
   - **Acceptance**: Unit tests cover all 6 time buckets + edge cases (midnight, Sunday rollover, no dates)

3. **Implement Dump Sorting Algorithm**
   - File: `src/utils/sorting.ts`
   - Function: `sortDumps(dumps: Dump[]): Dump[]`
   - Primary: Sort by earliest extracted date (ascending)
   - Secondary: Sort by urgency level (critical > high > medium > low)
   - Tertiary: Sort by creation date (descending - newest first)
   - Handle edge cases: dumps with no dates (sort to end), ties (stable sort)
   - **Acceptance**: Unit tests with 10+ dumps verify correct ordering, performance <10ms for 100 dumps

4. **Create Dumps API Service**
   - File: `src/services/dumps.service.ts`
   - **CRITICAL**: All API calls must include authentication headers (`Authorization: Bearer <token>`)
   - Functions:
     - `fetchDumps(userId: string): Promise<Dump[]>` → `GET /api/dumps?userId={userId}`
     - `updateDump(id: string, updates: Partial<Dump>): Promise<Dump>` → `PATCH /api/dumps/:id`
   - Use Axios instance from `src/services/api.ts` (existing interceptor auto-adds auth header)
   - Error handling: Catch 401/403 and redirect to login
   - **Acceptance**: Integration test with MSW mocks API, auth header present in request, 401 triggers logout

5. **Create DumpsContext for State Management**
   - File: `src/contexts/DumpsContext.tsx`
   - State: `dumps: Dump[]`, `loading: boolean`, `error: string | null`, `lastFetched: Date | null`
   - Actions: `fetchDumps()`, `acceptDump(id, updates)`, `rejectDump(id, reason)`, `refetchDumps()`
   - Use React Context API (no Redux per research.md decision)
   - **Acceptance**: Context provides state to child components, loading/error states update correctly

6. **Create useDumps Hook**
   - File: `src/hooks/useDumps.ts`
   - Wraps `DumpsContext` with convenience methods
   - Returns: `{ dumps, loading, error, fetchDumps, acceptDump, rejectDump }`
   - **CRITICAL**: Ensure `fetchDumps` passes authentication headers via service layer
   - **Acceptance**: Hook fetches data on mount, refetches on demand, loading states work

7. **Create useTimeBuckets Hook**
   - File: `src/hooks/useTimeBuckets.ts`
   - Input: `dumps: Dump[]`
   - Output: `{ overdue: Dump[], today: Dump[], tomorrow: Dump[], thisWeek: Dump[], nextWeek: Dump[], future: Dump[] }`
   - Logic: Compute `DumpDerived` properties (timeBucket, isOverdue, displayDate, hasReminder, hasTracking) per data-model.md
   - Memoize with `useMemo` to avoid recalculations
   - **Acceptance**: Unit tests verify correct bucketing for 20+ dumps, memoization prevents unnecessary recalcs

8. **Create DumpCard Component**
   - File: `src/components/DumpCard.tsx`
   - Props: `dump: DumpDerived`, `showActions: boolean`, `onAccept`, `onReject`, `onClick` (opens modal)
   - Display: Category badge, rawContent preview (50 chars), display date, urgency indicator, reminder/tracking icons
   - Overdue styling: Red left border + "OVERDUE" badge (per clarification Q1)
   - Actions: "Accept" (green button), "Reject" (red button) visible only if `showActions=true`
   - **Acceptance**: Card renders correctly, actions trigger callbacks, mobile responsive (stacks vertically)

9. **Create TimeBucket Component**
   - File: `src/components/TimeBucket.tsx`
   - Props: `title: string`, `dumps: Dump[]`, `defaultExpanded: boolean`, `showActions: boolean`
   - Collapsible section with expand/collapse toggle
   - Lazy render: Only render dump cards when expanded (performance optimization per FR-004)
   - Empty state: Show "No items" message if `dumps.length === 0`
   - **Acceptance**: Bucket expands/collapses, lazy rendering verified (DevTools React Profiler), empty state displays

10. **Create Dashboard Page Component**
    - File: `user-client/src/pages/Dashboard.tsx`
    - Layout: Create new `user-client/src/components/DashboardLayout.tsx` (user-focused, simpler than admin version)
    - Header: "Your Dumps" title + "Show Actions" toggle (boolean state)
    - Fetch dumps via `useDumps` hook on mount
    - Group dumps via `useTimeBuckets` hook
    - Render 6 `TimeBucket` components: Overdue (always expanded), Today (expanded), Tomorrow (collapsed), This Week (collapsed), Next Week (collapsed), Future (collapsed)
    - **CRITICAL**: Ensure API call includes authentication headers via `useDumps` → `DumpsContext` → `dumps.service.ts`
    - Loading state: Show `LoadingSpinner` while `loading=true`
    - Error state: Show error message with retry button
    - **Acceptance**: Dashboard loads <2s (SC-001), overdue items at top with red badges (clarification Q1), toggle shows/hides action buttons, empty time periods show "No items"

**Phase 2 Success Criteria**: Dashboard functional in user-client app with all 10 tasks complete, time buckets display correctly, API integration works with authentication headers, ≥80% test coverage, SC-001 performance target met (<2s load).

---

### Phase 3: Search & Discovery (P1)
**Goal**: Implement natural language search with advanced filters and result rendering.

**Tasks** (each = 1 PR):

1. **Create Search API Service**
   - File: `src/services/search.service.ts`
   - **CRITICAL**: All API calls must include authentication headers (`Authorization: Bearer <token>`)
   - Functions:
     - `searchDumps(query: string, filters: SearchFilters): Promise<SearchResults>` → `POST /api/search`
     - `fetchFilterEnums(): Promise<{ contentTypes, categories, urgencyLevels }>` → `GET /api/metadata/enums`
   - Error handling: Catch 400 (invalid query) and show user-friendly message
   - **Acceptance**: Integration test with MSW verifies auth header, POST body correct, response parsed

2. **Create SearchContext for State Management**
   - File: `src/contexts/SearchContext.tsx`
   - State: `query: string`, `filters: SearchFilters`, `results: Dump[]`, `loading: boolean`, `error: string | null`, `pagination: { page, pageSize, total }`
   - Actions: `setQuery`, `setFilters`, `executeSearch`, `nextPage`, `prevPage`, `resetSearch`
   - **Acceptance**: Context provides state to Search page, pagination works

3. **Create useSearch Hook**
   - File: `src/hooks/useSearch.ts`
   - Wraps `SearchContext` with debounced search (300ms delay per research.md)
   - Returns: `{ query, filters, results, loading, error, setQuery, setFilters, search, pagination }`
   - **CRITICAL**: Ensure `executeSearch` passes authentication headers via service layer
   - Debounce logic: Only trigger API call after user stops typing for 300ms
   - **Acceptance**: Hook debounces input, API called after delay, pagination methods work

4. **Fetch Filter Enums on Search Page Mount**
   - Update `src/pages/Search.tsx` (create skeleton first)
   - Call `fetchFilterEnums()` from `useSearch` hook on component mount
   - Store enum values in SearchContext for FilterPanel dropdown options
   - **Acceptance**: Enums fetched once on mount, stored in context, no refetch on re-renders

5. **Create SearchBar Component**
   - File: `src/components/SearchBar.tsx`
   - Props: `value: string`, `onChange`, `onSearch`, `loading: boolean`
   - Hero UI: Large input with gradient border, search icon (lucide-react `Search`), placeholder "Ask anything about your dumps..."
   - Enter key triggers search
   - **Acceptance**: Input updates state, Enter key triggers search, gradient border visible, mobile responsive

6. **Create FilterPanel Component**
   - File: `src/components/FilterPanel.tsx`
   - Props: `filters: SearchFilters`, `onFiltersChange`, `enumOptions: { contentTypes, categories, urgencyLevels }`
   - Collapsible panel (use Headless UI `Disclosure`)
   - Filters:
     - Content Types (multi-select checkboxes)
     - Categories (multi-select checkboxes)
     - Urgency Levels (multi-select checkboxes)
     - Min Confidence (slider 0-100)
     - Date Range (start/end date pickers)
   - Reset button to clear all filters
   - **Acceptance**: Filters update state, checkboxes work, slider updates, date pickers functional, reset clears all

7. **Implement Search Results Rendering**
   - File: `src/pages/Search.tsx` (complete implementation)
   - Layout: SearchBar at top (hero), FilterPanel below (collapsible), Results grid below
   - Results: Render `DumpCard` components (reuse from Phase 2) with `showActions=true`
   - Pagination: Show "Load More" button or page numbers at bottom (20 results per page per spec)
   - **CRITICAL**: Ensure search API call includes authentication headers via `useSearch` → `SearchContext` → `search.service.ts`
   - **Acceptance**: Search returns results <3s (SC-002), filters applied correctly, pagination works, auth header present

8. **Create EmptyState Component**
   - File: `src/components/EmptyState.tsx`
   - Props: `title`, `message`, `icon` (lucide-react icon), `action` (optional button)
   - Render when `results.length === 0` after search
   - Helpful messages: "No results found. Try different keywords or adjust filters."
   - **Acceptance**: Empty state displays after no-results search, actionable suggestions shown

9. **Add Loading Spinner for Search**
   - Show `LoadingSpinner` component while `loading=true` during search
   - Position: Center of results area, overlay existing content
   - **Acceptance**: Spinner visible during API call, disappears when results load

10. **Add Debounce to Search Input**
    - Implement in `useSearch` hook (already mentioned in Task 3, but verify here)
    - Debounce delay: 300ms (per research.md decision)
    - Cancel previous API call if new input received before completion
    - **Acceptance**: API calls reduced (verify in DevTools Network tab), no duplicate requests

**Phase 3 Success Criteria**: Search functional in user-client app with all 10 tasks complete, natural language queries work, filters applied correctly, pagination works, API includes authentication headers, ≥80% test coverage, SC-002 performance target met (<3s results).

---

### Phase 4: Action & Review Logic (P1/P2)
**Goal**: Implement dump detail modal, edit functionality, Accept/Reject actions with optimistic UI updates.

**Tasks** (each = 1 PR):

1. **Create DumpDetailModal Component**
   - File: `src/components/DumpDetailModal.tsx`
   - Props: `dump: Dump | null`, `isOpen: boolean`, `onClose`, `onSave`, `onAccept`, `onReject`
   - Use `Modal` component from Phase 1 as base
   - Layout: Title (category), full rawContent, extracted entities display, notes textarea, action buttons (Save, Accept, Reject)
   - Modal routing: Open via query param `?dumpId=123` or React state (user preference - choose query param for shareable URLs)
   - **Acceptance**: Modal opens when DumpCard clicked, displays full dump details, query param updates URL

2. **Implement Edit Form in DumpDetailModal**
   - Fields: Category (dropdown from enum), rawContent (readonly), notes (editable textarea)
   - Validation: Category required, notes optional but max 500 chars
   - Form state: Use React controlled inputs
   - **Acceptance**: Form fields editable, validation errors shown, unsaved changes warning on close

3. **Create useOptimistic Custom Hook**
   - File: `src/hooks/useOptimistic.ts`
   - Generic hook for optimistic UI updates
   - Pattern (per clarification Q5 and research.md):
     1. Immediately update local state (optimistic)
     2. Call API in background
     3. On success: Do nothing (state already updated)
     4. On failure: Revert local state + show error toast + keep modal open + show retry button
   - Returns: `{ execute, rollback, isRollingBack }`
   - **Acceptance**: Unit tests verify optimistic flow, rollback on failure, retry logic

4. **Implement acceptDump Function with Optimistic Update**
   - File: `src/contexts/DumpsContext.tsx` (add action)
   - Function: `acceptDump(id: string, updates: Partial<Dump>): Promise<void>`
   - **CRITICAL**: Ensure API call includes authentication headers via `dumps.service.ts`
   - Optimistic flow:
     1. Update dump status to "accepted" in local state immediately
     2. Call `PATCH /api/dumps/:id` with `{ status: 'accepted', ...updates }`
     3. On failure: Revert status to original + show toast "Failed to accept dump. [Retry]"
   - **Acceptance**: Status updates immediately, API called with auth header, rollback on 500 error, toast shown

5. **Implement rejectDump Function with Validation**
   - File: `src/contexts/DumpsContext.tsx` (add action)
   - Function: `rejectDump(id: string, reason: string): Promise<void>`
   - **CRITICAL**: Ensure API call includes authentication headers via `dumps.service.ts`
   - Validation: Reason required (min 10 chars) before API call
   - Optimistic flow: Same as acceptDump (update status to "rejected" immediately)
   - **Acceptance**: Validation blocks API call if reason empty, optimistic update works, rollback on failure

6. **Integrate Accept/Reject Actions in DumpCard**
   - Update `src/components/DumpCard.tsx`
   - Wire up "Accept" button to `onAccept` callback → triggers `acceptDump` in DumpsContext
   - Wire up "Reject" button to `onReject` callback → opens modal with reason textarea
   - Disable buttons during API call (loading state)
   - **Acceptance**: Buttons trigger correct actions, loading state prevents double-clicks, optimistic UI updates visible

7. **Create Toast Component for Notifications**
   - File: `src/components/Toast.tsx`
   - Props: `message`, `type` (success | error | info), `onClose`, `action` (optional retry button)
   - Position: Bottom-right corner, stack multiple toasts
   - Auto-dismiss: 5 seconds (except error toasts with retry - those persist until dismissed)
   - **Acceptance**: Toasts display correctly, auto-dismiss works, retry button functional

8. **Implement Retry Button in Error Toast**
   - Update `Toast.tsx` to support action button
   - When optimistic update fails, show toast with "Retry" button
   - Retry button re-executes the same API call (calls `execute` from `useOptimistic` again)
   - **Acceptance**: Retry button re-triggers API call, success removes toast, failure shows new toast

9. **Preserve User Edits on Optimistic Failure**
   - Update `DumpDetailModal.tsx`
   - When API fails, keep modal open (don't close)
   - Preserve all form values (category, notes) that user entered
   - Show error message at top of modal: "Failed to save changes. Please retry."
   - **Acceptance**: Modal stays open on error, form values unchanged, user can edit and retry

10. **Test Optimistic Flow with Network Throttling**
    - Create integration test in `tests/integration/OptimisticUpdates.test.tsx`
    - Use MSW to simulate slow API (2s delay) and failures (500 error)
    - Verify:
      - UI updates immediately (before API response)
      - Rollback occurs on failure
      - Toast shown with retry button
      - Modal stays open on error
      - Retry succeeds after initial failure
    - Manual test: Use Chrome DevTools Network throttling ("Slow 3G") to verify smooth UX
    - **Acceptance**: Integration tests pass, manual test shows smooth optimistic updates

**Phase 4 Success Criteria**: Detail modal functional in user-client app, edit form works, Accept/Reject actions use optimistic UI, rollback on failure, toast notifications work, retry button functional, all API calls include authentication headers, ≥80% test coverage, SC-004 performance target met (<300ms API).

---

### Phase 5: Specialized Views (P2/P3)
**Goal**: Implement reminders/tracking hub, feedback system, and finalize mobile responsiveness.

**Tasks** (each = 1 PR):

1. **Create Tracking Page Component**
   - File: `src/pages/Tracking.tsx`
   - Layout: Similar to Dashboard but filtered view
   - Filter: Show only dumps with `hasReminder=true` OR `hasTracking=true`
   - Group by type: "Reminders" section (alarm icon, warm yellow/orange colors), "Tracking" section (package icon, cyan colors)
   - Use existing `TimeBucket` and `DumpCard` components
   - **Acceptance**: Page shows only relevant dumps, sections styled correctly, empty state if no reminders/tracking

2. **Implement Reminder Styling**
   - Update `DumpCard.tsx` to apply special styling when `dump.hasReminder=true`
   - Visual cues: Alarm icon (lucide-react `Bell`), warm color left border (yellow/orange), "Reminder" badge
   - **Acceptance**: Reminder cards visually distinct, icon visible, color scheme warm

3. **Implement Tracking Styling**
   - Update `DumpCard.tsx` to apply special styling when `dump.hasTracking=true`
   - Visual cues: Package icon (lucide-react `Package`), cyan color left border, "Tracking" badge
   - **Acceptance**: Tracking cards visually distinct, icon visible, cyan color applied

4. **Create Timeline View for Tracking Page**
   - File: `src/components/Timeline.tsx`
   - Alternative view to time buckets: Chronological list with date markers
   - Each item shows date + time + dump card
   - **Acceptance**: Timeline displays chronologically, date markers visible, mobile responsive

5. **Create Feedback API Service**
   - File: `src/services/feedback.service.ts`
   - **CRITICAL**: All API calls must include authentication headers (`Authorization: Bearer <token>`)
   - Functions:
     - `submitFeedback(feedback: Partial<Feedback>): Promise<Feedback>` → `POST /api/feedback`
     - `fetchMyFeedback(): Promise<Feedback[]>` → `GET /api/feedback?userId={userId}`
   - **Acceptance**: Integration test verifies auth header, POST body valid, GET filters by userId

6. **Create Feedback Page Component**
   - File: `src/pages/Feedback.tsx`
   - Two sections: "Submit Feedback" form (top) + "My Feedback" list (bottom)
   - Form: Category dropdown (bug | feature_request | general), message textarea (required, ≥10 chars), rating (1-5 stars), submit button
   - List: Shows all user's feedback with status badges (color-coded per clarification Q4: Pending=yellow, In Review=blue, Resolved=green, Rejected=red)
   - **Acceptance**: Form validates inputs, submission works, list displays feedback with correct status colors

7. **Implement Feedback Submission Form**
   - File: `src/components/FeedbackForm.tsx`
   - Form validation: Message ≥10 chars, rating 1-5, category required
   - **CRITICAL**: Ensure API call includes authentication headers via `feedback.service.ts`
   - Success: Show success toast "Feedback submitted! We'll review it soon." + clear form
   - Error: Show error toast with retry button
   - **Acceptance**: Form validates, API call includes auth header, success message shown, form clears on success

8. **Implement "My Feedback" List with Status Badges**
   - File: `src/components/MyFeedbackList.tsx`
   - Fetch feedback via `GET /api/feedback` on component mount
   - **CRITICAL**: Ensure API call includes authentication headers via `feedback.service.ts`
   - Render list with status badges:
     - Pending: Yellow badge with Clock icon
     - In Review: Blue badge with Eye icon
     - Resolved: Green badge with CheckCircle icon
     - Rejected: Red badge with XCircle icon
   - **Acceptance**: List displays feedback, badges color-coded correctly (per clarification Q4), icons visible

9. **Test Mobile Responsiveness (All Pages)**
   - Test breakpoints: 320px (iPhone SE), 768px (iPad), 1024px (desktop)
   - Verify:
     - Dashboard: Time buckets stack vertically on mobile, cards full-width
     - Search: SearchBar full-width, FilterPanel collapsible on mobile, results stack
     - Tracking: Timeline view works on mobile, cards stack
     - Feedback: Form stacks vertically, list responsive
     - Modal: Full-screen on mobile, slide-up animation
   - Touch targets: All buttons/links ≥44x44px (per iOS guidelines)
   - **Acceptance**: All pages tested at 3 breakpoints, no horizontal scroll, touch targets adequate, swipe gestures work for modal dismiss

10. **Final QA Against All 10 Success Criteria**
    - Run comprehensive QA checklist:
      - SC-001: Dashboard loads in <2 seconds ✅
      - SC-002: Search returns results in <3 seconds ✅
      - SC-003: All Clutter.AI brand elements applied (colors, fonts, shadows) ✅
      - SC-004: API operations complete in <300ms ✅
      - SC-005: Optimistic updates work with rollback on failure ✅
      - SC-006: Mobile-responsive on all 3 breakpoints ✅
      - SC-007: Feedback submission functional with status tracking ✅
      - SC-008: System supports 1000 concurrent users (load test if possible) ✅
      - SC-009: ≥80% test coverage (run `npm run test:coverage`) ✅
      - SC-010: No breaking changes to existing features ✅
    - Fix any issues found during QA
    - **Acceptance**: All 10 success criteria pass, feature ready for production

**Phase 5 Success Criteria**: Tracking hub functional in user-client app, feedback system complete, mobile responsiveness verified on 3 breakpoints, all 10 success criteria met, ≥80% test coverage, production-ready, user-client app ready for deployment as standalone application.

---

## Notes
- **Separation of Concerns**: Per user request, this feature is built as a separate React application (`user-client/`) alongside `admin-dashboard/`. This provides clear separation between admin and end-user interfaces while maintaining design system consistency.
- **Design System Consistency**: Tailwind config and UI components (Button, Card, Modal, Input, etc.) are ported from `admin-dashboard/` to ensure visual consistency across both applications. Auth logic is also ported to maintain consistent authentication patterns.
- **Independent Deployment**: `user-client/` runs on port 3000 (vs admin-dashboard on 3001), has its own `package.json`, and can be deployed independently. Both apps share the same backend API.
- **Authentication Emphasis**: Per user request, all API integration tasks explicitly mention that API calls MUST include authentication headers. This is enforced via Axios interceptor in `user-client/src/services/api.ts` (ported from admin-dashboard).
- **PR Granularity**: Each task is designed to be a single logical commit or Pull Request, addressing user's request for granular task breakdown.
- **Phase Dependencies**: Phase 1 includes app scaffolding and component porting. Phases 2-5 depend on Phase 1 completion. Phases 4-5 can be parallelized after Phase 3 completes.
- **Testing Strategy**: Unit tests for utils/hooks (Phase 2), integration tests for page flows (Phases 3-5), contract tests for API calls (all phases), ≥80% coverage enforced per Constitution.
- **Performance Monitoring**: SC-001, SC-002, SC-004 define hard performance targets. Use React Profiler and Chrome DevTools Lighthouse to validate.
- **Deployment**: Feature branch `002-user-frontend-interface` merges to main after all 5 phases complete and QA passes. `user-client/` app deployed independently from `admin-dashboard/`. No breaking changes to existing admin dashboard functionality.

