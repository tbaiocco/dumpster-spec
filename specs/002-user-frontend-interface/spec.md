# Feature Specification: User Frontend Interface

**Feature Branch**: `002-user-frontend-interface`  
**Created**: 2025-12-15  
**Status**: Draft  
**Input**: User description: "Software Design Description (SDD): Clutter.AI User Frontend Interface - Build a modern, charming, and efficient client-side application that interacts with the existing NestJS backend with authenticated data fetching filtered by userId"

## Clarifications

### Session 2025-12-15

- Q: How should overdue items (past dates) be displayed in the dashboard? → A: Place overdue items at the top of "Today" section with visual distinction (e.g., red accent, badge)
- Q: What are the precise definitions for time buckets (Tomorrow, Next Week, Next Month)? → A: Calendar-based: Tomorrow = next calendar day; Next Week = next Monday-Sunday; Next Month = next calendar month
- Q: What are the specific allowed values for contentTypes, urgencyLevels, and categories in Advanced Search filters? → A: Backend provides enum values via API
- Q: How should feedback status be visually represented in "My Feedback" list? → A: Status badges with color coding (Pending=yellow, In Review=blue, Resolved=green, Rejected=red)
- Q: What is the specific error handling UX if optimistic UI update (Accept/Reject) fails? → A: Show error toast + revert UI state + keep modal open with user's edits preserved, offer "Retry" button

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Daily Action Items (Priority: P1)

As a user, I want to see all my actionable items for today in one place so that I can quickly understand what needs my attention right now.

**Why this priority**: This is the core value proposition - helping users triage their digital life. Without this, there's no MVP.

**Independent Test**: Can be fully tested by logging in as a user with seeded dump data containing various dates and urgency levels, and verifying that today's items appear correctly ordered and that the UI displays the Clutter.AI brand identity correctly.

**Acceptance Scenarios**:

1. **Given** I am a logged-in user with dumps scheduled for today, **When** I open the dashboard, **Then** I see a "Today" section expanded by default with all my items ordered by urgency
2. **Given** I am a logged-in user, **When** I view the dashboard, **Then** only items associated with my userId are displayed
3. **Given** I am viewing today's items, **When** multiple items exist, **Then** they are sorted primarily by date and secondarily by urgency level
4. **Given** I am viewing the dashboard on a mobile device, **When** the screen is narrow, **Then** cards stack vertically and remain readable

---

### User Story 2 - Search My Information (Priority: P1)

As a user, I want to search through all my captured information using natural language so that I can quickly find what I'm looking for without remembering exact details.

**Why this priority**: Search is a fundamental capability for information management. Users need to retrieve their data to make the system valuable.

**Independent Test**: Can be fully tested by creating a user with diverse dump data, performing various natural language queries, and verifying results are correctly filtered by userId and match the search criteria.

**Acceptance Scenarios**:

1. **Given** I am a logged-in user, **When** I enter a natural language query in the search bar, **Then** I see relevant results from my dumps only
2. **Given** I am viewing search results, **When** I click on a result card, **Then** a detail modal opens showing the full dump information
3. **Given** I am on the search page, **When** I expand advanced filters, **Then** I can filter by content type, category, urgency level, confidence score, processing status, and date range
4. **Given** I have applied filters, **When** I submit a search, **Then** results respect all active filters
5. **Given** I am viewing search results, **When** no results match my query, **Then** I see a friendly message suggesting I try different terms

---

### User Story 3 - Review and Accept Items (Priority: P1)

As a user, I want to review captured information and accept it into my system so that I can validate the AI processing and maintain data quality.

**Why this priority**: User validation closes the loop on AI processing. Without acceptance flow, users cannot confirm data accuracy or take ownership of their information.

**Independent Test**: Can be fully tested by opening a dump detail modal, editing fields, and verifying the changes persist and status updates to Approved.

**Acceptance Scenarios**:

