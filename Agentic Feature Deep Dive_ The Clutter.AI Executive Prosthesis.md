# Agentic Feature Deep Dive: The Clutter.AI Executive Prosthesis

This document details the nine specialized AI Agents that transform Clutter.AI from a universal inbox into an **Executive Prosthesis**, specifically designed to overcome executive dysfunction and high mental load.

---

## 1. Proactive Agent (System Safety Net)

The Proactive Agent is the system's safety net, monitoring all commitments for the *absence* of an expected action and intervening before a deadline is missed. It incorporates the **Forgotten Follow-up** detection feature.

| Aspect | Detail |
| :--- | :--- |
| **Core Concept** | **Failure Monitoring and Intervention.** It monitors for the *absence* of a completion signal for a captured commitment. |
| **Specific Use Cases** | **Financial**: Reminding a user to pay a bill 3 days before the due date because no payment receipt has been captured. **Social**: Alerting the user that they have not yet called a contact they promised to call last week. |
| **Underlying AI Mechanism** | **Semantic Monitoring**: Uses NLU to identify the commitment and the expected "Completion Signal." It then uses **Vector Search (pgvector)** to continuously monitor new dumps for semantic similarity to the Completion Signal. If the signal is not found within a critical time window, it triggers an alert. |

---

## 2. Concierge Agent (Execution)

The Concierge Agent reduces the **friction of initiation** for tedious, bureaucratic tasks by preparing them for immediate, one-click action.

| Aspect | Detail |
| :--- | :--- |
| **Core Concept** | **Action Preparation and Simplification.** It performs the "busy work" steps of a task so the user only has to complete the final, high-friction step. |
| **Specific Use Cases** | **Bill Payment**: User dumps a utility bill PDF. The Agent extracts the payment code, amount, and due date, and prepares a message with the code ready to be copied into the banking app. **Form Filling**: User dumps a screenshot of a required form. The Agent extracts all known personal data (name, address, ID) and pre-fills a draft document. |
| **Underlying AI Mechanism** | **Vision AI/OCR & Structured Data Extraction**: Advanced OCR and layout analysis to parse documents (PDFs, images) into structured data fields. **API Integration**: Future integration with payment or form services to automate steps. |

---

## 3. Decomposer Agent (Planning)

The Decomposer Agent combats **task paralysis** by automatically breaking down vague, overwhelming projects into small, concrete, and immediately actionable micro-steps.

| Aspect | Detail |
| :--- | :--- |
| **Core Concept** | **Complexity Reduction.** It transforms abstract goals into a sequential, manageable checklist. |
| **Specific Use Cases** | **Vague Task**: User dumps "Organize birthday party." The Agent responds with: "1. Finalize guest list (Today). 2. Book venue (Tomorrow). 3. Send invitations (Day 3)." **Bureaucracy**: User dumps "Apply for Visa." The Agent breaks it into: "1. Locate passport. 2. Check consulate website for required documents. 3. Schedule appointment." |
| **Underlying AI Mechanism** | **Goal-Oriented NLU & Planning LLM**: Uses a large language model (e.g., Claude API) fine-tuned on project management methodologies to identify the core goal and generate a logical, step-by-step plan. **Heuristic Detection**: Triggers when NLU detects vague verbs like "Plan," "Organize," or "Handle." |

---

## 4. Temporal Agent (Time Management)

The Temporal Agent combats **time blindness** and chronic lateness by translating abstract event times into the concrete "Time to Act" required to be ready.

| Aspect | Detail |
| :--- | :--- |
| **Core Concept** | **Time Translation and Contextual Alerting.** It calculates the actual time a user must *start* preparing for an event. |
| **Specific Use Cases** | **Appointment**: User has a meeting at 14:00. The Agent calculates: 30 min travel + 20 min preparation = **13:10 "Time to Act"**. It sends a critical alert at 13:10, not 14:00. **Travel**: Adjusts the "Time to Act" dynamically based on real-time traffic data and calendar context (e.g., if the user is already in a meeting). |
| **Underlying AI Mechanism** | **Calendar Integration & Geospatial API**: Requires read access to the user's calendar and integration with a Maps/Traffic API (e.g., Google Maps, Waze). **Time-Cost Model**: A proprietary model that estimates user-specific preparation time based on historical data and event type. |

---

## 5. Mediator Agent (Conflict Resolution)

The Mediator Agent prevents **burnout and over-scheduling** by cross-checking new commitments against the user's existing schedule and estimated mental load.

