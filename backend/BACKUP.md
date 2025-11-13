# Backup and Disaster Recovery Guide (T098)

This document outlines backup strategies, disaster recovery procedures, and business continuity planning for the Clutter.AI Universal Life Inbox system.

## Backup Strategy

### 1. Database Backups (Supabase)

#### Automated Backups
Supabase provides automatic daily backups with point-in-time recovery (PITR):

```bash
# Supabase automatic backups (managed by platform)
- Daily full backups: Retained for 7 days (Free/Pro)
- Point-in-time recovery: Up to 7 days (Pro plan)
- Weekly backups: Retained for 4 weeks
- Monthly backups: Retained for 3 months
```

#### Manual Backups

```bash
# Export full database using pg_dump
pg_dump "postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres" \
  --format=custom \
  --file=backup_$(date +%Y%m%d_%H%M%S).dump \
  --verbose

# Export specific tables
pg_dump "postgresql://..." \
  --table=dumps --table=users --table=reminders \
  --format=custom \
  --file=critical_tables_$(date +%Y%m%d_%H%M%S).dump

# Export as SQL script (human-readable)
pg_dump "postgresql://..." \
  --format=plain \
  --file=backup_$(date +%Y%m%d_%H%M%S).sql
```

#### Restore from Backup

```bash
# Restore from custom format backup
pg_restore --dbname="postgresql://..." \
  --verbose \
  --clean \
  --if-exists \
  backup_20240122_120000.dump

# Restore from SQL script
psql "postgresql://..." < backup_20240122_120000.sql

# Restore specific tables
pg_restore --dbname="postgresql://..." \
  --table=dumps \
  --verbose \
  backup_20240122_120000.dump
```

### 2. Storage Backups (Supabase Storage)

#### Media Files Backup

```bash
# Install Supabase CLI
npm install -g supabase

# Download all files from storage bucket
supabase storage download dumps-media \
  --recursive \
  --output ./backups/media_$(date +%Y%m%d)

# Sync to S3 for offsite backup
aws s3 sync ./backups/media_$(date +%Y%m%d) \
  s3://clutter-ai-backups/media/$(date +%Y%m%d) \
  --storage-class STANDARD_IA
```

#### Automated Storage Backup Script

```bash
#!/bin/bash
# backup-storage.sh

BACKUP_DIR="/var/backups/clutter-ai"
DATE=$(date +%Y%m%d)
BUCKET="dumps-media"

# Create backup directory
mkdir -p "$BACKUP_DIR/$DATE"

# Download media files
supabase storage download "$BUCKET" \
  --recursive \
  --output "$BACKUP_DIR/$DATE"

# Compress backup
tar -czf "$BACKUP_DIR/media_$DATE.tar.gz" \
  -C "$BACKUP_DIR/$DATE" .

# Upload to S3
aws s3 cp "$BACKUP_DIR/media_$DATE.tar.gz" \
  "s3://clutter-ai-backups/media/"

# Clean up local files older than 7 days
find "$BACKUP_DIR" -type f -mtime +7 -delete

echo "Backup completed: media_$DATE.tar.gz"
```

### 3. Application Configuration Backups

```bash
# Backup environment variables from Railway
railway variables export > backups/env_$(date +%Y%m%d).txt

# Backup Supabase project settings
curl "https://api.supabase.com/v1/projects/${PROJECT_ID}/config" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  > backups/supabase_config_$(date +%Y%m%d).json

# Backup source code (Git)
git bundle create backups/repo_$(date +%Y%m%d).bundle --all
```

## Backup Automation

### Cron Job Setup

```bash
# Edit crontab
crontab -e

# Daily database backup at 2 AM UTC
0 2 * * * /opt/scripts/backup-database.sh >> /var/log/backups.log 2>&1

# Daily storage backup at 3 AM UTC
0 3 * * * /opt/scripts/backup-storage.sh >> /var/log/backups.log 2>&1

# Weekly full backup on Sundays at 1 AM UTC
0 1 * * 0 /opt/scripts/backup-full.sh >> /var/log/backups.log 2>&1
```

### Database Backup Script

```bash
#!/bin/bash
# backup-database.sh

set -e

BACKUP_DIR="/var/backups/clutter-ai/database"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Database connection string
DB_URL="${DATABASE_URL}"

# Create backup
echo "Starting database backup: $DATE"
pg_dump "$DB_URL" \
  --format=custom \
  --file="$BACKUP_DIR/db_$DATE.dump" \
  --verbose

# Compress backup
gzip "$BACKUP_DIR/db_$DATE.dump"

# Upload to S3
aws s3 cp "$BACKUP_DIR/db_$DATE.dump.gz" \
  "s3://clutter-ai-backups/database/" \
  --storage-class STANDARD_IA

# Remove local backups older than retention period
find "$BACKUP_DIR" -type f -mtime +$RETENTION_DAYS -delete

# Verify backup integrity
gunzip -t "$BACKUP_DIR/db_$DATE.dump.gz"

echo "Backup completed successfully: db_$DATE.dump.gz"

# Send notification (optional)
curl -X POST "https://api.clutter.ai/internal/backup-notification" \
  -H "Content-Type: application/json" \
  -d "{\"status\": \"success\", \"backup\": \"db_$DATE.dump.gz\"}"
```

