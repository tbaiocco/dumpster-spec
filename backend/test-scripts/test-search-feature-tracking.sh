#!/bin/bash

# Test Search Feature Tracking
# Performs a few searches and checks if feature_usage is being tracked

BASE_URL="http://localhost:3000"
USER_ID="3d8439a6-9b61-40e1-8341-b6cb04f3fdc1"

echo "🔍 Testing Search Feature Tracking"
echo "======================================"
echo ""

# Perform 3 test searches
echo "Performing test searches..."

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
echo "⏳ Waiting 3 seconds for async metrics to be saved..."
sleep 3

echo ""
echo "======================================"
echo "✅ Test Complete!"
echo ""
echo "Now check your database for feature_usage records:"
echo ""
echo "SELECT feature_type, COUNT(*) as count"
echo "FROM feature_usage"
echo "WHERE user_id = '$USER_ID'"
echo "GROUP BY feature_type;"
echo ""
echo "You should see both 'dump_created' and 'search_performed'!"
echo "======================================"
