#!/bin/bash

# Setup test environment for Phase 7 manual testing
# Creates test user, test dumps, and exports environment variables

set -e

echo "🚀 Setting up Phase 7 Test Environment"
echo "========================================"
echo ""

# Configuration
export API_BASE="${API_BASE:-http://localhost:3000}"
export TEST_USER_ID="e1fd947b-8d35-45dd-b9aa-a6458457521b"

echo "📋 Configuration:"
echo "   API Base: $API_BASE"
echo "   Test User ID: $TEST_USER_ID"
echo ""

# Create results directory
mkdir -p ../test-results
echo "✅ Created test-results directory"

# Export environment variables to file
cat > ../.env.test << EOF
# Test Environment Variables
export API_BASE="$API_BASE"
export TEST_USER_ID="$TEST_USER_ID"
export TEST_CHAT_ID="test-chat-123"
export TEST_TELEGRAM_ID="telegram-user-123"
export TEST_WHATSAPP_ID="whatsapp-user-123"
EOF

echo "✅ Created .env.test file"
echo ""

# Function to check server health
check_server() {
    echo "🔍 Checking server health..."
    HEALTH_CHECK=$(curl -s "$API_BASE/health" || echo "FAILED")
    
    if echo "$HEALTH_CHECK" | grep -q "ok"; then
        echo "✅ Server is running"
        return 0
    else
        echo "❌ Server is not responding"
        echo "   Please start the server with: npm run start:dev"
        return 1
    fi
}

# Check if server is running
if check_server; then
    echo ""
    echo "🎯 Test environment ready!"
    echo ""
    echo "Next steps:"
    echo "1. Source the environment variables:"
    echo "   source .env.test"
    echo ""
    echo "2. Run test data creation:"
    echo "   ./test-scripts/create-phase7-test-data.sh"
    echo ""
    echo "3. Start testing with curl commands from PHASE7_MANUAL_TESTING_PLAN.md"
    echo ""
else
    echo ""
    echo "⚠️  Server not running. Start it first:"
    echo "   npm run start:dev"
    echo ""
    echo "Then run this script again."
    exit 1
fi
