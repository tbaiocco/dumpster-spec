# Phase 7 Manual Testing Plan

## Overview
Comprehensive manual testing guide for Phase 7 features using curl commands. This document provides step-by-step test scenarios for all 11 new services.

## Prerequisites

1. **Environment Setup**
   ```bash
   # Start local server
   npm run start:dev
   
   # Expose via ngrok (separate terminal)
   ngrok http 3000
   ```

2. **Test User ID**
   ```bash
   export TEST_USER_ID="e1fd947b-8d35-45dd-b9aa-a6458457521b"
   export API_BASE="http://localhost:3000"
   # Or use ngrok URL: export API_BASE="https://your-ngrok-id.ngrok.io"
   ```

3. **Test Data**
   ```bash
   # Create test dumps for reminders
   ./test-scripts/create-phase7-test-data.sh
   ```

---

## Test Scenarios

### 1. Reminder Service Tests

#### 1.1 Create One-Time Reminder
```bash
# Create reminder for 2 hours from now
SCHEDULED_TIME=$(date -u -d "+2 hours" +"%Y-%m-%dT%H:%M:%S.000Z")

curl -X POST "$API_BASE/api/reminders" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$TEST_USER_ID\",
    \"message\": \"Call dentist to schedule appointment\",
    \"scheduledFor\": \"$SCHEDULED_TIME\",
    \"reminderType\": \"follow_up\"
  }"
```

**Expected**: 201 Created with reminder ID

#### 1.2 Create Recurring Daily Reminder
```bash
SCHEDULED_TIME=$(date -u -d "+1 day 09:00" +"%Y-%m-%dT%H:%M:%S.000Z")

curl -X POST "$API_BASE/api/reminders" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$TEST_USER_ID\",
    \"message\": \"Daily standup meeting\",
    \"scheduledFor\": \"$SCHEDULED_TIME\",
    \"reminderType\": \"recurring\",
    \"recurrencePattern\": {
      \"frequency\": \"daily\",
      \"interval\": 1,
      \"endDate\": \"$(date -u -d '+30 days' +"%Y-%m-%dT%H:%M:%S.000Z")\"
    }
  }"
```

**Expected**: 201 Created with recurring reminder

#### 1.3 Get All User Reminders
```bash
curl -X GET "$API_BASE/api/reminders?userId=$TEST_USER_ID"
```

**Expected**: Array of reminders with status, scheduled times

#### 1.4 Get Upcoming Reminders (Next 24h)
```bash
curl -X GET "$API_BASE/api/reminders/upcoming?userId=$TEST_USER_ID&hoursAhead=24"
```

**Expected**: Array of pending reminders in next 24 hours

#### 1.5 Get Reminder Statistics
```bash
curl -X GET "$API_BASE/api/reminders/stats?userId=$TEST_USER_ID"
```

**Expected**: Stats object with total, pending, sent, dismissed counts

#### 1.6 Update Reminder
```bash
# Save reminder ID from create response
REMINDER_ID="<reminder-id-from-create>"

curl -X PUT "$API_BASE/api/reminders/$REMINDER_ID" \
  -H "Content-Type: application/json" \
  -d "{
    \"message\": \"Call dentist - URGENT\",
    \"scheduledFor\": \"$(date -u -d '+3 hours' +"%Y-%m-%dT%H:%M:%S.000Z")\"
  }"
```

**Expected**: 200 OK with updated reminder

#### 1.7 Snooze Reminder (15 minutes)
```bash
curl -X POST "$API_BASE/api/reminders/$REMINDER_ID/snooze" \
  -H "Content-Type: application/json" \
  -d "{
    \"minutes\": 15
  }"
```

**Expected**: 200 OK with status changed to 'snoozed'

#### 1.8 Dismiss Reminder
```bash
curl -X POST "$API_BASE/api/reminders/$REMINDER_ID/dismiss" \
  -H "Content-Type: application/json"
```

**Expected**: 200 OK with status changed to 'dismissed'

#### 1.9 Delete Reminder
```bash
curl -X DELETE "$API_BASE/api/reminders/$REMINDER_ID"
```

**Expected**: 200 OK

---

### 2. Digest Service Tests

