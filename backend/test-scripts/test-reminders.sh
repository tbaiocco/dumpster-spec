#!/bin/bash

# Quick test for Reminder Service functionality
# Tests: Create, List, Update, Snooze, Dismiss, Delete

set -e

# Load environment
source ../.env.test 2>/dev/null || {
    echo "❌ Run setup-test-environment.sh first"
    exit 1
}

echo "🔔 Testing Reminder Service"
echo "==========================="
echo ""

# Helper function
test_endpoint() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    
    echo "Testing: $name"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$API_BASE$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$API_BASE$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo "✅ Success ($http_code)"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    else
        echo "❌ Failed ($http_code)"
        echo "$body"
    fi
    echo ""
}

# Test 1: Create reminder
echo "1️⃣  Create one-time reminder"
SCHEDULED_TIME=$(date -u -d "+2 hours" +"%Y-%m-%dT%H:%M:%S.000Z")
CREATE_RESPONSE=$(curl -s -X POST "$API_BASE/api/reminders" \
    -H "Content-Type: application/json" \
    -d "{
        \"userId\": \"$TEST_USER_ID\",
        \"message\": \"Test reminder: Call dentist\",
        \"scheduledFor\": \"$SCHEDULED_TIME\",
        \"reminderType\": \"follow_up\"
    }")

REMINDER_ID=$(echo "$CREATE_RESPONSE" | jq -r '.data.id // .id // empty' 2>/dev/null)

if [ -n "$REMINDER_ID" ]; then
    echo "✅ Created reminder: $REMINDER_ID"
    echo "$CREATE_RESPONSE" | jq '.'
else
    echo "❌ Failed to create reminder"
    echo "$CREATE_RESPONSE"
    exit 1
fi
echo ""

# Test 2: Get all reminders
echo "2️⃣  Get all user reminders"
test_endpoint "List reminders" "GET" "/api/reminders?userId=$TEST_USER_ID"

# Test 3: Get upcoming reminders
echo "3️⃣  Get upcoming reminders (next 24h)"
test_endpoint "Upcoming reminders" "GET" "/api/reminders/upcoming?userId=$TEST_USER_ID&hoursAhead=24"

# Test 4: Get reminder stats
echo "4️⃣  Get reminder statistics"
test_endpoint "Reminder stats" "GET" "/api/reminders/stats?userId=$TEST_USER_ID"

# Test 5: Update reminder
echo "5️⃣  Update reminder"
NEW_TIME=$(date -u -d "+3 hours" +"%Y-%m-%dT%H:%M:%S.000Z")
test_endpoint "Update reminder" "PUT" "/api/reminders/$REMINDER_ID" \
    "{
        \"message\": \"UPDATED: Call dentist - URGENT\",
        \"scheduledFor\": \"$NEW_TIME\"
    }"

# Test 6: Snooze reminder
echo "6️⃣  Snooze reminder (15 minutes)"
test_endpoint "Snooze reminder" "POST" "/api/reminders/$REMINDER_ID/snooze" \
    '{"minutes": 15}'

# Test 7: Dismiss reminder
echo "7️⃣  Dismiss reminder"
test_endpoint "Dismiss reminder" "POST" "/api/reminders/$REMINDER_ID/dismiss" \
    '{}'

# Test 8: Create recurring reminder
echo "8️⃣  Create recurring daily reminder"
DAILY_TIME=$(date -u -d "+1 day 09:00" +"%Y-%m-%dT%H:%M:%S.000Z")
END_DATE=$(date -u -d "+30 days" +"%Y-%m-%dT%H:%M:%S.000Z")
RECURRING_RESPONSE=$(curl -s -X POST "$API_BASE/api/reminders" \
    -H "Content-Type: application/json" \
    -d "{
        \"userId\": \"$TEST_USER_ID\",
        \"message\": \"Daily standup meeting\",
        \"scheduledFor\": \"$DAILY_TIME\",
        \"reminderType\": \"recurring\",
        \"recurrencePattern\": {
            \"frequency\": \"daily\",
            \"interval\": 1,
            \"endDate\": \"$END_DATE\"
        }
    }")

RECURRING_ID=$(echo "$RECURRING_RESPONSE" | jq -r '.data.id // .id // empty' 2>/dev/null)
echo "✅ Created recurring reminder: $RECURRING_ID"
echo "$RECURRING_RESPONSE" | jq '.'
echo ""

# Test 9: Delete reminders
echo "9️⃣  Delete test reminders"
test_endpoint "Delete first reminder" "DELETE" "/api/reminders/$REMINDER_ID"
if [ -n "$RECURRING_ID" ]; then
    test_endpoint "Delete recurring reminder" "DELETE" "/api/reminders/$RECURRING_ID"
fi

echo "✅ Reminder Service tests complete!"