| Aspect | Detail |
| :--- | :--- |
| **Core Concept** | **Load Balancing and Commitment Vetting.** It acts as a gatekeeper for the user's time and energy. |
| **Specific Use Cases** | **Over-commitment**: User dumps "Schedule dentist Tuesday at 14:00." The Agent checks the calendar and responds: "Warning: You have a high-effort client call scheduled at 13:30. Are you sure you want to schedule a stressful appointment immediately after?" **Energy Management**: Based on calendar tags (e.g., "High Focus," "Low Energy"), it suggests rescheduling low-priority tasks during high-load periods. |
| **Underlying AI Mechanism** | **Calendar & Task Graph Analysis**: Analyzes the density and type of events in the user's calendar. **Effort Scoring**: Assigns a mental "effort score" to tasks and events based on keywords and user-defined tags. |

---

## 6. Dopamine Agent (Motivation)

The Dopamine Agent uses subtle gamification and task filtering to reduce the anxiety associated with long to-do lists, promoting focus and a sense of accomplishment.

| Aspect | Detail |
| :--- | :--- |
| **Core Concept** | **Anxiety Reduction and Focus Stimulation.** It makes the task list feel manageable and rewards completion. |
| **Specific Use Cases** | **"Only 3 Things Mode"**: When the user opens the task list, the Agent hides all but the three most critical, high-impact tasks, reducing overwhelm. **Celebration**: Upon completing a task, the Agent provides variable, positive feedback (e.g., "Boom! You just earned 15 minutes of free time!") to reinforce the behavior. |
| **Underlying AI Mechanism** | **Prioritization Algorithm**: Ranks tasks by urgency, impact, and estimated effort. **Gamification Engine**: Simple logic to track task completion streaks and deliver varied, positive reinforcement messages. |

---

## 7. Focus Agent (Focus/Accountability)

The Focus Agent simulates the concept of "Body Doubling" by providing passive, non-judgmental accountability to help the user maintain focus on a task.

| Aspect | Detail |
| :--- | :--- |
| **Core Concept** | **Simulated Accountability.** It acts as a silent companion to help initiate and sustain focus sessions. |
| **Specific Use Cases** | **Focus Session**: User initiates a 20-minute focus block. The Agent sends a message: "I'm here. Starting the timer now. I'll check in at the end." **Check-in**: After the timer, the Agent sends a gentle prompt: "Time's up! How did that go? Did you finish, or do you need another block?" |
| **Underlying AI Mechanism** | **Timer/Session Management**: Simple time-based trigger. **Conversational Scripting**: Uses a pre-defined, supportive, and non-intrusive script to simulate a human companion, minimizing cognitive load. |

---

## 8. Recall Agent (Memory/Capture)

The Recall Agent addresses short-term memory failure during the capture process, intervening when the user is distracted before completing a dump.

| Aspect | Detail |
| :--- | :--- |
| **Core Concept** | **Intention Recovery.** It detects a failed capture attempt and prompts the user to recover the lost thought. |
| **Specific Use Cases** | **Distraction**: User opens the WhatsApp chat to dump an idea, gets distracted by a notification, and closes the app. The Agent detects the incomplete session and prompts: "Hey, you opened the chat 5 minutes ago but didn't send anything. Did you forget what you were going to dump?" **Contextual Prompt**: If the user was looking at a specific website before opening the app, the Agent might prompt: "Were you going to save something about the new project?" |
| **Underlying AI Mechanism** | **Session Monitoring**: Tracks the time between opening the capture interface and sending a message. **Contextual Hinting**: Uses recent browser history or clipboard data (with user permission) to provide a hint to the user. |

---

## 9. Household Agent (Coordination)

The Household Agent extends the Mediator Agent's functionality to multiple users, resolving scheduling conflicts and coordinating logistics for families or small teams.

| Aspect | Detail |
| :--- | :--- |
| **Core Concept** | **Multi-User Logistics Coordination.** It cross-references the calendars and commitments of linked users. |
| **Specific Use Cases** | **Conflict Detection**: User A schedules an event that conflicts with User B's critical commitment. The Agent alerts both: "Warning: Pedro has swimming practice and Ana has a doctor's appointment at the same time. Who is taking whom?" **Shared Task Management**: Automatically assigns tasks based on availability and historical responsibility (e.g., "It's your turn to buy groceries"). |
| **Underlying AI Mechanism** | **Multi-User Calendar API & Shared Task Graph**: Requires secure, permission-based access to multiple user calendars and a shared task database. **Conflict Resolution Logic**: A rule-based system that prioritizes events and suggests the most efficient resolution. |
