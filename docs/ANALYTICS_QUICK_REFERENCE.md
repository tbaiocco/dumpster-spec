# Analytics System Quick Reference

## 🎯 For Developers: Adding New Metric Tracking

### 1. Search Tracking (Already Implemented)

```typescript
import { MetricsService } from '../metrics/metrics.service';

// In your service constructor
constructor(
  private readonly metricsService: MetricsService,
) {}

// In your search method
async performSearch(query: string, userId: string) {
  const startTime = performance.now();
  let resultsCount = 0;
  let success = true;

  try {
    // ... your search logic ...
    resultsCount = results.length;
    return results;
  } catch (error) {
    success = false;
    throw error;
  } finally {
    // Fire-and-forget tracking
    const latencyMs = performance.now() - startTime;
    this.metricsService.fireAndForget(() =>
      this.metricsService.trackSearch({
        queryText: query,
        queryLength: query.length,
        resultsCount,
        latencyMs,
        searchType: 'hybrid',
        userId,
        success,
      }),
    );
  }
}
```

### 2. AI Operation Tracking (Already Implemented)

```typescript
import { AIOperationType } from '../../../entities/ai-metric.entity';

async performAIOperation(content: string, userId: string, dumpId?: string) {
  const startTime = performance.now();
  
  try {
    const result = await this.claudeService.analyze(content);
    const latency = performance.now() - startTime;
    
    // Track success
    this.metricsService.fireAndForget(() =>
      this.metricsService.trackAI({
        operationType: AIOperationType.CONTENT_ANALYSIS,
        latencyMs: latency,
        success: true,
        userId,
        dumpId,
        confidenceScore: Math.round(result.confidence * 100),
        metadata: { model: 'claude-3.5-sonnet' },
      }),
    );
    
    return result;
  } catch (error) {
    const latency = performance.now() - startTime;
    
    // Track failure
    this.metricsService.fireAndForget(() =>
      this.metricsService.trackAI({
        operationType: AIOperationType.CONTENT_ANALYSIS,
        latencyMs: latency,
        success: false,
        userId,
        dumpId,
        metadata: { error: error.message },
      }),
    );
    
    throw error;
  }
}
```

### 3. Feature Usage Tracking

```typescript
import { FeatureType } from '../../../entities/feature-usage.entity';

async handleBotCommand(command: string, userId: string) {
  // Execute the command
  const result = await this.executeCommand(command);
  
  // Track feature usage (fire-and-forget)
  this.metricsService.fireAndForget(() =>
    this.metricsService.trackFeature({
      featureType: FeatureType.BOT_COMMAND,
      detail: command,
      userId,
      metadata: {
        platform: 'telegram',
        successful: true,
      },
    }),
  );
  
  return result;
}
```

## 📊 For Analysts: Querying Metrics

### Search Analytics

```sql
-- Top 10 most searched queries
SELECT query_text, COUNT(*) as count
FROM search_metrics
GROUP BY query_text
ORDER BY count DESC
LIMIT 10;

-- Average search latency by type
SELECT 
  search_type,
  AVG(latency_ms) as avg_latency,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms) as p95,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY latency_ms) as p99
FROM search_metrics
GROUP BY search_type;

-- Daily search volume
SELECT 
  DATE(timestamp) as date,
  COUNT(*) as searches,
  AVG(latency_ms) as avg_latency
FROM search_metrics
WHERE timestamp >= NOW() - INTERVAL '30 days'
GROUP BY DATE(timestamp)
ORDER BY date;
```

### AI Performance Analytics

```sql
-- AI operation performance by type
SELECT 
  operation_type,
  COUNT(*) as total,
  AVG(latency_ms) as avg_latency,
  AVG(confidence_score) as avg_confidence,
  SUM(CASE WHEN success THEN 1 ELSE 0 END)::FLOAT / COUNT(*) * 100 as success_rate
FROM ai_metrics
GROUP BY operation_type;

-- Low confidence AI operations (needs review)
SELECT 
  operation_type,
  COUNT(*) as count
FROM ai_metrics
WHERE confidence_score < 70
GROUP BY operation_type;

-- AI processing time trends
SELECT 
  DATE(timestamp) as date,
  operation_type,
  AVG(latency_ms) as avg_latency
FROM ai_metrics
WHERE timestamp >= NOW() - INTERVAL '7 days'
GROUP BY DATE(timestamp), operation_type
ORDER BY date, operation_type;
```

