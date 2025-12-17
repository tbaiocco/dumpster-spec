# 🚀 Production Analytics System - Deployment Checklist

## Pre-Deployment Verification

### 1. Code Review
- [x] All entities created with proper indexes
- [x] MetricsService uses fire-and-forget pattern
- [x] SearchService instrumented with tracking
- [x] DumpService instrumented with AI and feature tracking
- [x] AdminService uses real database queries
- [x] AdminController exposes all analytics endpoints
- [x] All modules properly import MetricsModule

### 2. File Verification

**New Files Created (5):**
- [x] `backend/src/entities/search-metric.entity.ts`
- [x] `backend/src/entities/ai-metric.entity.ts`
- [x] `backend/src/entities/feature-usage.entity.ts`
- [x] `backend/src/modules/metrics/metrics.service.ts`
- [x] `backend/src/modules/metrics/metrics.module.ts`

**Modified Files (9):**
- [x] `backend/src/modules/search/search.service.ts`
- [x] `backend/src/modules/dumps/services/dump.service.ts`
- [x] `backend/src/modules/admin/admin.service.ts`
- [x] `backend/src/modules/admin/admin.controller.ts`
- [x] `backend/src/modules/admin/admin.module.ts`
- [x] `backend/src/modules/search/search.module.ts`
- [x] `backend/src/modules/dumps/dump.module.ts`
- [x] `backend/src/app.module.ts`

**Documentation Files (3):**
- [x] `backend/ANALYTICS_IMPLEMENTATION.md`
- [x] `backend/ANALYTICS_QUICK_REFERENCE.md`
- [x] `backend/migrations/001_create_metrics_tables.sql`

### 3. Compilation Check
```bash
cd backend
npm run build
```
- [ ] No TypeScript errors
- [ ] No module resolution errors
- [ ] Build completes successfully

---

## Database Migration

### Development Environment

```bash
# Option 1: TypeORM Auto-Sync (already enabled in development)
npm run start:dev

# Option 2: Manual Migration
psql -U postgres -d clutter_ai_dev -f migrations/001_create_metrics_tables.sql
```

**Verify Tables Created:**
```sql
\dt search_metrics
\dt ai_metrics
\dt feature_usage

-- Check indexes
\d search_metrics
\d ai_metrics
\d feature_usage
```

### Production Environment

```bash
# 1. Backup database first
pg_dump -U your_user -d your_database > backup_before_analytics_$(date +%Y%m%d).sql

# 2. Run migration
psql -U your_user -d your_database -f migrations/001_create_metrics_tables.sql

# 3. Verify
psql -U your_user -d your_database -c "\dt *metrics*"
```

**Expected Output:**
```
 Schema |       Name        | Type  |  Owner
--------+-------------------+-------+---------
 public | search_metrics    | table | your_user
 public | ai_metrics        | table | your_user
 public | feature_usage     | table | your_user
```

---

## Testing (Pre-Production)

### 1. Unit Tests (if applicable)
```bash
npm run test
```

### 2. Integration Tests

**Test Search Tracking:**
```bash
# Start server
npm run start:dev

# Perform search
curl -X POST http://localhost:3000/search \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "test analytics", "userId": "test-user-id"}'

# Verify metric in database
psql -d clutter_ai_dev -c "SELECT * FROM search_metrics ORDER BY timestamp DESC LIMIT 1;"
```

**Test AI Tracking (Create Dump):**
```bash
# Create a dump
curl -X POST http://localhost:3000/dumps \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "Test dump for analytics", "userId": "test-user-id", "contentType": "text"}'

# Verify AI metrics (should see 3 entries: analysis, extraction, categorization)
psql -d clutter_ai_dev -c "SELECT operation_type, success, latency_ms FROM ai_metrics ORDER BY timestamp DESC LIMIT 5;"

# Verify feature usage
psql -d clutter_ai_dev -c "SELECT feature_type, detail FROM feature_usage ORDER BY timestamp DESC LIMIT 1;"
```

**Test Analytics Endpoints:**
```bash
# System metrics
curl http://localhost:3000/admin/analytics/system \
  -H "Authorization: Bearer YOUR_TOKEN"

# Search metrics
curl http://localhost:3000/admin/analytics/search \
  -H "Authorization: Bearer YOUR_TOKEN"

# AI metrics
curl http://localhost:3000/admin/analytics/ai \
  -H "Authorization: Bearer YOUR_TOKEN"

# Feature stats
curl http://localhost:3000/admin/analytics/features \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Load Testing

```bash
# Install k6 if needed
# brew install k6  # macOS
# apt-get install k6  # Linux

# Create load test script
cat > load-test.js << 'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 50 },  // Ramp up to 50 users
    { duration: '1m', target: 100 },  // Stay at 100 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
};

