#!/bin/bash

# Create comprehensive test data for Phase 7 features
# This script creates test dumps that will be used for reminder creation,
# proactive analysis, package tracking, and search testing

set -e

# Load environment variables
if [ -f ../.env.test ]; then
    source ../.env.test
else
    echo "❌ .env.test not found. Run setup-test-environment.sh first"
    exit 1
fi

echo "📝 Creating Phase 7 Test Data"
echo "=============================="
echo ""
echo "API Base: $API_BASE"
echo "User ID: $TEST_USER_ID"
echo ""

# Function to create a dump
create_dump() {
    local content="$1"
    local category="$2"
    local description="$3"
    
    response=$(curl -s -X POST "$API_BASE/api/dumps" \
        -H "Content-Type: application/json" \
        -d "{
            \"userId\": \"$TEST_USER_ID\",
            \"content\": \"$content\",
            \"contentType\": \"text\",
            \"category\": \"$category\",
            \"metadata\": {
                \"source\": \"manual_test\",
                \"description\": \"$description\"
            }
        }")
    
    if echo "$response" | grep -q '"id"'; then
        dump_id=$(echo "$response" | grep -o '"id":"[^"]*"' | cut -d'"' -f4 | head -1)
        echo "✅ Created: ${description:0:50}... (ID: ${dump_id:0:8}...)"
        echo "$dump_id"
    else
        echo "❌ Failed: ${description:0:50}..."
        echo "   Response: $response"
        echo ""
    fi
}

# Counter for tracking
total_created=0

echo "1️⃣  Creating Work-related dumps..."
echo ""

# Meeting notes (for reminder testing)
dump1=$(create_dump \
    "Team meeting notes: Discussed Q4 goals, need to prepare presentation by Friday. Action items: review budget, schedule follow-up with Sarah, update project timeline." \
    "Work" \
    "Meeting notes with action items")
((total_created++))

dump2=$(create_dump \
    "Client call - they want proposal by Nov 20th. Need to coordinate with design team and get pricing from vendors. High priority!" \
    "Work" \
    "Client proposal deadline")
((total_created++))

dump3=$(create_dump \
    "Performance review next week. Should prepare: achievement list, goals for next quarter, training needs discussion." \
    "Work" \
    "Performance review prep")
((total_created++))

echo ""
echo "2️⃣  Creating Personal task dumps..."
echo ""

dump4=$(create_dump \
    "Dentist appointment scheduled for Nov 15 at 2pm. Location: Downtown Dental Care, 123 Main St. Remember to bring insurance card." \
    "Personal" \
    "Dentist appointment")
((total_created++))

dump5=$(create_dump \
    "Car needs oil change - it's been 5000 miles. Also check tire pressure and brake pads. Schedule for this weekend." \
    "Personal" \
    "Car maintenance")
((total_created++))

dump6=$(create_dump \
    "Mom's birthday Dec 5th - need to order gift and send card. She mentioned wanting new gardening tools." \
    "Personal" \
    "Birthday reminder")
((total_created++))

echo ""
echo "3️⃣  Creating Package tracking dumps..."
echo ""

dump7=$(create_dump \
    "Amazon order shipped! Tracking: 1Z999AA10123456784 (UPS). New laptop arrives Friday. Watch for delivery." \
    "Shopping" \
    "UPS package tracking")
((total_created++))

dump8=$(create_dump \
    "FedEx tracking 123456789012 - office supplies should arrive tomorrow between 10am-2pm. Need signature!" \
    "Work" \
    "FedEx package tracking")
((total_created++))

dump9=$(create_dump \
    "USPS tracking 9400111899562537503129 - library books being returned. Should arrive in 3-5 days." \
    "Personal" \
    "USPS package tracking")
((total_created++))

echo ""
echo "4️⃣  Creating Bill/Finance dumps..."
echo ""

dump10=$(create_dump \
    "Electricity bill received: \$150.00 due by Nov 25th. Higher than usual - AC usage was high this month." \
    "Finance" \
    "Electricity bill")
((total_created++))

dump11=$(create_dump \
    "Credit card statement: \$2,450 due Dec 1st. Big purchases: furniture (\$800), groceries (\$400), gas (\$200)." \
    "Finance" \
    "Credit card payment")
((total_created++))