### Feature Usage Analytics

```sql
-- Most popular features
SELECT 
  feature_type,
  COUNT(*) as usage_count
FROM feature_usage
GROUP BY feature_type
ORDER BY usage_count DESC;

-- Daily active users
SELECT 
  DATE(timestamp) as date,
  COUNT(DISTINCT user_id) as active_users
FROM feature_usage
WHERE timestamp >= NOW() - INTERVAL '30 days'
GROUP BY DATE(timestamp)
ORDER BY date;

-- User engagement by feature
SELECT 
  user_id,
  feature_type,
  COUNT(*) as actions,
  MIN(timestamp) as first_use,
  MAX(timestamp) as last_use
FROM feature_usage
WHERE timestamp >= NOW() - INTERVAL '30 days'
GROUP BY user_id, feature_type
ORDER BY actions DESC;
```

## 🔧 For Ops: Maintenance

### Data Retention

```sql
-- Archive old metrics (older than 90 days)
CREATE TABLE search_metrics_archive AS
SELECT * FROM search_metrics 
WHERE timestamp < NOW() - INTERVAL '90 days';

DELETE FROM search_metrics 
WHERE timestamp < NOW() - INTERVAL '90 days';

-- Vacuum to reclaim space
VACUUM ANALYZE search_metrics;
VACUUM ANALYZE ai_metrics;
VACUUM ANALYZE feature_usage;
```

### Performance Monitoring

```sql
-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE tablename IN ('search_metrics', 'ai_metrics', 'feature_usage')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename IN ('search_metrics', 'ai_metrics', 'feature_usage')
ORDER BY idx_scan DESC;
```

## 🚨 Critical Rules

### DO ✅
- Always use `fireAndForget()` for metric tracking
- Capture `userId` whenever available
- Include `dumpId` for AI operations
- Use `performance.now()` for precise timing
- Track both success and failure cases

### DON'T ❌
- Never `await` metric tracking in main flow
- Don't throw errors from metric methods
- Don't block user operations for metrics
- Don't skip error handling in tracking
- Don't query metrics in hot paths

## 📈 API Endpoints

### Admin Analytics Endpoints

```bash
# System-wide metrics
GET /admin/analytics/system
Authorization: Bearer {token}

# Search performance metrics
GET /admin/analytics/search
Authorization: Bearer {token}

# AI processing metrics
GET /admin/analytics/ai
Authorization: Bearer {token}

# User activity statistics
GET /admin/analytics/users
Authorization: Bearer {token}

# Feature usage statistics
GET /admin/analytics/features
Authorization: Bearer {token}
```

### Response Format

```json
{
  "success": true,
  "data": {
    "totalSearches": 15234,
    "averageLatency": 245,
    "successRate": 98.5,
    ...
  }
}
```

## 🧪 Testing Checklist

- [ ] Perform a search and verify `search_metrics` insert
- [ ] Create a dump and verify `ai_metrics` inserts (3x: analysis, extraction, categorization)
- [ ] Create a dump and verify `feature_usage` insert
- [ ] Check logs for any metric errors
- [ ] Verify API endpoints return real data
- [ ] Test with high load (100+ requests/sec)
- [ ] Verify database indexes are used

## 📚 Resources

- **Implementation Details:** `backend/ANALYTICS_IMPLEMENTATION.md`
- **Entity Definitions:** `backend/src/entities/*-metric.entity.ts`
- **Metrics Service:** `backend/src/modules/metrics/metrics.service.ts`
- **Admin Service:** `backend/src/modules/admin/admin.service.ts`
- **Migration:** `backend/migrations/001_create_metrics_tables.sql`
