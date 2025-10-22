# Feature Specification: Clutter.AI Universal Life Inbox

**Feature Branch**: `001-universal-life-inbox`  
**Created**: October 21, 2025  
**Status**: Draft  
**Input**: User description: "Create a Software Design Document for Clutter.AI - a universal life inbox where users dump everything they need to remember and AI processes, organizes, and reminds them about it."

## Clarifications

### Session 2025-10-21
- Q: AI confidence threshold for manual review trigger → A: Low threshold (40-50%) for aggressive automation during MVP
- Q: User authentication and security model → A: Phone number verification via SMS/WhatsApp
- Q: Calendar integration specificity → A: Standard calendar formats (iCal/ICS files or calendar URLs)
- Q: Rate limiting and system overload behavior → A: Queue with user notification for delays
- Q: Bot command response format and structure → A: Structured format with consistent sections, headers, and clear formatting

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Basic Content Capture and AI Processing (Priority: P1)

A scattered-mind user sends any type of content (text, voice, photo) to their WhatsApp bot and receives immediate confirmation that the AI understood what it was and what actions were taken.

**Why this priority**: This is the core value proposition - the universal dumpster concept. Without this working reliably, the entire product fails. Users must trust that nothing gets lost.

**Independent Test**: Can be fully tested by sending various content types to WhatsApp bot and verifying AI categorization, entity extraction, and confirmation responses.

**Acceptance Scenarios**:

1. **Given** a new user has connected their WhatsApp, **When** they send "Remind me to pay electricity bill by Friday, it's $180", **Then** the system categorizes it as bill/reminder, extracts date and amount, sets reminder, and confirms "Got it! Bill reminder: Electricity $180 due Friday. I'll remind you Thursday evening."

2. **Given** user sends a voice note saying "Meeting with Sarah tomorrow at 3pm about the project", **When** the voice is transcribed and processed, **Then** system categorizes as social commitment, extracts calendar event details, and confirms "Calendar event: Meeting with Sarah tomorrow 3pm about project. Added to your schedule."

3. **Given** user forwards a photo of a DHL delivery notice, **When** image is processed with OCR, **Then** system extracts tracking number, sets up monitoring, and confirms "Package tracking: DHL [tracking#]. I'll monitor delivery status and update you."

---

### User Story 2 - Natural Language Search and Retrieval (Priority: P2)

A user needs to find something they dumped previously using natural conversational language, even with partial or imprecise recall.

**Why this priority**: The dumpster is only valuable if users can retrieve things later. Search must work for chaotic minds who remember fragments, not precise details.

**Independent Test**: Can be tested by dumping various content, then searching with natural language queries and verifying relevant results are returned with context.

**Acceptance Scenarios**:

1. **Given** user previously dumped "DHL package with new phone arriving Tuesday", **When** they search "What was that DHL thing?", **Then** system returns the package tracking information with current status and original context.

2. **Given** user dumped various bills over time, **When** they search "Bills this month?", **Then** system returns all bill-related dumps from current month with amounts, due dates, and payment status.

3. **Given** user mentioned "dinner with Mike next week", **When** they search "When's that dinner?" 3 days later, **Then** system finds the social commitment and provides date, time, and any additional context.

---

### User Story 3 - Daily Digest and Proactive Reminders (Priority: P3)

User receives a morning digest of pending items, upcoming deadlines, and contextual reminders at optimal times throughout the day.

**Why this priority**: Transforms passive storage into proactive assistance. Critical for preventing forgotten tasks but requires reliable capture and processing first.

**Independent Test**: Can be tested by setting up various dumps with different urgencies and timeframes, then verifying digest content and reminder timing.

**Acceptance Scenarios**:

1. **Given** user has pending bills, upcoming meetings, and package deliveries, **When** daily digest time arrives, **Then** system sends prioritized summary with actionable items and time-sensitive reminders.

2. **Given** user dumped "Call dentist to schedule cleaning" 3 days ago, **When** system detects no follow-up action, **Then** it proactively reminds "Haven't seen follow-up on calling dentist - still need to schedule?"

3. **Given** user has delivery expected today, **When** package is delivered, **Then** system immediately notifies with delivery confirmation and removes from active tracking.