#### 2.1 Generate Daily Digest
```bash
curl -X POST "$API_BASE/api/notifications/digest/daily" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$TEST_USER_ID\"
  }"
```

**Expected**: Digest with today's reminders, recent captures, recommendations

#### 2.2 Generate Morning Digest
```bash
curl -X POST "$API_BASE/api/notifications/digest/morning" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$TEST_USER_ID\"
  }"
```

**Expected**: Morning-focused digest with today's priorities

#### 2.3 Generate Evening Digest
```bash
curl -X POST "$API_BASE/api/notifications/digest/evening" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$TEST_USER_ID\"
  }"
```

**Expected**: Evening digest with tomorrow's preview

#### 2.4 Format Digest as HTML
```bash
curl -X GET "$API_BASE/api/notifications/digest/$TEST_USER_ID/html"
```

**Expected**: HTML-formatted digest (check for HTML escaping)

#### 2.5 Format Digest as Plain Text
```bash
curl -X GET "$API_BASE/api/notifications/digest/$TEST_USER_ID/text"
```

**Expected**: Plain text digest

---

### 3. Proactive Analysis Service Tests

#### 3.1 Analyze Recent Content for Insights
```bash
curl -X POST "$API_BASE/api/notifications/proactive/analyze" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$TEST_USER_ID\",
    \"hoursBack\": 48
  }"
```

**Expected**: AI-generated insights with recommended reminders

#### 3.2 Create Suggested Reminders
```bash
# Use insight from previous call
curl -X POST "$API_BASE/api/notifications/proactive/create-reminders" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$TEST_USER_ID\",
    \"insights\": [
      {
        \"pattern\": \"Multiple mentions of meeting prep\",
        \"suggestion\": \"Set reminder for meeting preparation\",
        \"confidence\": 85
      }
    ]
  }"
```

**Expected**: Created reminders from AI suggestions

---

### 4. Tracking Service Tests

#### 4.1 Track Item (Generic)
```bash
curl -X POST "$API_BASE/api/tracking/track" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$TEST_USER_ID\",
    \"dumpId\": \"<dump-id>\",
    \"trackingType\": \"deadline\",
    \"description\": \"Project proposal deadline\",
    \"targetDate\": \"$(date -u -d '+7 days' +"%Y-%m-%dT%H:%M:%S.000Z")\"
  }"
```

**Expected**: Created tracking item

#### 4.2 Get All Tracked Items
```bash
curl -X GET "$API_BASE/api/tracking?userId=$TEST_USER_ID"
```

**Expected**: Array of tracked items

#### 4.3 Get Active Tracked Items
```bash
curl -X GET "$API_BASE/api/tracking/active?userId=$TEST_USER_ID"
```

**Expected**: Only active (not completed/expired) items

#### 4.4 Complete Tracked Item
```bash
TRACKING_ID="<tracking-id>"

curl -X PUT "$API_BASE/api/tracking/$TRACKING_ID/complete" \
  -H "Content-Type: application/json"
```

**Expected**: Status changed to completed

---

### 5. Package Tracking Service Tests

#### 5.1 Track Package (UPS)
```bash
curl -X POST "$API_BASE/api/tracking/package" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$TEST_USER_ID\",
    \"trackingNumber\": \"1Z999AA10123456784\",
    \"carrier\": \"ups\",
    \"description\": \"Amazon order - electronics\"
  }"
```

**Expected**: Package tracking created with carrier detected

#### 5.2 Track Package (FedEx)
```bash
curl -X POST "$API_BASE/api/tracking/package" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$TEST_USER_ID\",
    \"trackingNumber\": \"123456789012\",
    \"carrier\": \"fedex\",
    \"description\": \"Office supplies\"
  }"
```

**Expected**: FedEx package tracking

#### 5.3 Track Package (USPS)
```bash
curl -X POST "$API_BASE/api/tracking/package" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$TEST_USER_ID\",
    \"trackingNumber\": \"9400111899562537503129\",
    \"carrier\": \"usps\",
    \"description\": \"Books from library\"
  }"
```

**Expected**: USPS package tracking

#### 5.4 Get All Packages
```bash
curl -X GET "$API_BASE/api/tracking/packages?userId=$TEST_USER_ID"
```

