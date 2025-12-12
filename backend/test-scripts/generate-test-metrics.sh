#!/bin/bash

# Generate Test Metrics Data
# This script creates dumps and performs searches to populate the metrics tables
# User ID: 3d8439a6-9b61-40e1-8341-b6cb04f3fdc1

BASE_URL="http://localhost:3000"
USER_ID="3d8439a6-9b61-40e1-8341-b6cb04f3fdc1"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🚀 Generating Test Metrics Data${NC}"
echo "=============================================="
echo ""

# Step 1: Create some test dumps (will trigger AI metrics)
echo -e "${BLUE}Step 1: Creating test dumps to generate AI metrics...${NC}"

DUMPS=(
  "Meeting with team tomorrow at 3pm to discuss Q1 metrics and performance review"
  "Remember to buy groceries: milk, eggs, bread, and coffee"
  "Flight to New York on Friday at 9am, confirmation number ABC123"
  "Call dentist to schedule annual checkup appointment"
  "Project deadline next Monday - need to finish analytics dashboard implementation"
)

for i in "${!DUMPS[@]}"; do
  CONTENT="${DUMPS[$i]}"
  echo -n "  Creating dump $((i+1))/${#DUMPS[@]}: "
  
  RESPONSE=$(curl -s -X POST "$BASE_URL/api/dumps" \
    -H "Content-Type: application/json" \
    -d "{
      \"userId\": \"$USER_ID\",
      \"content\": \"$CONTENT\",
      \"contentType\": \"text\",
      \"metadata\": {
        \"source\": \"api\"
      }
    }")
  
  if [[ "$RESPONSE" == *"id"* ]] || [[ "$RESPONSE" == *"dump"* ]]; then
    echo -e "${GREEN}✅${NC}"
  else
    echo -e "${YELLOW}⚠️  $RESPONSE${NC}"
  fi
  sleep 1
done

echo ""
echo -e "${BLUE}Step 2: Performing searches to generate search metrics...${NC}"

QUERIES=(
  "meeting tomorrow"
  "groceries shopping list"
  "flight schedule"
  "dentist appointment"
  "project deadline analytics"
  "team review"
  "New York travel"
  "Q1 performance metrics"
)

for i in "${!QUERIES[@]}"; do
  QUERY="${QUERIES[$i]}"
  echo -n "  Search $((i+1))/${#QUERIES[@]}: \"$QUERY\" - "
  
  RESPONSE=$(curl -s -X POST "$BASE_URL/api/search" \
    -H "Content-Type: application/json" \
    -d "{
      \"userId\": \"$USER_ID\",
      \"query\": \"$QUERY\",
      \"limit\": 10
    }")
  
  if [[ "$RESPONSE" == *"results"* ]] || [[ "$RESPONSE" == *"total"* ]]; then
    TOTAL=$(echo "$RESPONSE" | jq -r '.total // 0' 2>/dev/null || echo "?")
    echo -e "${GREEN}✅ Found $TOTAL results${NC}"
  else
    echo -e "${YELLOW}⚠️${NC}"
  fi
  sleep 0.5
done

echo ""
echo -e "${YELLOW}⏳ Waiting 5 seconds for async metrics to be saved...${NC}"
sleep 5
echo ""

echo -e "${GREEN}=============================================="
echo "✅ Test Data Generation Complete!"
echo ""
echo "Now you can check the database:"
echo "  - search_metrics table for search operations"
echo "  - ai_metrics table for AI processing"
echo "  - feature_usage table for feature tracking"
echo ""
echo "Example SQL queries:"
echo "  SELECT COUNT(*) FROM search_metrics WHERE user_id = '$USER_ID';"
echo "  SELECT COUNT(*) FROM ai_metrics WHERE user_id = '$USER_ID';"
echo "  SELECT * FROM search_metrics ORDER BY timestamp DESC LIMIT 10;"
echo "  SELECT * FROM ai_metrics ORDER BY timestamp DESC LIMIT 10;"
echo "==============================================${NC}"
