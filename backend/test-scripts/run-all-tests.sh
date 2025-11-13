#!/bin/bash

# Master test script - Runs all Phase 7 tests in sequence
# This provides comprehensive coverage of all new features

set -e

echo "🚀 Phase 7 Complete Test Suite"
echo "==============================="
echo ""

# Check if environment is setup
if [ ! -f ../.env.test ]; then
    echo "❌ Environment not setup. Running setup script..."
    ./setup-test-environment.sh
    echo ""
fi

# Load environment
source ../.env.test

echo "Configuration:"
echo "  API Base: $API_BASE"
echo "  User ID: $TEST_USER_ID"
echo ""

# Create test results directory with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RESULTS_DIR="../test-results/run_$TIMESTAMP"
mkdir -p "$RESULTS_DIR"

echo "Results will be saved to: $RESULTS_DIR"
echo ""

# Function to run test and save output
run_test() {
    local test_name="$1"
    local test_script="$2"
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Running: $test_name"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    if [ -f "$test_script" ]; then
        bash "$test_script" 2>&1 | tee "$RESULTS_DIR/${test_name}.log"
        
        if [ ${PIPESTATUS[0]} -eq 0 ]; then
            echo "✅ $test_name PASSED" >> "$RESULTS_DIR/summary.txt"
        else
            echo "❌ $test_name FAILED" >> "$RESULTS_DIR/summary.txt"
        fi
    else
        echo "⚠️  Test script not found: $test_script"
        echo "⚠️  $test_name SKIPPED" >> "$RESULTS_DIR/summary.txt"
    fi
    
    echo ""
    echo ""
}

# Run all tests in sequence
echo "Starting test execution..."
echo ""

run_test "01_reminder_service" "./test-reminders.sh"
run_test "02_digest_service" "./test-digest.sh"
run_test "03_package_tracking" "./test-package-tracking.sh"
run_test "04_search_pagination" "./test-search-pagination.sh"

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Test Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -f "$RESULTS_DIR/summary.txt" ]; then
    cat "$RESULTS_DIR/summary.txt"
else
    echo "No summary available"
fi

echo ""
echo "Detailed logs saved to: $RESULTS_DIR"
echo ""

# Count results
PASSED=$(grep -c "PASSED" "$RESULTS_DIR/summary.txt" 2>/dev/null || echo "0")
FAILED=$(grep -c "FAILED" "$RESULTS_DIR/summary.txt" 2>/dev/null || echo "0")
SKIPPED=$(grep -c "SKIPPED" "$RESULTS_DIR/summary.txt" 2>/dev/null || echo "0")

echo "Results: $PASSED passed, $FAILED failed, $SKIPPED skipped"
echo ""

if [ "$FAILED" -eq 0 ]; then
    echo "✅ All tests passed!"
    exit 0
else
    echo "❌ Some tests failed. Check logs in $RESULTS_DIR"
    exit 1
fi