**Expected**: Array of all tracked packages

#### 5.5 Update Package Status
```bash
PACKAGE_ID="<package-tracking-id>"

curl -X PUT "$API_BASE/api/tracking/package/$PACKAGE_ID" \
  -H "Content-Type: application/json" \
  -d "{
    \"status\": \"delivered\",
    \"lastUpdate\": \"Package delivered to front door\"
  }"
```

**Expected**: Updated package status

---

### 6. Calendar Service Tests

#### 6.1 Generate ICS Calendar File
```bash
curl -X POST "$API_BASE/api/calendar/generate" \
  -H "Content-Type: application/json" \
  -d "{
    \"events\": [
      {
        \"title\": \"Team Meeting\",
        \"description\": \"Weekly sync\",
        \"startTime\": \"$(date -u -d 'tomorrow 14:00' +"%Y-%m-%dT%H:%M:%S.000Z")\",
        \"endTime\": \"$(date -u -d 'tomorrow 15:00' +"%Y-%m-%dT%H:%M:%S.000Z")\",
        \"location\": \"Conference Room A\"
      }
    ]
  }" > test-calendar.ics
```

**Expected**: ICS file downloaded

#### 6.2 Generate Reminders Calendar
```bash
curl -X GET "$API_BASE/api/calendar/reminders/$TEST_USER_ID" > reminders-calendar.ics
```

**Expected**: ICS file with all pending reminders

#### 6.3 Parse ICS File
```bash
curl -X POST "$API_BASE/api/calendar/parse" \
  -H "Content-Type: text/calendar" \
  --data-binary @test-calendar.ics
```

**Expected**: Parsed events array

---

### 7. Search Result Formatter Tests

#### 7.1 Search and Format for Telegram
```bash
curl -X POST "$API_BASE/api/search" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$TEST_USER_ID\",
    \"query\": \"electricity bill\",
    \"platform\": \"telegram\"
  }"
```

**Expected**: Results with Telegram HTML formatting (<b>, <i>)

#### 7.2 Search and Format for WhatsApp
```bash
curl -X POST "$API_BASE/api/search" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$TEST_USER_ID\",
    \"query\": \"electricity bill\",
    \"platform\": \"whatsapp\"
  }"
```

**Expected**: Results with WhatsApp markdown formatting (*, _)

---

### 8. /more Command Tests (Pagination)

#### 8.1 Initial Search
```bash
# Search returns first 5 results + stores session
curl -X POST "$API_BASE/api/bots/telegram/search" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$TEST_USER_ID\",
    \"chatId\": \"test-chat-123\",
    \"query\": \"meeting\"
  }"
```

**Expected**: First 5 results + "Use /more for additional results"

#### 8.2 Get More Results
```bash
curl -X POST "$API_BASE/api/bots/telegram/more" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$TEST_USER_ID\",
    \"chatId\": \"test-chat-123\"
  }"
```

**Expected**: Next 5 results (6-10)

#### 8.3 Continue Pagination
```bash
# Call multiple times to go through all results
curl -X POST "$API_BASE/api/bots/telegram/more" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$TEST_USER_ID\",
    \"chatId\": \"test-chat-123\"
  }"
```

**Expected**: Results 11-15, 16-20, etc.

#### 8.4 No More Results
```bash
# After all results exhausted
curl -X POST "$API_BASE/api/bots/telegram/more" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$TEST_USER_ID\",
    \"chatId\": \"test-chat-123\"
  }"
```

**Expected**: "✅ End of results"

---

### 9. Fuzzy Match Service Tests

#### 9.1 Fuzzy Search
```bash
curl -X POST "$API_BASE/api/search/fuzzy" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$TEST_USER_ID\",
    \"query\": \"elektrisity bil\"
  }"
```

**Expected**: Results matching "electricity bill" despite typos

#### 9.2 Phonetic Search
```bash
curl -X POST "$API_BASE/api/search/phonetic" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$TEST_USER_ID\",
    \"query\": \"meating\"
  }"
```

**Expected**: Results matching "meeting" based on sound

---

### 10. Cron/Scheduler Service Tests