---

### User Story 4 - Error Recovery and Manual Correction (Priority: P2)

When AI misunderstands or fails to process content correctly, user can easily report issues and system gracefully handles edge cases without losing information.

**Why this priority**: Essential for MVP reliability. Users must trust that even when AI fails, nothing is lost and problems can be corrected.

**Independent Test**: Can be tested by intentionally sending ambiguous content, using the /report command, and verifying fallback systems work correctly.

**Acceptance Scenarios**:

1. **Given** AI fails to categorize user input properly, **When** user sends "/report" with the message, **Then** content is flagged for manual review and user receives confirmation that it will be corrected.

2. **Given** user sends complex or ambiguous content, **When** AI confidence is low, **Then** system saves content as "needs review" and responds "Saved your message - I'll process this better soon. Use /report if urgent."

3. **Given** user wants to see what AI extracted from previous dumps, **When** they use "/recent" command, **Then** system shows recent items with AI understanding and option to report any errors.

---

### User Story 5 - Multi-Modal Content Processing (Priority: P2)

User can dump any type of content - text messages, voice notes, photos of documents, screenshots, forwarded emails - and AI extracts meaningful information from each format.

**Why this priority**: Physical world integration is a key differentiator. Users often need to capture bills, letters, receipts, and handwritten notes.

**Independent Test**: Can be tested by sending various content types and verifying appropriate processing for each format.

**Acceptance Scenarios**:

1. **Given** user photographs a physical bill, **When** image is processed, **Then** system extracts company name, amount, due date via OCR and creates appropriate bill reminder.

2. **Given** user forwards an email confirmation, **When** forwarded to mydumpster@domain.com, **Then** system processes email content, extracts relevant details, and categorizes appropriately.

3. **Given** user sends screenshot of important information, **When** image contains text, **Then** system uses OCR to extract text content and processes as if it were typed message.

---

### Edge Cases

- What happens when voice transcription fails or is inaccurate?
- How does system handle non-English content or mixed languages?
- What if user dumps duplicate information multiple times?
- How does system handle extremely long voice notes or complex images?
- What happens when AI confidence is very low for categorization?
- How does system handle time zones for users traveling internationally?
- What if WhatsApp/Telegram connectivity is lost during processing?
- How does system handle rapid-fire dumps of multiple items?

## Requirements *(mandatory)*

### Functional Requirements

#### Core Capture and Processing
- **FR-001**: System MUST accept content via WhatsApp bot interface including text messages, voice notes, and photos
- **FR-002**: System MUST accept content via Telegram bot interface with identical capabilities for development/testing
- **FR-003**: System MUST accept content via email forwarding to dedicated inbox address
- **FR-004**: System MUST transcribe voice messages to text with accuracy sufficient for content understanding
- **FR-005**: System MUST process images using OCR to extract text content from photos and screenshots
- **FR-006**: System MUST store all original user inputs verbatim alongside AI processing results
- **FR-007**: System MUST provide immediate confirmation response showing AI understanding and actions taken

#### AI Analysis and Categorization
- **FR-008**: System MUST categorize all content into types: bill, reminder, tracking, idea, task, information, social commitment
- **FR-009**: System MUST extract entities including dates, amounts, names, tracking numbers, and deadlines
- **FR-010**: System MUST assign urgency levels to categorized content based on context and deadlines
- **FR-011**: System MUST identify actionable items and automatically create appropriate reminders
- **FR-012**: System MUST convert extracted dates into calendar events when appropriate, providing iCal/ICS export or calendar URLs compatible with standard calendar applications
- **FR-013**: System MUST track delivery status for extracted tracking numbers
- **FR-014**: System MUST link extracted names to user's contact information when possible

#### Search and Retrieval
- **FR-015**: System MUST provide natural language search capability for all stored content
- **FR-016**: System MUST enhance user search queries to improve result relevance
- **FR-017**: System MUST return search results with full original context and AI analysis
- **FR-018**: System MUST support fuzzy matching for partial or imprecise search terms
- **FR-019**: System MUST provide time-based filtering for search results (today, this week, this month)