export default function () {
  const url = 'http://localhost:3000/search';
  const payload = JSON.stringify({
    query: 'test query',
    userId: 'test-user-id',
  });
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_TOKEN',
    },
  };

  let res = http.post(url, payload, params);
  check(res, {
    'status is 200': (r) => r.status === 200,
  });
  sleep(1);
}
EOF

# Run load test
k6 run load-test.js
```

**Success Criteria:**
- [ ] All requests complete successfully
- [ ] No metric errors in logs
- [ ] Database not overwhelmed
- [ ] Response times < 500ms for 95% of requests

### 4. Error Handling Test

**Simulate Metric Failure:**
```bash
# Temporarily revoke insert permissions (in test DB only!)
psql -d clutter_ai_dev -c "REVOKE INSERT ON search_metrics FROM your_app_user;"

# Perform search - should still work
curl -X POST http://localhost:3000/search ...

# Check logs - should see error but no crash
tail -f logs/app.log | grep "Failed to track"

# Restore permissions
psql -d clutter_ai_dev -c "GRANT INSERT ON search_metrics TO your_app_user;"
```

---

## Deployment Steps

### 1. Code Deployment

```bash
# Build production bundle
npm run build

# Copy files to server
rsync -avz dist/ user@server:/path/to/app/
rsync -avz migrations/ user@server:/path/to/app/migrations/
```

### 2. Database Migration (Production)

```bash
# SSH to production server
ssh user@server

# Backup database
pg_dump -U your_user -d your_database > backup_$(date +%Y%m%d_%H%M%S).sql

# Run migration
psql -U your_user -d your_database -f /path/to/app/migrations/001_create_metrics_tables.sql

# Verify
psql -U your_user -d your_database -c "SELECT COUNT(*) FROM search_metrics;"
```

### 3. Application Restart

```bash
# Using PM2
pm2 restart clutter-backend

# Using systemd
sudo systemctl restart clutter-backend

# Using Docker
docker-compose restart backend
```

### 4. Smoke Test

```bash
# Health check
curl http://your-server.com/health

# Analytics endpoint check
curl http://your-server.com/admin/analytics/system \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## Post-Deployment Monitoring

### First 24 Hours

**Check Every Hour:**
```bash
# Metric collection rate
psql -d your_database -c "
SELECT 
  COUNT(*) as total_metrics,
  MIN(timestamp) as oldest,
  MAX(timestamp) as newest
FROM search_metrics 
WHERE timestamp >= NOW() - INTERVAL '1 hour';
"

# Error rate in logs
tail -1000 /path/to/logs/app.log | grep -i "metric" | grep -i "error"

# Database size growth
psql -d your_database -c "
SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE tablename IN ('search_metrics', 'ai_metrics', 'feature_usage');
"
```

### First Week

**Daily Checks:**
- [ ] Metric data being collected
- [ ] No database performance issues
- [ ] Analytics endpoints responding quickly
- [ ] Frontend dashboard showing real data
- [ ] No error spikes in logs

---

## Rollback Plan

If issues occur:

### 1. Quick Rollback (Application Only)

```bash
# Revert to previous version
git revert HEAD
npm run build
pm2 restart clutter-backend
```

### 2. Full Rollback (Database + Application)

```bash
# Drop new tables (metrics data will be lost)
psql -d your_database -c "
DROP TABLE IF EXISTS search_metrics;
DROP TABLE IF EXISTS ai_metrics;
DROP TABLE IF EXISTS feature_usage;
DROP TYPE IF EXISTS ai_operation_type;
DROP TYPE IF EXISTS feature_type;
"

# Restore previous code version
git checkout previous-version
npm run build
pm2 restart clutter-backend
```

---

## Success Metrics

After 1 week of production use:

- [ ] Metrics being collected for all searches
- [ ] AI operations tracked with latency < 100ms overhead
- [ ] Feature usage data available
- [ ] Admin dashboard showing real analytics
- [ ] Zero user-facing errors from metric tracking
- [ ] Database performance stable
- [ ] Admin team using new analytics

---

## Documentation Updates

- [ ] Update API documentation with new endpoints
- [ ] Add metrics to monitoring dashboard
- [ ] Update team wiki with analytics guide
- [ ] Schedule training session for admin team

---

## 🎉 Go/No-Go Decision

**Ready to Deploy if:**
- [x] All code compiled successfully
- [ ] All tests passed
- [ ] Database migration tested in staging
- [ ] Load testing completed
- [ ] Rollback plan documented
- [ ] Team briefed on new features

**Deploy Command:**
```bash
./deploy.sh production
```

---

## Support Contacts

- **Backend Lead:** [Your Name]
- **DBA:** [DBA Name]
- **DevOps:** [DevOps Name]
- **On-Call:** [On-Call Engineer]

**Incident Response:**
1. Check logs: `tail -f logs/app.log`
2. Check database: `psql -d your_database`
3. Rollback if needed: See "Rollback Plan" above
4. Notify team in #incidents Slack channel