These are background services that run automatically, but we can test their triggers:

#### 10.1 Trigger Reminder Check
```bash
curl -X POST "$API_BASE/api/admin/cron/check-reminders"
```

**Expected**: Reminders sent for all due items

#### 10.2 Trigger Daily Digest
```bash
curl -X POST "$API_BASE/api/admin/cron/send-digests"
```

**Expected**: Digests sent to all users at their preferred time

---

### 11. Delivery Service Tests

#### 11.1 Send Test Reminder via Telegram
```bash
curl -X POST "$API_BASE/api/notifications/send" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$TEST_USER_ID\",
    \"message\": \"🔔 Test reminder: Check email\",
    \"platform\": \"telegram\"
  }"
```

**Expected**: Message sent to Telegram

#### 11.2 Send Test Reminder via WhatsApp
```bash
curl -X POST "$API_BASE/api/notifications/send" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$TEST_USER_ID\",
    \"message\": \"🔔 Test reminder: Call dentist\",
    \"platform\": \"whatsapp\"
  }"
```

**Expected**: Message sent to WhatsApp

---

## Integration Test Scenarios

### Scenario 1: Complete Reminder Workflow
1. Create dump with meeting notes
2. AI analyzes and suggests reminder
3. Create reminder from suggestion
4. Reminder appears in upcoming list
5. Reminder delivered at scheduled time
6. User snoozes reminder
7. Reminder delivered again after snooze
8. User marks as complete

### Scenario 2: Daily Digest Workflow
1. User creates several dumps throughout day
2. Creates multiple reminders
3. Tracks package delivery
4. Evening: digest generated with summary
5. Digest includes today's activity + tomorrow's reminders
6. Digest delivered via preferred platform

### Scenario 3: Package Tracking Workflow
1. User receives package tracking number via message
2. System detects tracking number
3. Creates package tracking item
4. Sends reminder 1 day before expected delivery
5. User updates status when delivered
6. Tracking marked complete

### Scenario 4: Search Pagination Workflow
1. User searches for common term
2. Gets first 5 results
3. Uses /more to see results 6-10
4. Continues pagination through all results
5. Session expires after 10 minutes
6. New search starts fresh session

---

## Testing Checklist

### Phase 7 Services
- [ ] Reminder Service - CRUD operations
- [ ] Reminder Service - Snooze/Dismiss
- [ ] Reminder Service - Recurring patterns
- [ ] Digest Service - Daily generation
- [ ] Digest Service - Morning/Evening variants
- [ ] Digest Service - HTML/Text formatting
- [ ] Proactive Service - AI analysis
- [ ] Proactive Service - Reminder suggestions
- [ ] Tracking Service - Generic tracking
- [ ] Package Tracking - Multi-carrier support
- [ ] Calendar Service - ICS generation
- [ ] Calendar Service - ICS parsing
- [ ] Search Formatter - Telegram format
- [ ] Search Formatter - WhatsApp format
- [ ] /more Command - Pagination
- [ ] /more Command - Session management
- [ ] Fuzzy Match - Typo tolerance
- [ ] Fuzzy Match - Phonetic matching
- [ ] Cron Service - Scheduled execution
- [ ] Delivery Service - Multi-platform

### Error Handling
- [ ] Invalid user ID
- [ ] Past scheduled times
- [ ] Invalid tracking numbers
- [ ] Expired search sessions
- [ ] Invalid ICS files
- [ ] Missing required fields
- [ ] Database connection errors

### Security
- [ ] HTML escaping in digests (XSS prevention)
- [ ] Input validation
- [ ] Rate limiting
- [ ] Authentication tokens

---

## Notes

- All timestamps should be in ISO 8601 format (UTC)
- Replace `<reminder-id>`, `<dump-id>`, etc. with actual IDs from responses
- Save test results in `test-results/` directory
- Document any failures in `TESTING_SESSION_SUMMARY.md`

## Next Steps

1. Run `./test-scripts/setup-test-environment.sh` to prepare
2. Start server with `npm run start:dev`
3. Expose via ngrok: `ngrok http 3000`
4. Run test scenarios from this document
5. Document results and issues
6. Create automated test suite based on findings
