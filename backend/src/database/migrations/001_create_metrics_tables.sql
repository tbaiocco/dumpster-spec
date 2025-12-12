-- Migration: Create Metrics Tables for Production Analytics System
-- Date: 2025-12-11
-- Description: Creates SearchMetric, AIMetric, and FeatureUsage tables for comprehensive analytics

-- =============================================
-- SearchMetric Table
-- =============================================
CREATE TABLE IF NOT EXISTS search_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    query_text VARCHAR(500) NOT NULL,
    query_length INTEGER NOT NULL,
    results_count INTEGER NOT NULL,
    latency_ms INTEGER NOT NULL,
    search_type VARCHAR(50) NOT NULL CHECK (search_type IN ('vector', 'fuzzy', 'exact', 'hybrid')),
    user_id UUID,
    success BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB
);

-- Indexes for search_metrics
CREATE INDEX IF NOT EXISTS idx_search_metrics_timestamp ON search_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_search_metrics_user_id ON search_metrics(user_id);

-- =============================================
-- AIMetric Table
-- =============================================
CREATE TYPE ai_operation_type AS ENUM (
    'categorization',
    'extraction',
    'reminder',
    'tracking',
    'content_analysis',
    'vision',
    'speech'
);

CREATE TABLE IF NOT EXISTS ai_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    operation_type ai_operation_type NOT NULL,
    latency_ms INTEGER NOT NULL,
    success BOOLEAN NOT NULL,
    user_id UUID,
    dump_id UUID,
    confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
    metadata JSONB
);

-- Indexes for ai_metrics
CREATE INDEX IF NOT EXISTS idx_ai_metrics_timestamp ON ai_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_ai_metrics_user_id ON ai_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_metrics_dump_id ON ai_metrics(dump_id);
CREATE INDEX IF NOT EXISTS idx_ai_metrics_operation_type ON ai_metrics(operation_type);

-- =============================================
-- FeatureUsage Table
-- =============================================
CREATE TYPE feature_type AS ENUM (
    'bot_command',
    'email_processed',
    'reminder_sent',
    'dump_created',
    'search_performed',
    'tracking_created',
    'calendar_synced'
);

CREATE TABLE IF NOT EXISTS feature_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    feature_type feature_type NOT NULL,
    detail VARCHAR(200),
    user_id UUID,
    dump_id UUID,
    reminder_id UUID,
    trackable_item_id UUID,
    metadata JSONB
);

-- Indexes for feature_usage
CREATE INDEX IF NOT EXISTS idx_feature_usage_timestamp ON feature_usage(timestamp);
CREATE INDEX IF NOT EXISTS idx_feature_usage_user_id ON feature_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_usage_feature_type ON feature_usage(feature_type);

-- =============================================
-- Grant Permissions (adjust as needed)
-- =============================================
-- GRANT SELECT, INSERT, UPDATE, DELETE ON search_metrics TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ai_metrics TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON feature_usage TO your_app_user;

-- =============================================
-- Comments for Documentation
-- =============================================
COMMENT ON TABLE search_metrics IS 'Tracks all search operations for performance monitoring and analytics';
COMMENT ON TABLE ai_metrics IS 'Tracks all AI operations for performance monitoring and analytics';
COMMENT ON TABLE feature_usage IS 'Tracks feature usage across the platform for analytics';

COMMENT ON COLUMN search_metrics.query_text IS 'The search query text (truncated to 500 chars)';
COMMENT ON COLUMN search_metrics.latency_ms IS 'Search operation latency in milliseconds';
COMMENT ON COLUMN search_metrics.search_type IS 'Type of search performed: vector, fuzzy, exact, or hybrid';

COMMENT ON COLUMN ai_metrics.operation_type IS 'Type of AI operation: categorization, extraction, etc.';
COMMENT ON COLUMN ai_metrics.confidence_score IS 'AI confidence score (0-100)';
COMMENT ON COLUMN ai_metrics.latency_ms IS 'AI operation latency in milliseconds';

COMMENT ON COLUMN feature_usage.feature_type IS 'Type of feature used: bot_command, dump_created, etc.';
COMMENT ON COLUMN feature_usage.detail IS 'Additional details about the feature usage (e.g., specific command)';
