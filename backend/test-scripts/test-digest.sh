#!/bin/bash

# Quick test for Digest Service functionality
# Tests: Daily, Morning, Evening digests with HTML/Text formatting

set -e

# Load environment
source ../.env.test 2>/dev/null || {
    echo "❌ Run setup-test-environment.sh first"
    exit 1
}

echo "📰 Testing Digest Service"
echo "========================="
echo ""

# Test 1: Generate daily digest
echo "1️⃣  Generate daily digest"
DAILY_DIGEST=$(curl -s -X POST "$API_BASE/api/notifications/digest/daily" \
    -H "Content-Type: application/json" \
    -d "{
        \"userId\": \"$TEST_USER_ID\"
    }")

echo "$DAILY_DIGEST" | jq '.'
echo ""

# Test 2: Generate morning digest
echo "2️⃣  Generate morning digest"
curl -s -X POST "$API_BASE/api/notifications/digest/morning" \
    -H "Content-Type: application/json" \
    -d "{
        \"userId\": \"$TEST_USER_ID\"
    }" | jq '.'
echo ""

# Test 3: Generate evening digest
echo "3️⃣  Generate evening digest"
curl -s -X POST "$API_BASE/api/notifications/digest/evening" \
    -H "Content-Type: application/json" \
    -d "{
        \"userId\": \"$TEST_USER_ID\"
    }" | jq '.'
echo ""

# Test 4: Get digest as HTML
echo "4️⃣  Get digest formatted as HTML"
HTML_DIGEST=$(curl -s -X GET "$API_BASE/api/notifications/digest/$TEST_USER_ID/html")
echo "$HTML_DIGEST" | head -50
echo ""
echo "   Checking for HTML tags..."
if echo "$HTML_DIGEST" | grep -q "<div\|<h2\|<strong"; then
    echo "   ✅ HTML tags found"
else
    echo "   ❌ No HTML tags found"
fi

echo ""
echo "   Checking for XSS prevention (HTML escaping)..."
if echo "$HTML_DIGEST" | grep -q "<script>"; then
    echo "   ❌ WARNING: Unescaped script tags found!"
else
    echo "   ✅ No unescaped script tags (XSS safe)"
fi
echo ""

# Test 5: Get digest as plain text
echo "5️⃣  Get digest formatted as plain text"
TEXT_DIGEST=$(curl -s -X GET "$API_BASE/api/notifications/digest/$TEST_USER_ID/text")
echo "$TEXT_DIGEST" | head -30
echo ""

# Test 6: Generate digest with specific date range
echo "6️⃣  Generate digest for specific date range"
START_DATE=$(date -u -d "-2 days" +"%Y-%m-%dT00:00:00.000Z")
END_DATE=$(date -u +"%Y-%m-%dT23:59:59.000Z")

curl -s -X POST "$API_BASE/api/notifications/digest/custom" \
    -H "Content-Type: application/json" \
    -d "{
        \"userId\": \"$TEST_USER_ID\",
        \"startDate\": \"$START_DATE\",
        \"endDate\": \"$END_DATE\"
    }" | jq '.'
echo ""

echo "✅ Digest Service tests complete!"
