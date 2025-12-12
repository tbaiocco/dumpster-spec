#!/bin/bash

# Test Metrics System via HTTP API
# Make sure the backend is running first!

echo "🚀 Testing Production Metrics System via API"
echo "=============================================="
echo ""

# Configuration
BASE_URL="http://localhost:3000"
API_KEY="your-api-key-here"  # Replace with actual API key if needed

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Step 1: Check if backend is running...${NC}"
HEALTH_RESPONSE=$(curl -s "$BASE_URL/health" || echo "ERROR")
if [[ "$HEALTH_RESPONSE" == *"ERROR"* ]] || [[ -z "$HEALTH_RESPONSE" ]]; then
    echo -e "${RED}❌ Backend is not running! Please start it with: npm run start:dev${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Backend is running${NC}"
echo ""

echo -e "${BLUE}Step 2: Create a test dump (will trigger AI metrics)...${NC}"
DUMP_RESPONSE=$(curl -s -X POST "$BASE_URL/dumps" \
  -H "Content-Type: application/json" \
  -d '{
    "raw_content": "Meeting with team tomorrow at 3pm to discuss quarterly metrics and performance analytics",
    "content_type": "text",
    "source": "api"
  }')

if [[ "$DUMP_RESPONSE" == *"id"* ]]; then
    echo -e "${GREEN}✅ Dump created successfully${NC}"
    echo "$DUMP_RESPONSE" | jq -r '. | "   Dump ID: \(.dump.id // .id)\n   Category: \(.dump.category.name // .category // "None")\n   AI Confidence: \(.dump.ai_confidence // .ai_confidence // 0)"' 2>/dev/null || echo "   $DUMP_RESPONSE"
else
    echo -e "${YELLOW}⚠️  Dump creation response: $DUMP_RESPONSE${NC}"
fi
echo ""

echo -e "${BLUE}Step 3: Perform a search (will trigger search metrics)...${NC}"
SEARCH_RESPONSE=$(curl -s -X POST "$BASE_URL/search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "meeting metrics analytics",
    "limit": 10
  }')

if [[ "$SEARCH_RESPONSE" == *"results"* ]] || [[ "$SEARCH_RESPONSE" == *"total"* ]]; then
    echo -e "${GREEN}✅ Search completed${NC}"
    echo "$SEARCH_RESPONSE" | jq -r '. | "   Total results: \(.total)\n   Processing time: \(.query.processingTime)ms\n   Semantic results: \(.metadata.semanticResults)\n   Fuzzy results: \(.metadata.fuzzyResults)"' 2>/dev/null || echo "   Results returned"
else
    echo -e "${YELLOW}⚠️  Search response: $SEARCH_RESPONSE${NC}"
fi
echo ""

echo -e "${YELLOW}⏳ Waiting 3 seconds for async metrics to be saved...${NC}"
sleep 3
echo ""

echo -e "${BLUE}Step 4: Fetch Search Metrics from Admin API...${NC}"
SEARCH_METRICS=$(curl -s "$BASE_URL/admin/analytics/search")
if [[ "$SEARCH_METRICS" == *"totalSearches"* ]]; then
    echo -e "${GREEN}✅ Search Metrics Retrieved${NC}"
    echo "$SEARCH_METRICS" | jq '.' 2>/dev/null || echo "$SEARCH_METRICS"
else
    echo -e "${YELLOW}⚠️  Response: $SEARCH_METRICS${NC}"
fi
echo ""

echo -e "${BLUE}Step 5: Fetch AI Metrics from Admin API...${NC}"
AI_METRICS=$(curl -s "$BASE_URL/admin/analytics/ai")
if [[ "$AI_METRICS" == *"totalProcessed"* ]]; then
    echo -e "${GREEN}✅ AI Metrics Retrieved${NC}"
    echo "$AI_METRICS" | jq '.' 2>/dev/null || echo "$AI_METRICS"
else
    echo -e "${YELLOW}⚠️  Response: $AI_METRICS${NC}"
fi
echo ""

echo -e "${BLUE}Step 6: Fetch Feature Usage Stats from Admin API...${NC}"
FEATURE_STATS=$(curl -s "$BASE_URL/admin/analytics/features")
if [[ "$FEATURE_STATS" == *"totalUsage"* ]] || [[ "$FEATURE_STATS" == *"breakdown"* ]]; then
    echo -e "${GREEN}✅ Feature Stats Retrieved${NC}"
    echo "$FEATURE_STATS" | jq '.' 2>/dev/null || echo "$FEATURE_STATS"
else
    echo -e "${YELLOW}⚠️  Response: $FEATURE_STATS${NC}"
fi
echo ""

echo -e "${BLUE}Step 7: Fetch System Metrics from Admin API...${NC}"
SYSTEM_METRICS=$(curl -s "$BASE_URL/admin/analytics/system")
if [[ "$SYSTEM_METRICS" == *"totalUsers"* ]]; then
    echo -e "${GREEN}✅ System Metrics Retrieved${NC}"
    echo "$SYSTEM_METRICS" | jq '. | {
        totalUsers,
        totalDumps,
        activeUsers,
        averageProcessingTime,
        processingSuccessRate
    }' 2>/dev/null || echo "$SYSTEM_METRICS"
else
    echo -e "${YELLOW}⚠️  Response: $SYSTEM_METRICS${NC}"
fi
echo ""

echo -e "${GREEN}=============================================="
echo "✅ Metrics System Test Complete!"
echo "=============================================="${NC}