## Disaster Recovery Procedures

### Scenario 1: Database Corruption

```bash
# 1. Identify corruption
SELECT * FROM dumps WHERE id = 'corrupted-record-id';

# 2. Restore from point-in-time (Supabase Dashboard)
# Navigate to: Database > Backups > Point-in-time Recovery
# Select timestamp before corruption occurred

# 3. Verify restoration
psql "postgresql://..." -c "SELECT COUNT(*) FROM dumps;"

# 4. Test application connectivity
curl -f https://api.clutter.ai/health/db || echo "DB health check failed"
```

### Scenario 2: Complete Database Loss

```bash
# 1. Provision new Supabase project
supabase projects create clutter-ai-recovery

# 2. Restore from latest backup
pg_restore --dbname="postgresql://new-db-url..." \
  --verbose \
  --clean \
  --if-exists \
  s3://clutter-ai-backups/database/db_latest.dump.gz

# 3. Install pgvector extension
psql "postgresql://new-db-url..." -c "CREATE EXTENSION IF NOT EXISTS vector;"

# 4. Verify data integrity
psql "postgresql://new-db-url..." << EOF
SELECT COUNT(*) FROM dumps;
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM reminders;
EOF

# 5. Update application environment variables
railway variables set DATABASE_URL="postgresql://new-db-url..."

# 6. Restart application
railway up --detach

# 7. Run smoke tests
npm run test:e2e
```

### Scenario 3: Storage Loss (Media Files)

```bash
# 1. Create new Supabase storage bucket
supabase storage create dumps-media-recovery

# 2. Restore media files from S3 backup
aws s3 sync s3://clutter-ai-backups/media/latest/ \
  ./recovery-media/

# 3. Upload to new bucket
supabase storage upload dumps-media-recovery \
  ./recovery-media/ \
  --recursive

# 4. Update storage bucket configuration
# Update SUPABASE_STORAGE_BUCKET environment variable

# 5. Verify file accessibility
curl -I "https://[project-ref].supabase.co/storage/v1/object/public/dumps-media-recovery/test.jpg"
```

### Scenario 4: Complete System Failure

**RTO (Recovery Time Objective)**: 4 hours  
**RPO (Recovery Point Objective)**: 24 hours (daily backups)

```bash
# 1. Spin up new infrastructure
railway init clutter-ai-recovery

# 2. Deploy latest Docker images
railway up --service backend
railway up --service admin-dashboard

# 3. Restore database (see Scenario 2)

# 4. Restore storage (see Scenario 3)

# 5. Configure DNS (Railway custom domain)
# Point api.clutter.ai to new Railway deployment

# 6. Run full test suite
npm run test:e2e -- --bail

# 7. Monitor health endpoints
watch -n 10 curl https://api.clutter.ai/health/detailed

# 8. Notify users of service restoration
# Send email/SMS notifications
```

## Monitoring & Alerting

### Health Check Monitoring

```bash
# Set up monitoring with UptimeRobot or similar
# Monitor endpoints:
- https://api.clutter.ai/health (every 5 minutes)
- https://api.clutter.ai/health/db (every 10 minutes)
- https://admin.clutter.ai (every 5 minutes)

# Alert channels:
- Email: ops@clutter.ai
- SMS: +1-XXX-XXX-XXXX
- Slack: #ops-alerts
```

### Backup Verification

```bash
#!/bin/bash
# verify-backups.sh

# Check S3 backup age
LATEST_BACKUP=$(aws s3 ls s3://clutter-ai-backups/database/ \
  --recursive | sort | tail -n 1 | awk '{print $4}')

BACKUP_AGE=$(( ( $(date +%s) - $(date -d "$(aws s3api head-object \
  --bucket clutter-ai-backups \
  --key "$LATEST_BACKUP" \
  --query LastModified \
  --output text)" +%s) ) / 3600 ))

if [ $BACKUP_AGE -gt 48 ]; then
  echo "ERROR: Latest backup is $BACKUP_AGE hours old!"
  # Send alert
  exit 1
fi

echo "OK: Latest backup is $BACKUP_AGE hours old"
```

## Business Continuity Plan

### Critical Dependencies

1. **Supabase (PostgreSQL + Storage)**
   - Fallback: Self-hosted PostgreSQL on Railway
   - Estimated switchover time: 2 hours

2. **Railway (Application Hosting)**
   - Fallback: Render, Fly.io, or AWS ECS
   - Estimated switchover time: 4 hours