#### User Interface and Commands
- **FR-020**: System MUST support core bot commands: /start, /search, /recent, /pending, /report, /demo, /help
- **FR-021**: System MUST provide onboarding sequence with sample dumps for new users
- **FR-022**: System MUST show recent dumps with processing status via /recent command
- **FR-023**: System MUST display pending action items via /pending command
- **FR-024**: System MUST allow users to flag any content for manual review via /report command
- **FR-025**: System MUST format all bot command responses with consistent structure including headers, sections, and clear formatting for readability

#### Proactive Intelligence
- **FR-026**: System MUST generate daily digest of pending items, upcoming deadlines, and priorities
- **FR-027**: System MUST send reminders at contextually appropriate times before deadlines
- **FR-028**: System MUST detect patterns in user behavior and forgotten items
- **FR-029**: System MUST proactively surface relevant information based on context and timing
- **FR-030**: System MUST track completion status of tasks and reminders

#### Error Handling and Quality Assurance
- **FR-031**: System MUST mark content as "needs review" when AI confidence is below 40-50% threshold (aggressive automation for MVP)
- **FR-032**: System MUST provide fallback responses for failed AI processing attempts
- **FR-033**: System MUST maintain processing status for all content: processed, pending, failed, needs_review
- **FR-034**: System MUST prevent silent failures - all content must receive acknowledgment
- **FR-035**: System MUST provide admin interface for reviewing and correcting AI misclassifications
- **FR-036**: System MUST support manual correction of AI analysis with user feedback integration
- **FR-037**: System MUST queue messages during rate limit periods and notify users of processing delays

#### Data Management
- **FR-038**: System MUST persist all user data including original content, AI analysis, and user corrections
- **FR-039**: System MUST support user timezone configuration for accurate deadline processing
- **FR-040**: System MUST handle user language preferences for multi-language support
- **FR-041**: System MUST maintain user settings including digest timing and notification preferences
- **FR-042**: System MUST provide data export capability for user content and analysis
- **FR-043**: System MUST authenticate users via phone number verification using SMS or WhatsApp verification codes

### Key Entities

- **User**: Represents individual using the system with chat_id, timezone, language preferences, digest timing settings, and notification preferences
- **Dump**: Core content unit containing original user input, AI analysis results, category, urgency level, extracted entities, processing status, and timestamps
- **Reminder**: Time-based notifications linked to dumps with scheduled delivery time, reminder text, completion status, and user context
- **Entity**: Extracted information from dumps including dates, amounts, tracking numbers, names, and locations with confidence scores
- **Category**: Classification system for dumps including bills, reminders, tracking, ideas, tasks, information, and social commitments
- **SearchQuery**: User search requests with original query, enhanced query, result sets, and relevance scoring
- **ProcessingStatus**: Tracking system for content flow including received, analyzing, processed, failed, needs_review, and completed states

## Success Criteria *(mandatory)*

### Measurable Outcomes

#### User Experience and Engagement
- **SC-001**: Users can successfully dump any type of content and receive meaningful AI confirmation within 10 seconds
- **SC-002**: 90% of users can find previously dumped content using natural language search on first attempt
- **SC-003**: Users return to interact with daily digest at least 5 days per week within first month
- **SC-004**: 95% of voice transcriptions achieve sufficient accuracy for AI categorization and user understanding
- **SC-005**: 85% of image OCR extractions provide actionable information for bill/document processing

#### AI Performance and Reliability  
- **SC-006**: AI categorization achieves 90% accuracy for common content types (bills, reminders, tracking, tasks)
- **SC-007**: Entity extraction correctly identifies dates, amounts, and names in 95% of structured content
- **SC-008**: Less than 5% of dumps require manual review due to AI processing failures
- **SC-009**: Search queries return relevant results within 3 seconds with 90% user satisfaction
- **SC-010**: Zero silent failures - 100% of user inputs receive acknowledgment or error handling

#### Productivity and Value Delivery
- **SC-011**: Users report 40% reduction in forgotten tasks and missed deadlines within 30 days
- **SC-012**: Average time to find specific information reduces from 5+ minutes to under 30 seconds
- **SC-013**: 80% of users successfully complete onboarding and understand core functionality within first session
- **SC-014**: Daily active users maintain 70% retention rate after 30 days of usage
- **SC-015**: Support tickets related to lost or unfindable information reduce by 60%