1. **Given** I am viewing a dump detail modal, **When** I edit the category, raw content, or notes fields, **Then** my changes are reflected in the UI immediately
2. **Given** I have edited dump details, **When** I click "Accept", **Then** the dump status changes to Approved and my edits are saved
3. **Given** I am viewing a dump, **When** I accept it, **Then** I receive visual confirmation and the modal closes
4. **Given** I accept a dump, **When** the save operation completes, **Then** the dashboard reflects the updated status without requiring a page refresh
5. **Given** I accept a dump, **When** the backend request fails, **Then** I see an error toast, the UI reverts to original state, the modal stays open with my edits preserved, and a "Retry" button appears

---

### User Story 4 - Reject Unwanted Items (Priority: P2)

As a user, I want to reject items that were incorrectly captured or are not relevant so that my system stays clean and focused on what matters.

**Why this priority**: Data quality requires the ability to remove false positives. Secondary to acceptance because users need to accept good data first.

**Independent Test**: Can be fully tested by opening a dump detail modal, selecting a rejection reason, providing notes, and verifying the dump status updates to Rejected.

**Acceptance Scenarios**:

1. **Given** I am viewing a dump detail modal, **When** I click "Reject", **Then** I am prompted to provide a rejection reason and notes
2. **Given** I am rejecting a dump, **When** I submit without a reason, **Then** I see a validation error
3. **Given** I have provided a rejection reason, **When** I submit, **Then** the dump status changes to Rejected and the modal closes
4. **Given** I reject a dump, **When** the operation completes, **Then** the item is removed from my dashboard view

---

### User Story 5 - Manage Reminders and Tracking (Priority: P2)

As a user, I want to see all my reminders and package tracking information in one dedicated view so that I can stay on top of time-sensitive and incoming items.

**Why this priority**: Specialized view for high-value entity types. Secondary because basic dashboard already shows these items, but dedicated view improves UX.

**Independent Test**: Can be fully tested by creating dumps with reminder and tracking entities, navigating to the Reminders & Tracking hub, and verifying correct filtering and visual styling.

**Acceptance Scenarios**:

1. **Given** I navigate to the Reminders & Tracking hub, **When** the page loads, **Then** I see only dumps containing reminder or tracking entities
2. **Given** I am viewing the hub, **When** items are displayed, **Then** reminders show alarm/clock iconography and tracking items show package/delivery iconography
3. **Given** I am viewing the hub, **When** multiple items exist, **Then** they are organized in a timeline with Day/Week/Month buckets
4. **Given** I am viewing a collapsed time bucket, **When** I click "Show Actions", **Then** items in that bucket are loaded and displayed

---

### User Story 6 - View Future Items (Priority: P2)

As a user, I want to see what's coming tomorrow, next week, and next month so that I can plan ahead without being overwhelmed by too much information at once.

**Why this priority**: Forward planning is valuable but less urgent than today's actions. Secondary to P1 stories.

**Independent Test**: Can be fully tested by creating dumps with various future dates, verifying they appear in correct time buckets, and that buckets can be expanded/collapsed.

**Acceptance Scenarios**:

1. **Given** I am viewing the dashboard, **When** I see time buckets for Tomorrow/Next Week/Next Month, **Then** they are collapsed by default
2. **Given** a time bucket is collapsed, **When** I click "Show Actions", **Then** the bucket expands and items for that period are displayed
3. **Given** I have expanded a time bucket, **When** I click to collapse it, **Then** the items are hidden to reduce visual clutter
4. **Given** items exist in future time buckets, **When** they are loaded, **Then** they are ordered by date and urgency like today's items

---

### User Story 7 - Provide Product Feedback (Priority: P3)

As a user, I want to send feedback about my experience so that I can help improve the product and report issues.

**Why this priority**: Important for product development but not critical for core functionality. Can be added after core workflows are stable.

**Independent Test**: Can be fully tested by submitting feedback with various categories and messages, then viewing submitted feedback in the "My Feedback" list.

**Acceptance Scenarios**:

