# Phase 7 Testing - Quick Start Guide

## 🎯 Overview

Complete manual testing setup for Phase 7 features with automated test scripts and comprehensive curl examples.

## 📋 What We Have

### Documentation
- **PHASE7_MANUAL_TESTING_PLAN.md** - Detailed test scenarios with curl commands for all 11 services
- **This file** - Quick start guide to get testing immediately

### Test Scripts (in `test-scripts/`)
1. **setup-test-environment.sh** - Initial environment setup
2. **create-phase7-test-data.sh** - Creates 26 test dumps with various scenarios
3. **test-reminders.sh** - Tests all reminder operations (create, update, snooze, dismiss, delete)
4. **test-digest.sh** - Tests digest generation (daily, morning, evening, HTML, text)
5. **test-package-tracking.sh** - Tests multi-carrier package tracking (UPS, FedEx, USPS)
6. **test-search-pagination.sh** - Tests search with /more pagination and fuzzy matching
7. **run-all-tests.sh** - Master script that runs all tests and generates report

## 🚀 Quick Start (Step-by-Step)

### Step 1: Start Your Local Server
```bash
cd /home/baiocte/personal/dumpster/backend
npm run start:dev
```

**Wait for**: "Application is running on: http://localhost:3000"

### Step 2: Expose via ngrok (Optional - for bot testing)
Open a **new terminal**:
```bash
ngrok http 3000
```

**Save the ngrok URL**: `https://xxxx-xx-xx-xx-xx.ngrok.io`

### Step 3: Setup Test Environment
```bash
cd /home/baiocte/personal/dumpster/backend/test-scripts

# If using ngrok, set API_BASE first:
export API_BASE="https://your-ngrok-url.ngrok.io"

# Run setup
./setup-test-environment.sh
```

**This will**:
- Check server health
- Create `.env.test` file with environment variables
- Setup test results directory

### Step 4: Create Test Data
```bash
# Make sure you're in test-scripts directory
./create-phase7-test-data.sh
```

**This creates 26 test dumps including**:
- Meeting notes with action items
- Package tracking numbers (UPS, FedEx, USPS)
- Bills and payment reminders
- Health appointments
- Work deadlines
- Intentional typos for fuzzy search testing
- Multilingual content (Portuguese, French, Spanish)

**Expected output**: "Total dumps created: 26" with sample IDs

### Step 5: Run Individual Tests

```bash
# Test reminders (create, update, snooze, dismiss)
./test-reminders.sh

# Test digest generation
./test-digest.sh

# Test package tracking
./test-package-tracking.sh

# Test search with pagination
./test-search-pagination.sh
```

Each script will:
- Show progress with ✅/❌ indicators
- Output JSON responses
- Test all major features of that service

### Step 6: Run Complete Test Suite
```bash
./run-all-tests.sh
```

**This will**:
- Run all 4 test scripts sequentially
- Save logs to `test-results/run_TIMESTAMP/`
- Generate summary report
- Show pass/fail counts

**Results location**: `backend/test-results/run_YYYYMMDD_HHMMSS/`

## 📊 Understanding Test Results

### Success Indicators
- ✅ Green checkmarks = Test passed
- HTTP 200-299 = Success responses
- JSON with `"success": true` or `"data": {...}`

### Failure Indicators
- ❌ Red X marks = Test failed
- HTTP 400-599 = Error responses
- Error messages in JSON

### Log Files
Each test creates a log file:
```
test-results/run_20251110_130000/
├── 01_reminder_service.log
├── 02_digest_service.log
├── 03_package_tracking.log
├── 04_search_pagination.log
└── summary.txt
```

## 🔧 Manual Testing with curl

If you prefer manual testing, load the environment first:

```bash
source .env.test

# Then use curl commands from PHASE7_MANUAL_TESTING_PLAN.md
# Example:
curl -X GET "$API_BASE/api/reminders?userId=$TEST_USER_ID"
```

## 📝 Test Checklist

Use this for manual verification:

### Reminder Service
- [ ] Create one-time reminder
- [ ] Create recurring reminder
- [ ] List all reminders
- [ ] Get upcoming reminders
- [ ] Update reminder
- [ ] Snooze reminder (15 min)
- [ ] Dismiss reminder
- [ ] Delete reminder

### Digest Service
- [ ] Generate daily digest
- [ ] Generate morning digest
- [ ] Generate evening digest
- [ ] Format as HTML (check XSS prevention)
- [ ] Format as plain text

### Package Tracking
- [ ] Track UPS package
- [ ] Track FedEx package
- [ ] Track USPS package
- [ ] Auto-detect carrier
- [ ] Update package status
- [ ] Extract tracking numbers from text

### Search & Pagination
- [ ] Basic search
- [ ] Telegram formatted results
- [ ] WhatsApp formatted results
- [ ] Fuzzy search (typo tolerance)
- [ ] /more command (page 2)
- [ ] /more command (page 3+)
- [ ] Session expiration

## 🐛 Troubleshooting

### Server Not Running
```bash
# Error: "Server is not responding"
# Solution: Start server first
cd /home/baiocte/personal/dumpster/backend
npm run start:dev
```

### Connection Refused
```bash
# Error: "curl: (7) Failed to connect"
# Solution: Check if server is running on port 3000
lsof -i :3000
```

### Test Data Not Created
```bash
# Error: Dumps creation failed
# Solution: Check user exists in database
# Or: Check dump creation endpoint is working
curl -X POST "$API_BASE/api/dumps" -H "Content-Type: application/json" -d '{"userId":"'$TEST_USER_ID'","content":"test","contentType":"text"}'
```

### ngrok Required
For testing bot commands (/more, /search via Telegram/WhatsApp), you need ngrok because bots need public URLs.

Local testing works for all API endpoints.

## 📖 Next Steps

1. **Review Results**: Check `test-results/` for detailed logs
2. **Fix Issues**: Address any failed tests
3. **Bot Testing**: Use ngrok URL to test with actual Telegram/WhatsApp bots
4. **Document Findings**: Update TESTING_SESSION_SUMMARY.md with results
5. **Integration Tests**: After manual tests pass, run integration test suite

## 🎓 Learning Resources

- **Full Test Plan**: See PHASE7_MANUAL_TESTING_PLAN.md for all curl commands
- **Test Scripts**: Read the .sh files to understand test flow
- **API Docs**: Check OpenAPI spec at `specs/001-universal-life-inbox/contracts/openapi.yaml`

## ✅ Expected Final State

After successful testing:
- ✅ 26 test dumps created
- ✅ All 4 test scripts passing
- ✅ Reminder service fully functional
- ✅ Digest service generating reports
- ✅ Package tracking working for all carriers
- ✅ Search pagination with /more command
- ✅ Test results logged with timestamps

## 🤝 Support

If you encounter issues:
1. Check server logs: `npm run start:dev` output
2. Review test logs in `test-results/`
3. Verify database connection
4. Check environment variables in `.env.test`

---

**Ready to start?** Run Step 1 above! 🚀