#### System Performance and Scalability
- **SC-016**: System processes content dumps from 1000 concurrent users without performance degradation
- **SC-017**: WhatsApp/Telegram bot responses maintain 99% uptime during business hours
- **SC-018**: Email forwarding processing completes within 30 seconds for standard document types
- **SC-019**: Database queries for search and retrieval complete within 2 seconds for users with 1000+ dumps
- **SC-020**: System maintains data integrity with 99.9% accuracy for all stored content and relationships

### User Satisfaction Metrics
- **SC-021**: 85% of users rate the AI understanding as "accurate" or "very accurate" for their content
- **SC-022**: 90% of users find the daily digest "useful" or "very useful" for staying organized
- **SC-023**: Net Promoter Score (NPS) exceeds 50 for users after 30 days of regular usage
- **SC-024**: 75% of users successfully recover from AI processing errors using /report command
- **SC-025**: Time from content dump to actionable reminder averages less than 24 hours for urgent items

## Assumptions

### User Behavior Assumptions
- Users primarily communicate via WhatsApp and are comfortable with bot interactions
- Target users have smartphones capable of voice recording and photo capture
- Users are willing to forward sensitive information (bills, personal reminders) to AI system
- Users prefer conversational interfaces over traditional app navigation
- Primary language for initial MVP will be English with multi-language support planned

### Technical Assumptions  
- WhatsApp Business API provides reliable message delivery and media handling
- Third-party AI services (Claude API) maintain consistent availability and performance
- Speech-to-text services achieve acceptable accuracy for conversational voice notes
- OCR technology can extract text from smartphone photos of documents and bills
- Users have stable internet connectivity for real-time bot interactions

### Business Assumptions
- Market demand exists for AI-powered personal organization tools
- Users value convenience over manual organization and are willing to trust AI categorization
- Subscription model viable for personal productivity tools in target market
- Competition from general AI assistants (ChatGPT, Google Assistant) differentiable through specialized focus
- Privacy concerns manageable through transparent data handling and local processing options

## Constraints

### Technical Constraints
- WhatsApp Business API rate limits and message handling restrictions
- Third-party AI service costs scale with usage volume requiring efficient processing
- Voice transcription accuracy varies with audio quality, accents, and background noise
- Image OCR reliability depends on photo quality, lighting, and document formatting
- Real-time processing requirements limit complex AI analysis timeframes

### Regulatory Constraints
- Data privacy regulations (GDPR, CCPA) require explicit consent and data handling transparency
- Financial information processing may trigger additional compliance requirements
- Cross-border data transfer restrictions limit server deployment options
- User data retention policies must balance utility with privacy requirements

### Business Constraints
- Initial MVP must demonstrate value with limited development resources
- User acquisition cost must remain sustainable for personal productivity market
- Customer support requirements scale with user base and AI accuracy issues
- Competitive landscape includes well-funded general AI assistants and established productivity tools

### User Experience Constraints
- Mobile-first design required as primary interaction through messaging apps
- Response time expectations set by existing bot and AI assistant experiences
- Learning curve must be minimal for non-technical users
- Error recovery must be intuitive without requiring technical support

## Dependencies

### External Service Dependencies
- **WhatsApp Business API**: Core messaging interface for user interactions
- **Telegram Bot API**: Development and testing interface with feature parity
- **Claude AI API**: Primary natural language understanding and categorization
- **Speech-to-Text Service**: Voice message transcription capability
- **OCR Service**: Image text extraction for documents and photos
- **Email Service Provider**: Handling mydumpster@domain.com forwarding

### Internal System Dependencies
- **User Authentication**: Secure linking of messaging accounts to user profiles
- **Database System**: Persistent storage for dumps, analysis, and user preferences
- **Reminder Scheduling**: Time-based notification delivery system
- **Search Infrastructure**: Full-text and semantic search capabilities
- **Admin Dashboard**: Manual review and correction interface for AI errors

### Third-Party Integration Dependencies
- **Calendar Systems**: Integration with user's existing calendar for event creation
- **Shipping Carriers**: APIs for tracking number monitoring and delivery status
- **Contact Management**: Access to user's contacts for name recognition and linking