1. **Given** I navigate to the feedback page, **When** I fill out the category, message, and rating fields, **Then** I can submit my feedback
2. **Given** I submit feedback, **When** the operation completes, **Then** I see confirmation and the feedback appears in "My Feedback"
3. **Given** I have previously submitted feedback, **When** I view "My Feedback", **Then** I see a list of my feedback items with their current status displayed as color-coded badges
4. **Given** I am viewing "My Feedback", **When** feedback has different statuses, **Then** I can distinguish them by badge color (Pending=yellow, In Review=blue, Resolved=green, Rejected=red)
5. **Given** I am submitting feedback, **When** I leave required fields empty, **Then** I see validation errors

---

### Edge Cases

- What happens when a user has no dumps for a given time period? (Display friendly empty state message)
- How does the system handle dumps with multiple dates in extractedEntities? (Use earliest date for bucketing)
- How are overdue items (past dates) displayed? (Placed at the top of "Today" section with visual distinction such as red accent or "overdue" badge)
- What happens when search returns no results? (Show helpful empty state with suggestions)
- How does system handle network errors during Accept/Reject operations? (Display error toast, revert optimistic UI changes, keep modal open with preserved edits, offer "Retry" button)
- What happens when a user tries to access another user's dump via direct URL manipulation? (Backend returns 403, frontend shows "Access Denied" message)
- How does the UI handle dumps with missing or incomplete extractedEntities data? (Show dump with available data, mark missing fields clearly)
- What happens when advanced search filters produce no results? (Show which filters may be too restrictive)
- How does the system handle very long dump content in cards? (Truncate with "Read more" in detail modal)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST authenticate all API requests with the logged-in user's credentials
- **FR-002**: System MUST filter all data fetching strictly by the authenticated userId to prevent cross-user data exposure
- **FR-003**: System MUST render the dashboard with time-bucketed sections (Today, Tomorrow, Next Week, Next Month)
- **FR-003a**: System MUST display overdue items (dates before today) at the top of the "Today" section with visual distinction (red accent or "overdue" badge)
- **FR-003b**: System MUST define time buckets as: Today = current calendar day; Tomorrow = next calendar day; Next Week = next Monday-Sunday; Next Month = next calendar month
- **FR-004**: System MUST expand "Today" section by default and collapse future time buckets
- **FR-005**: System MUST provide a "Show Actions" toggle for each collapsed time bucket to lazy-load data on demand
- **FR-006**: System MUST sort dumps primarily by date and secondarily by urgency/priority within each time bucket, with overdue items appearing first within "Today"
- **FR-007**: System MUST provide a natural language search interface that calls POST /api/search with the user's query
- **FR-008**: System MUST provide advanced search filters for contentTypes, categories, urgencyLevels, minConfidence, includeProcessing, dateFrom, and dateTo, with enum values (contentTypes, categories, urgencyLevels) sourced from backend API to maintain consistency
- **FR-009**: System MUST render search results as clickable cards that open a detail modal
- **FR-010**: System MUST provide a dump detail modal with View, Edit, Accept, and Reject capabilities
- **FR-011**: System MUST allow editing of Category, Raw Content, and Notes fields in the detail modal
- **FR-012**: System MUST call PATCH /api/dumps/:id when accepting a dump to save edits and update status to Approved
- **FR-013**: System MUST require rejection reason and notes when rejecting a dump
- **FR-014**: System MUST call PATCH /api/dumps/:id when rejecting a dump to update status to Rejected
- **FR-015**: System MUST provide a unified Reminders & Tracking hub showing dumps with reminder or tracking entities
- **FR-016**: System MUST visually distinguish reminders (alarm/clock icons, warm colors) from tracking items (package icons, cyan colors)
- **FR-017**: System MUST organize reminders and tracking in a Day/Week/Month timeline similar to the dashboard
- **FR-018**: System MUST provide a feedback submission form with Category, Message, and Rating fields
- **FR-019**: System MUST display a "My Feedback" list showing previously submitted feedback and status, with status represented as color-coded badges (Pending=yellow, In Review=blue, Resolved=green, Rejected=red)
- **FR-020**: System MUST implement optimistic UI updates for Accept/Reject operations to feel snappy
- **FR-020a**: System MUST handle optimistic update failures by: displaying error toast notification, reverting UI to pre-action state, keeping modal open with user's edits preserved, and offering a "Retry" button
- **FR-021**: System MUST apply the Clutter.AI brand identity with background #FAFAF9, surface #FFFFFF, gradient primary actions, and appropriate typography
- **FR-022**: System MUST use rounded-2xl shape for all cards, inputs, and modals
- **FR-023**: System MUST use Outfit font (Bold) for headings and Inter font (Regular) for body text
- **FR-024**: System MUST implement a mobile-first responsive design where Day/Week views stack gracefully on small screens
- **FR-025**: System MUST apply soft colored shadows (e.g., shadow-lg shadow-purple-500/20) for depth

