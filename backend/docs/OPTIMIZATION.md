# Database Query Optimization Guide (T096)

This document outlines strategies and best practices for optimizing database queries in the Clutter.AI Universal Life Inbox system.

## Current Database Setup

- **Database**: PostgreSQL with pgvector extension
- **ORM**: TypeORM
- **Vector Dimensions**: 3072 (OpenAI text-embedding-3-large)
- **Primary Tables**: users, dumps, reminders, categories

## Indexing Strategy

### 1. Existing Indexes

```sql
-- Primary keys (automatic indexes)
CREATE INDEX idx_dumps_pk ON dumps(id);
CREATE INDEX idx_users_pk ON users(id);
CREATE INDEX idx_reminders_pk ON reminders(id);

-- Foreign key indexes (manual)
CREATE INDEX idx_dumps_user_id ON dumps(user_id);
CREATE INDEX idx_dumps_category_id ON dumps(category_id);
CREATE INDEX idx_reminders_dump_id ON reminders(dump_id);
CREATE INDEX idx_reminders_user_id ON reminders(user_id);
```

### 2. Recommended Additional Indexes

```sql
-- Frequently queried timestamps
CREATE INDEX idx_dumps_created_at ON dumps(created_at DESC);
CREATE INDEX idx_reminders_trigger_at ON reminders(trigger_at) WHERE status = 'pending';

-- Text search (GiST for full-text)
CREATE INDEX idx_dumps_content_fts ON dumps USING GIN(to_tsvector('english', content));
CREATE INDEX idx_dumps_title_fts ON dumps USING GIN(to_tsvector('english', title));

-- Vector search optimization (HNSW for better performance)
CREATE INDEX idx_dumps_embedding_hnsw ON dumps USING hnsw(embedding vector_cosine_ops);

-- Composite indexes for common queries
CREATE INDEX idx_dumps_user_category ON dumps(user_id, category_id);
CREATE INDEX idx_dumps_user_created ON dumps(user_id, created_at DESC);
CREATE INDEX idx_reminders_user_status ON reminders(user_id, status, trigger_at);
```

### 3. Index Maintenance

```sql
-- Analyze tables for query planner statistics
ANALYZE dumps;
ANALYZE users;
ANALYZE reminders;

-- Reindex periodically (monthly or after bulk updates)
REINDEX TABLE dumps;
REINDEX TABLE reminders;

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
ORDER BY idx_scan ASC;
```

## Query Optimization Techniques

### 1. Vector Search Optimization

```typescript
// Current implementation (basic)
const results = await this.dumpRepository
  .createQueryBuilder('dump')
  .where('user_id = :userId', { userId })
  .orderBy('embedding <=> :queryEmbedding', 'ASC')
  .setParameter('queryEmbedding', JSON.stringify(embedding))
  .limit(10)
  .getMany();

// Optimized with HNSW index and filtering
const results = await this.dumpRepository
  .createQueryBuilder('dump')
  .where('user_id = :userId', { userId })
  .andWhere('embedding IS NOT NULL') // Filter nulls before vector search
  .andWhere('created_at > :cutoff', { cutoff: thirtyDaysAgo }) // Time-based filtering
  .orderBy('embedding <=> :queryEmbedding', 'ASC')
  .setParameter('queryEmbedding', JSON.stringify(embedding))
  .limit(10)
  .getMany();
```

### 2. Pagination Best Practices

```typescript
// Avoid OFFSET for large datasets (inefficient)
const results = await this.dumpRepository.find({
  where: { userId },
  skip: 1000, // BAD: reads and discards 1000 rows
  take: 20,
});

// Use cursor-based pagination instead
const results = await this.dumpRepository
  .createQueryBuilder('dump')
  .where('user_id = :userId', { userId })
  .andWhere('created_at < :cursor', { cursor: lastSeenTimestamp })
  .orderBy('created_at', 'DESC')
  .limit(20)
  .getMany();
```

### 3. Selective Field Loading

```typescript
// Avoid loading entire entities when only fields are needed
const heavyEntities = await this.dumpRepository.find({
  where: { userId },
  // Loads ALL columns including large text and vectors
});

// Use select to load only needed fields
const lightResults = await this.dumpRepository
  .createQueryBuilder('dump')
  .select(['dump.id', 'dump.title', 'dump.created_at'])
  .where('user_id = :userId', { userId })
  .getMany();
```

### 4. N+1 Query Prevention

```typescript
// BAD: N+1 queries (1 query + N queries for relations)
const dumps = await this.dumpRepository.find({ where: { userId } });
for (const dump of dumps) {
  dump.category = await this.categoryRepository.findOne(dump.categoryId); // N queries!
}

// GOOD: Single query with JOIN
const dumps = await this.dumpRepository.find({
  where: { userId },
  relations: ['category'], // Single LEFT JOIN
});

// BETTER: Selective field loading with JOIN
const dumps = await this.dumpRepository
  .createQueryBuilder('dump')
  .leftJoinAndSelect('dump.category', 'category')
  .select([
    'dump.id',
    'dump.title',
    'dump.created_at',
    'category.id',
    'category.name',
  ])
  .where('dump.user_id = :userId', { userId })
  .getMany();
```

