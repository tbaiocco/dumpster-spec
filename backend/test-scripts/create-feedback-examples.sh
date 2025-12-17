#!/bin/bash

# Script to create example feedback entries
API_URL="https://api.theclutter.app"

echo "Creating example feedback entries..."
echo ""

# Feedback 1: Simple bug report (basic fields only)
echo "1. Creating simple bug report..."
curl -X POST "$API_URL/feedback/submit?userId=3d8439a6-9b61-40e1-8341-b6cb04f3fdc1" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "bug_report",
    "title": "Email attachments not processing correctly",
    "description": "When I forward emails with PDF attachments, they are not being analyzed properly and show up as empty dumps.",
    "priority": "high"
  }'
echo -e "\n"

# Feedback 2: Feature request with additional context
echo "2. Creating feature request with additional context..."
curl -X POST "$API_URL/feedback/submit?userId=b7cb9972-251c-4263-8d7d-fe41e6fa1914" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "feature_request",
    "title": "Add bulk delete for dumps",
    "description": "Would be great to have a way to select multiple dumps and delete them at once instead of one by one.",
    "priority": "medium",
    "url": "/dumps",
    "additionalContext": {
      "useCase": "cleaning up old dumps",
      "frequency": "weekly",
      "estimatedTimeSavings": "5-10 minutes per week"
    }
  }'
echo -e "\n"

# Feedback 3: AI error with full reproduction steps
echo "3. Creating AI error with reproduction steps..."
curl -X POST "$API_URL/feedback/submit?userId=96eb40f1-55eb-4418-a30a-ea84977cb445" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "categorization_error",
    "title": "Restaurant receipts categorized as Travel",
    "description": "When I upload restaurant receipts, they are consistently being categorized under Travel instead of Food & Dining.",
    "priority": "medium",
    "url": "/dumps",
    "reproductionSteps": [
      "Upload a restaurant receipt (PDF or image)",
      "Wait for AI processing to complete",
      "Check the category assigned",
      "Notice it shows Travel instead of Food & Dining"
    ],
    "expectedBehavior": "Restaurant receipts should be automatically categorized under Food & Dining category",
    "actualBehavior": "Restaurant receipts are being categorized under Travel category",
    "additionalContext": {
      "affectedRestaurants": ["Chipotle", "Olive Garden", "Local Pizza Place"],
      "fileTypes": ["PDF", "JPEG"],
      "occurrenceRate": "8 out of 10 receipts"
    }
  }'
echo -e "\n"

# Feedback 4: Performance issue with detailed info
echo "4. Creating performance issue with detailed information..."
curl -X POST "$API_URL/feedback/submit?userId=3d8439a6-9b61-40e1-8341-b6cb04f3fdc1" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "performance_issue",
    "title": "Slow loading when viewing dumps with many attachments",
    "description": "Pages take 5-10 seconds to load when a dump has more than 5 attachments. This makes the app feel sluggish.",
    "priority": "high",
    "url": "/dumps/details",
    "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "reproductionSteps": [
      "Navigate to any dump with 6+ attachments",
      "Click to open the dump details page",
      "Observe the loading time",
      "Notice significant delay before content appears"
    ],
    "expectedBehavior": "Page should load in under 2 seconds regardless of number of attachments",
    "actualBehavior": "Page takes 5-10 seconds to load with 6+ attachments, browser shows spinning loader",
    "additionalContext": {
      "networkSpeed": "50 Mbps",
      "browser": "Chrome 120",
      "device": "MacBook Pro M1",
      "averageAttachmentSize": "2-5 MB each",
      "totalDumpsInAccount": 247
    }
  }'
echo -e "\n"

echo "All feedback entries created!"