3. **Anthropic Claude API**
   - Fallback: OpenAI GPT-4 (already integrated)
   - Estimated switchover time: Immediate (code already exists)

4. **ElevenLabs TTS API**
   - Fallback: Google Cloud Text-to-Speech
   - Estimated switchover time: 1 hour (code changes needed)

### Emergency Contacts

```yaml
Infrastructure Lead: [Name] - [Email] - [Phone]
Database Administrator: [Name] - [Email] - [Phone]
DevOps Engineer: [Name] - [Email] - [Phone]
On-Call Rotation: https://oncall.clutter.ai
```

### Communication Plan

1. **Internal Communication**
   - Primary: Slack #ops-incidents
   - Secondary: Email ops@clutter.ai
   - Emergency: Phone tree

2. **External Communication**
   - Status page: https://status.clutter.ai
   - Twitter: @ClutterAI_Status
   - Email: status@clutter.ai

## Testing Disaster Recovery

### Monthly DR Drill

```bash
#!/bin/bash
# dr-drill.sh - Run monthly disaster recovery test

echo "=== Disaster Recovery Drill: $(date) ==="

# 1. Create test database
echo "Creating test database..."
createdb clutter_ai_dr_test

# 2. Restore from latest backup
echo "Restoring from backup..."
LATEST_BACKUP=$(aws s3 ls s3://clutter-ai-backups/database/ \
  --recursive | sort | tail -n 1 | awk '{print $4}')

aws s3 cp "s3://clutter-ai-backups/database/$LATEST_BACKUP" /tmp/
pg_restore --dbname=clutter_ai_dr_test /tmp/$(basename $LATEST_BACKUP)

# 3. Run validation queries
echo "Validating restored data..."
psql clutter_ai_dr_test << EOF
SELECT 'Users' AS table_name, COUNT(*) AS row_count FROM users
UNION ALL
SELECT 'Dumps', COUNT(*) FROM dumps
UNION ALL
SELECT 'Reminders', COUNT(*) FROM reminders;
EOF

# 4. Clean up
dropdb clutter_ai_dr_test
rm /tmp/$(basename $LATEST_BACKUP)

echo "=== DR Drill Complete ==="
```

Run drill monthly and document results:

```bash
# Add to crontab
0 9 1 * * /opt/scripts/dr-drill.sh >> /var/log/dr-drills.log 2>&1
```

## Compliance & Retention

### Data Retention Policy

- **Database backups**: 90 days
- **Storage backups**: 90 days
- **Application logs**: 30 days
- **Audit logs**: 365 days
- **User data**: Per GDPR/user request

### Backup Security

```bash
# Encrypt backups before uploading
gpg --encrypt --recipient ops@clutter.ai backup.dump
aws s3 cp backup.dump.gpg s3://clutter-ai-backups/

# Decrypt for restoration
aws s3 cp s3://clutter-ai-backups/backup.dump.gpg .
gpg --decrypt backup.dump.gpg > backup.dump
```

### Audit Trail

```sql
-- Track backup operations
CREATE TABLE backup_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_type VARCHAR(50) NOT NULL,
  backup_location TEXT NOT NULL,
  backup_size BIGINT,
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255)
);

-- Log backup events
INSERT INTO backup_audit_log (backup_type, backup_location, backup_size, status, created_by)
VALUES ('full_database', 's3://clutter-ai-backups/database/db_20240122.dump.gz', 524288000, 'success', 'cron');
```

## Checklist: Recovery Verification

After any disaster recovery operation:

- [ ] Database connectivity verified
- [ ] All tables present with correct row counts
- [ ] Vector search functionality working
- [ ] Storage bucket accessible
- [ ] Media files loading correctly
- [ ] Authentication system functional
- [ ] API endpoints responding
- [ ] Admin dashboard accessible
- [ ] Health checks passing
- [ ] Monitoring alerts configured
- [ ] Logs being collected
- [ ] Users notified of service restoration
- [ ] Incident postmortem scheduled
- [ ] Backup verification passed

## Post-Incident Review Template

```markdown
# Incident Report: [Date] - [Issue Title]

## Summary
Brief description of the incident and impact.

## Timeline
- **HH:MM** - Incident detected
- **HH:MM** - Response initiated
- **HH:MM** - Root cause identified
- **HH:MM** - Recovery completed
- **HH:MM** - Service restored

## Root Cause
Detailed analysis of what caused the issue.

## Resolution
Steps taken to resolve the incident.

## Impact
- Users affected: [Number]
- Downtime duration: [Minutes/Hours]
- Data loss: [Yes/No - Details]

## Lessons Learned
- What went well?
- What could be improved?
- Action items for prevention

## Action Items
- [ ] Update backup procedures
- [ ] Enhance monitoring
- [ ] Update documentation
- [ ] Train team on new procedures
```
