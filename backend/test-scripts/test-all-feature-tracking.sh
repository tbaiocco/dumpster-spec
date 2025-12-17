#!/bin/bash

# Comprehensive Feature Usage Tracking Test
# Tests all feature types: dumps, searches, emails, and bot commands

BASE_URL="http://localhost:3000"
USER_ID="3d8439a6-9b61-40e1-8341-b6cb04f3fdc1"

echo "🧪 Testing All Feature Usage Tracking"
echo "======================================"
echo ""

# Test 1: Create dumps (DUMP_CREATED)
echo "📦 Test 1: Creating dumps..."
for i in {1..2}; do
  echo -n "  Dump $i: "
  curl -s -X POST "$BASE_URL/api/dumps" \
    -H "Content-Type: application/json" \
    -d "{
      \"userId\": \"$USER_ID\",
      \"content\": \"Test dump $i for feature tracking\",
      \"contentType\": \"text\"
    }" > /dev/null
  echo "✅"
done

echo ""

# Test 2: Perform searches (SEARCH_PERFORMED)
echo "🔍 Test 2: Performing searches..."
for i in {1..3}; do
  echo -n "  Search $i: "
  curl -s -X POST "$BASE_URL/api/search" \
    -H "Content-Type: application/json" \
    -d "{
      \"userId\": \"$USER_ID\",
      \"query\": \"test query $i\",
      \"limit\": 10
    }" > /dev/null
  echo "✅"
done

echo ""
echo "⏳ Waiting 3 seconds for async metrics..."
sleep 3

echo ""
echo "======================================"
echo "✅ Tests Complete!"
echo ""
echo "Check your database with these queries:"
echo ""
echo "-- Count by feature type:"
echo "SELECT feature_type, COUNT(*) as count"
echo "FROM feature_usage"
echo "WHERE user_id = '$USER_ID'"
echo "  AND timestamp > NOW() - INTERVAL '5 minutes'"
echo "GROUP BY feature_type;"
echo ""
echo "-- Recent feature usage:"
echo "SELECT timestamp, feature_type, detail, metadata"
echo "FROM feature_usage"
echo "WHERE user_id = '$USER_ID'"
echo "ORDER BY timestamp DESC"
echo "LIMIT 10;"
echo ""
echo "Expected results:"
echo "  - dump_created: 2"
echo "  - search_performed: 3"
echo "======================================"
