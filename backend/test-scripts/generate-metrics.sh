#!/bin/bash

# Generate Metrics Test Script
# This script creates dumps and performs searches to generate metrics
# You can then check the database directly to verify metrics were created

echo "🚀 Generating Test Metrics Data"
echo "================================"
echo ""

# Configuration
BASE_URL="http://localhost:3000"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Step 1: Check if backend is running...${NC}"
HEALTH_RESPONSE=$(curl -s "$BASE_URL/health" || echo "ERROR")
if [[ "$HEALTH_RESPONSE" == *"ERROR"* ]] || [[ -z "$HEALTH_RESPONSE" ]]; then
    echo -e "${RED}❌ Backend is not running!${NC}"
    echo -e "${YELLOW}Please start it with: cd backend && npm start${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Backend is running${NC}"
echo ""

echo -e "${BLUE}Step 2: Create test dumps (will generate AI metrics)...${NC}"
echo ""

# Create multiple test dumps with different content
DUMPS=(
    "Meeting with Sarah tomorrow at 3pm to discuss Q4 metrics"
    "Buy groceries: milk, eggs, bread, and coffee"
    "Call dentist to reschedule appointment for next week"
    "Important: Submit expense report by Friday"
    "Team lunch at Italian restaurant on Thursday 12:30pm"
    "Review PR #245 and provide feedback on the new analytics feature"
    "Book flight to San Francisco for conference in March"
    "Reminder: Mom's birthday is next Monday, order flowers"
)

DUMP_COUNT=0
for content in "${DUMPS[@]}"; do
    echo -e "${YELLOW}Creating dump: \"$content\"${NC}"
    RESPONSE=$(curl -s -X POST "$BASE_URL/dumps" \
      -H "Content-Type: application/json" \
      -d "{
        \"raw_content\": \"$content\",
        \"content_type\": \"text\",
        \"source\": \"api\"
      }")
    
    if [[ "$RESPONSE" == *"id"* ]]; then
        DUMP_COUNT=$((DUMP_COUNT + 1))
        echo -e "${GREEN}  ✅ Dump created${NC}"
    else
        echo -e "${RED}  ❌ Failed: $RESPONSE${NC}"
    fi
    sleep 1  # Small delay between creates
done

echo ""
echo -e "${GREEN}Created $DUMP_COUNT dumps${NC}"
echo ""

echo -e "${BLUE}Step 3: Perform searches (will generate search metrics)...${NC}"
echo ""

# Perform various searches
SEARCHES=(
    "meeting"
    "groceries"
    "appointment"
    "expense report"
    "lunch restaurant"
    "review analytics"
    "flight conference"
    "birthday reminder"
    "Sarah Q4 metrics"
    "Friday deadline"
)

SEARCH_COUNT=0
for query in "${SEARCHES[@]}"; do
    echo -e "${YELLOW}Searching: \"$query\"${NC}"
    RESPONSE=$(curl -s -X POST "$BASE_URL/search" \
      -H "Content-Type: application/json" \
      -d "{
        \"query\": \"$query\",
        \"limit\": 10
      }")
    
    if [[ "$RESPONSE" == *"results"* ]] || [[ "$RESPONSE" == *"total"* ]]; then
        SEARCH_COUNT=$((SEARCH_COUNT + 1))
        TOTAL=$(echo "$RESPONSE" | jq -r '.total' 2>/dev/null || echo "?")
        echo -e "${GREEN}  ✅ Search completed - $TOTAL results${NC}"
    else
        echo -e "${RED}  ❌ Search failed: $RESPONSE${NC}"
    fi
    sleep 0.5  # Small delay between searches
done

echo ""
echo -e "${GREEN}Performed $SEARCH_COUNT searches${NC}"
echo ""

echo -e "${YELLOW}⏳ Waiting 3 seconds for async metrics to be saved...${NC}"
sleep 3
echo ""

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}✅ Metrics Generation Complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo -e "${BLUE}Expected database tables with data:${NC}"
echo "  • search_metrics - Should have ~$SEARCH_COUNT records"
echo "  • ai_metrics - Should have ~$DUMP_COUNT records (from AI processing)"
echo "  • feature_usage - Should have records for dump creation"
echo ""
echo -e "${YELLOW}You can now check the database directly:${NC}"
echo "  SELECT COUNT(*) FROM search_metrics;"
echo "  SELECT COUNT(*) FROM ai_metrics;"
echo "  SELECT COUNT(*) FROM feature_usage;"
echo ""
echo "  SELECT * FROM search_metrics ORDER BY timestamp DESC LIMIT 5;"
echo "  SELECT * FROM ai_metrics ORDER BY timestamp DESC LIMIT 5;"
echo ""