dump12=$(create_dump \
    "Rent due Nov 30th - \$1,500. Set up automatic payment or pay through portal by 5pm." \
    "Finance" \
    "Rent payment")
((total_created++))

echo ""
echo "5️⃣  Creating Health dumps..."
echo ""

dump13=$(create_dump \
    "Gym membership renewal coming up - \$50/month. Decide if continuing or trying different gym. Trial pass available at new place." \
    "Health" \
    "Gym membership decision")
((total_created++))

dump14=$(create_dump \
    "Doctor recommended: daily vitamins, 30min exercise, 8 hours sleep. Follow-up appointment in 3 months." \
    "Health" \
    "Health recommendations")
((total_created++))

dump15=$(create_dump \
    "Prescription refill needed by Nov 20th. Call pharmacy or use app. 2 refills remaining." \
    "Health" \
    "Prescription refill")
((total_created++))

echo ""
echo "6️⃣  Creating Project/Learning dumps..."
echo ""

dump16=$(create_dump \
    "Learning React course - completed 60%. Next: hooks deep dive, context API, testing. Goal: finish by month end." \
    "Learning" \
    "Online course progress")
((total_created++))

dump17=$(create_dump \
    "Side project idea: Personal finance tracker. Stack: React + Node + PostgreSQL. Start with MVP - basic income/expense tracking." \
    "Projects" \
    "Side project planning")
((total_created++))

dump18=$(create_dump \
    "Book club meeting Nov 28th - finish 'Project Hail Mary' by then. Currently on chapter 15 of 40." \
    "Personal" \
    "Book club deadline")
((total_created++))

echo ""
echo "7️⃣  Creating Event dumps..."
echo ""

dump19=$(create_dump \
    "Team dinner Friday 7pm at Italian restaurant downtown. RSVP by Wednesday. Bring\gift for retiring colleague." \
    "Social" \
    "Team dinner event")
((total_created++))

dump20=$(create_dump \
    "Conference registration closes Nov 18th - \$299 early bird. Topics: AI, Cloud, DevOps. Dec 10-12 in SF." \
    "Work" \
    "Conference registration")
((total_created++))

echo ""
echo "8️⃣  Creating dumps for fuzzy search testing..."
echo ""

# Intentional typos for fuzzy matching
dump21=$(create_dump \
    "Need to check the elektrisity bil - seems high this month. Mabe we left the AC on?" \
    "Finance" \
    "Electricity bill with typos")
((total_created++))

dump22=$(create_dump \
    "Meating with cllient tomorow at 10am. Dont forget the presentashun slides!" \
    "Work" \
    "Meeting with typos")
((total_created++))

dump23=$(create_dump \
    "Pakage delivry expected today. Traking number: 1Z999AA10123456784. Chek doorstep." \
    "Shopping" \
    "Package delivery with typos")
((total_created++))

echo ""
echo "9️⃣  Creating multilingual dumps..."
echo ""

dump24=$(create_dump \
    "Reunião de equipe amanhã às 14h. Preparar relatório mensal e apresentação de resultados." \
    "Work" \
    "Portuguese meeting note")
((total_created++))

dump25=$(create_dump \
    "Réunion client mercredi. Préparer proposition et budget. Date limite: vendredi." \
    "Work" \
    "French meeting note")
((total_created++))

dump26=$(create_dump \
    "Reunión con el cliente el jueves. Traer muestras y presupuesto actualizado." \
    "Work" \
    "Spanish meeting note")
((total_created++))

echo ""
echo "🎯 Summary"
echo "=========="
echo "Total dumps created: $total_created"
echo ""
echo "Test data ready for:"
echo "  ✓ Reminder creation and management"
echo "  ✓ Proactive AI analysis"
echo "  ✓ Package tracking (UPS, FedEx, USPS)"
echo "  ✓ Search with fuzzy matching"
echo "  ✓ Multilingual support"
echo "  ✓ Digest generation"
echo "  ✓ Calendar event extraction"
echo ""
echo "Sample Dump IDs for testing:"
echo "  Work meeting: ${dump1:0:36}"
echo "  Client deadline: ${dump2:0:36}"
echo "  UPS package: ${dump7:0:36}"
echo "  Electricity bill: ${dump10:0:36}"
echo ""
echo "Next: Follow PHASE7_MANUAL_TESTING_PLAN.md to test all features"
