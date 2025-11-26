#!/bin/bash

# Quick test for Package Tracking functionality
# Tests: Track packages across UPS, FedEx, USPS

set -e

# Load environment
source ../.env.test 2>/dev/null || {
    echo "❌ Run setup-test-environment.sh first"
    exit 1
}

echo "📦 Testing Package Tracking"
echo "==========================="
echo ""

# Test 1: Track UPS package
echo "1️⃣  Track UPS package"
UPS_RESPONSE=$(curl -s -X POST "$API_BASE/api/tracking/package" \
    -H "Content-Type: application/json" \
    -d "{
        \"userId\": \"$TEST_USER_ID\",
        \"trackingNumber\": \"1Z999AA10123456784\",
        \"carrier\": \"ups\",
        \"description\": \"Amazon order - Test electronics\"
    }")

UPS_ID=$(echo "$UPS_RESPONSE" | jq -r '.data.id // .id // empty' 2>/dev/null)
echo "✅ UPS tracking created: $UPS_ID"
echo "$UPS_RESPONSE" | jq '.'
echo ""

# Test 2: Track FedEx package
echo "2️⃣  Track FedEx package"
FEDEX_RESPONSE=$(curl -s -X POST "$API_BASE/api/tracking/package" \
    -H "Content-Type: application/json" \
    -d "{
        \"userId\": \"$TEST_USER_ID\",
        \"trackingNumber\": \"123456789012\",
        \"carrier\": \"fedex\",
        \"description\": \"Office supplies - Test order\"
    }")

FEDEX_ID=$(echo "$FEDEX_RESPONSE" | jq -r '.data.id // .id // empty' 2>/dev/null)
echo "✅ FedEx tracking created: $FEDEX_ID"
echo "$FEDEX_RESPONSE" | jq '.'
echo ""

# Test 3: Track USPS package
echo "3️⃣  Track USPS package"
USPS_RESPONSE=$(curl -s -X POST "$API_BASE/api/tracking/package" \
    -H "Content-Type: application/json" \
    -d "{
        \"userId\": \"$TEST_USER_ID\",
        \"trackingNumber\": \"9400111899562537503129\",
        \"carrier\": \"usps\",
        \"description\": \"Library books return\"
    }")

USPS_ID=$(echo "$USPS_RESPONSE" | jq -r '.data.id // .id // empty' 2>/dev/null)
echo "✅ USPS tracking created: $USPS_ID"
echo "$USPS_RESPONSE" | jq '.'
echo ""

# Test 4: Get all packages
echo "4️⃣  Get all tracked packages"
curl -s -X GET "$API_BASE/api/tracking/packages?userId=$TEST_USER_ID" | jq '.'
echo ""

# Test 5: Auto-detect carrier
echo "5️⃣  Auto-detect carrier from tracking number"
curl -s -X POST "$API_BASE/api/tracking/package/detect" \
    -H "Content-Type: application/json" \
    -d "{
        \"trackingNumber\": \"1Z999AA10123456784\"
    }" | jq '.'
echo ""

# Test 6: Update package status
if [ -n "$UPS_ID" ]; then
    echo "6️⃣  Update package status"
    curl -s -X PUT "$API_BASE/api/tracking/package/$UPS_ID" \
        -H "Content-Type: application/json" \
        -d "{
            \"status\": \"in_transit\",
            \"lastUpdate\": \"Package is on the way - arriving tomorrow\"
        }" | jq '.'
    echo ""
fi

# Test 7: Get active packages only
echo "7️⃣  Get active packages (not delivered)"
curl -s -X GET "$API_BASE/api/tracking/packages/active?userId=$TEST_USER_ID" | jq '.'
echo ""

# Test 8: Mark package as delivered
if [ -n "$FEDEX_ID" ]; then
    echo "8️⃣  Mark package as delivered"
    curl -s -X PUT "$API_BASE/api/tracking/package/$FEDEX_ID" \
        -H "Content-Type: application/json" \
        -d "{
            \"status\": \"delivered\",
            \"lastUpdate\": \"Package delivered to front door\"
        }" | jq '.'
    echo ""
fi

# Test 9: Extract tracking numbers from text
echo "9️⃣  Extract tracking numbers from text"
curl -s -X POST "$API_BASE/api/tracking/extract" \
    -H "Content-Type: application/json" \
    -d "{
        \"text\": \"Your package 1Z999AA10123456784 has shipped. FedEx tracking: 123456789012. USPS: 9400111899562537503129\"
    }" | jq '.'
echo ""

echo "✅ Package Tracking tests complete!"