### Key Entities

- **User**: Authenticated user with a unique userId; all data operations are scoped to this user
- **Dump**: A captured piece of information with status (Pending, Approved, Rejected), category, raw content, notes, extractedEntities, and dates
- **ExtractedEntities**: Structured data within a dump including dates, reminders, tracking info, urgency levels, and confidence scores
- **Feedback**: User-submitted feedback with category, message, rating, status, and timestamp

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can view their daily action items within 2 seconds of dashboard load
- **SC-002**: Users can complete a natural language search and view results in under 3 seconds
- **SC-003**: Users can accept or reject a dump in under 30 seconds including review time
- **SC-004**: System maintains sub-300ms response time for all data fetch operations under normal load
- **SC-005**: 95% of users successfully complete their first Accept/Reject action without errors or confusion
- **SC-006**: Mobile users can complete all primary tasks (view dashboard, search, accept/reject) with the same success rate as desktop users
- **SC-007**: Zero instances of cross-user data exposure in production (all data correctly filtered by userId)
- **SC-008**: System handles 1000 concurrent users without degradation of response times
- **SC-009**: Users report 4+ out of 5 stars for UI clarity and visual appeal in feedback submissions
- **SC-010**: 90% of search queries return relevant results as measured by user acceptance of top 3 results

## Assumptions

- Backend NestJS API endpoints exist and are functioning correctly for dumps, search, and feedback
- Backend properly validates userId in all requests and enforces authorization
- Backend returns dump data with extractedEntities in a consistent structure
- Backend provides enum values for contentTypes, categories, and urgencyLevels via API (either dedicated endpoint or embedded in search response schema)
- Users are authenticated via existing auth mechanism (session, JWT, etc.) before accessing the frontend
- Date extraction in dumps provides at least one date value for time bucketing
- Time bucket calculations use calendar-based boundaries (next Monday for week start, first day of next month for month start)
- Urgency/priority values are normalized across dumps for sorting
- Search endpoint handles natural language queries and returns relevance-scored results
- Mobile browsers support modern CSS features (gradients, shadows, rounded corners)
- Users have stable internet connections for real-time optimistic updates
- Feedback integration uses the existing feedback.controller endpoint structure
- Backend returns feedback status field with possible values: Pending, In Review, Resolved, Rejected

## Constraints

- All data fetching MUST be authenticated and strictly filtered by logged-in userId
- UI design MUST strictly adhere to the Clutter.AI Brand Identity (colors, fonts, shapes, shadows)
- Mobile-first responsive design is mandatory
- No implementation details about specific frameworks or libraries (React, Vue, etc.) should be assumed
- Performance must not degrade with large datasets (pagination/lazy-loading required)

## Dependencies

- Existing NestJS backend with /api/search, /api/dumps, and feedback.controller endpoints
- Authentication system providing userId context for all requests
- Backend authorization ensuring users can only access their own data
- Dump data model with extractedEntities containing dates, reminders, tracking, urgency, and confidence
- Clutter.AI brand assets (font files, color specifications) available for frontend implementation

## Out of Scope

- Backend API development or modifications (assumed to exist and work correctly)
- Authentication mechanism implementation (assumed to exist)
- Multi-user collaboration features
- Offline functionality or progressive web app capabilities
- Admin dashboard features (separate from user frontend)
- Data export or backup features
- Third-party integrations beyond what backend already provides
- User onboarding or tutorial flows
- Customization of UI theme or branding by individual users

