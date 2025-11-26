#!/bin/bash

# Quick test for Search and /more command functionality
# Tests: Search with pagination, session management

set -e

# Load environment
source ../.env.test 2>/dev/null || {
    echo "❌ Run setup-test-environment.sh first"
    exit 1
}

echo "🔍 Testing Search & Pagination"
echo "=============================="
echo ""

# Test 1: Initial search
echo "1️⃣  Search for 'meeting' (first 5 results)"
SEARCH_RESPONSE=$(curl -s -X POST "$API_BASE/api/search" \
    -H "Content-Type: application/json" \
    -d "{
        \"userId\": \"$TEST_USER_ID\",
        \"query\": \"meeting\",
        \"limit\": 5
    }")

echo "$SEARCH_RESPONSE" | jq '.'
RESULT_COUNT=$(echo "$SEARCH_RESPONSE" | jq '.data.results | length // 0' 2>/dev/null)
echo "Found $RESULT_COUNT results in first page"
echo ""

# Test 2: Telegram formatted search
echo "2️⃣  Search with Telegram formatting"
curl -s -X POST "$API_BASE/api/search" \
    -H "Content-Type: application/json" \
    -d "{
        \"userId\": \"$TEST_USER_ID\",
        \"query\": \"bill\",
        \"platform\": \"telegram\"
    }" | jq '.'
echo ""

# Test 3: WhatsApp formatted search  
echo "3️⃣  Search with WhatsApp formatting"
curl -s -X POST "$API_BASE/api/search" \
    -H "Content-Type: application/json" \
    -d "{
        \"userId\": \"$TEST_USER_ID\",
        \"query\": \"bill\",
        \"platform\": \"whatsapp\"
    }" | jq '.'
echo ""

# Test 4: Fuzzy search with typos
echo "4️⃣  Fuzzy search (with typos: 'meating')"
curl -s -X POST "$API_BASE/api/search/fuzzy" \
    -H "Content-Type: application/json" \
    -d "{
        \"userId\": \"$TEST_USER_ID\",
        \"query\": \"meating\"
    }" | jq '.'
echo ""

# Test 5: /more command - get next results
echo "5️⃣  Test /more command pagination"
echo "   a) Initial search"
MORE_SEARCH=$(curl -s -X POST "$API_BASE/api/bots/telegram/search" \
    -H "Content-Type: application/json" \
    -d "{
        \"user\": {
            \"id\": \"$TEST_USER_ID\",
            \"telegram_chat_id\": \"$TEST_CHAT_ID\"
        },
        \"platform\": \"telegram\",
        \"query\": \"test\"
    }")

echo "$MORE_SEARCH"
echo ""

echo "   b) Get more results (page 2)"
curl -s -X POST "$API_BASE/api/bots/telegram/more" \
    -H "Content-Type: application/json" \
    -d "{
        \"user\": {
            \"id\": \"$TEST_USER_ID\",
            \"telegram_chat_id\": \"$TEST_CHAT_ID\"
        },
        \"platform\": \"telegram\"
    }"
echo ""
echo ""

echo "   c) Get more results (page 3)"
curl -s -X POST "$API_BASE/api/bots/telegram/more" \
    -H "Content-Type: application/json" \
    -d "{
        \"user\": {
            \"id\": \"$TEST_USER_ID\",
            \"telegram_chat_id\": \"$TEST_CHAT_ID\"
        },
        \"platform\": \"telegram\"
    }"
echo ""
echo ""

# Test 6: Semantic search
echo "6️⃣  Semantic search (concept-based)"
curl -s -X POST "$API_BASE/api/search/semantic" \
    -H "Content-Type: application/json" \
    -d "{
        \"userId\": \"$TEST_USER_ID\",
        \"query\": \"upcoming deadlines and tasks\"
    }" | jq '.'
echo ""

echo "✅ Search & Pagination tests complete!"