### 5. Caching Strategies

```typescript
// Cache frequently accessed, rarely changing data
@Injectable()
export class CategoryService {
  private categoryCache: Map<string, Category> = new Map();
  private cacheExpiry: number = Date.now() + 3600000; // 1 hour

  async findById(id: string): Promise<Category> {
    if (Date.now() > this.cacheExpiry) {
      this.categoryCache.clear();
      this.cacheExpiry = Date.now() + 3600000;
    }

    if (this.categoryCache.has(id)) {
      return this.categoryCache.get(id);
    }

    const category = await this.categoryRepository.findOne({ where: { id } });
    this.categoryCache.set(id, category);
    return category;
  }
}
```

## Connection Pool Configuration

```typescript
// backend/src/config/database.config.ts
export default {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  
  // Optimized connection pool settings
  extra: {
    max: 20, // Maximum connections in pool
    min: 5,  // Minimum idle connections
    acquireConnectionTimeout: 30000, // 30s timeout
    idleTimeoutMillis: 10000, // Close idle connections after 10s
    connectionTimeoutMillis: 2000, // 2s connection timeout
  },
  
  // Enable query logging in development
  logging: process.env.NODE_ENV === 'development',
  
  // Monitor slow queries
  maxQueryExecutionTime: 1000, // Log queries taking > 1s
};
```

## Monitoring Slow Queries

### 1. Enable PostgreSQL Slow Query Log

```sql
-- In postgresql.conf or Supabase dashboard
ALTER SYSTEM SET log_min_duration_statement = 1000; -- Log queries > 1s
ALTER SYSTEM SET log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h ';
ALTER SYSTEM SET log_statement = 'all'; -- Development only
SELECT pg_reload_conf();
```

### 2. Query Performance Analysis

```sql
-- Find slow queries
SELECT
    query,
    calls,
    total_time,
    mean_time,
    max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Analyze specific query
EXPLAIN ANALYZE
SELECT * FROM dumps
WHERE user_id = '123'
  AND embedding <=> '[0.1, 0.2, ...]' < 0.7
ORDER BY created_at DESC
LIMIT 20;
```

### 3. Database Statistics

```sql
-- Table sizes and bloat
SELECT
    schemaname AS schema,
    tablename AS table,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Index hit ratio (should be > 95%)
SELECT
    sum(idx_blks_hit) / nullif(sum(idx_blks_hit + idx_blks_read), 0) AS index_hit_ratio
FROM pg_statio_user_indexes;

-- Cache hit ratio (should be > 99%)
SELECT
    sum(heap_blks_hit) / nullif(sum(heap_blks_hit + heap_blks_read), 0) AS cache_hit_ratio
FROM pg_statio_user_tables;
```

## Performance Benchmarks

### Target Metrics

- **Vector search**: < 100ms for 10 results
- **Full-text search**: < 50ms for 20 results
- **Simple CRUD operations**: < 10ms
- **Complex aggregations**: < 500ms
- **Connection acquisition**: < 50ms

### Load Testing

```bash
# Install k6 for load testing
npm install -g k6

# Create load test script (k6-load-test.js)
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests < 500ms
  },
};

export default function () {
  const res = http.get('http://localhost:3000/api/dumps?page=1&limit=20');
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}

# Run load test
k6 run k6-load-test.js
```

## Regular Maintenance Tasks

### Daily
- Monitor slow query logs
- Check connection pool utilization
- Review error logs for timeout issues

### Weekly
- Run ANALYZE on high-traffic tables
- Review pg_stat_statements for new slow queries
- Check index usage statistics

### Monthly
- VACUUM FULL on tables with heavy updates
- REINDEX tables with fragmented indexes
- Review and optimize growing tables
- Update query patterns based on usage

### Quarterly
- Review and update indexes based on query patterns
- Evaluate need for read replicas
- Consider table partitioning for large tables
- Benchmark performance and compare to baselines

## Troubleshooting Common Issues

### Issue: Vector search is slow

```sql
-- Check if HNSW index exists
SELECT * FROM pg_indexes WHERE tablename = 'dumps' AND indexname LIKE '%embedding%';

-- Create HNSW index if missing
CREATE INDEX CONCURRENTLY idx_dumps_embedding_hnsw 
ON dumps USING hnsw(embedding vector_cosine_ops);
```

### Issue: High connection pool exhaustion

```typescript
// Increase pool size in database config
extra: {
  max: 30, // Increase from 20
  connectionTimeoutMillis: 5000, // Increase timeout
}
```

### Issue: Timeout errors on complex queries

```typescript
// Set longer query timeout for specific operations
await this.dumpRepository.query('SET statement_timeout = 30000'); // 30s
const results = await complexQuery();
await this.dumpRepository.query('SET statement_timeout = 5000'); // Reset to 5s
```

## Future Optimizations

1. **Read Replicas**: Add read replicas for heavy read workloads
2. **Caching Layer**: Implement Redis for frequently accessed data
3. **Table Partitioning**: Partition dumps table by month for archival
4. **Materialized Views**: Create materialized views for analytics queries
5. **Query Result Caching**: Cache search results for common queries
