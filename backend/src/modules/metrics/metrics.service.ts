import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SearchMetric } from '../../entities/search-metric.entity';
import { AIMetric, AIOperationType } from '../../entities/ai-metric.entity';
import { FeatureUsage, FeatureType } from '../../entities/feature-usage.entity';

/**
 * MetricsService
 * Centralized service for asynchronous metric tracking
 *
 * **CRITICAL RULES:**
 * 1. All tracking methods are fire-and-forget (no await in callers)
 * 2. All methods catch their own errors to prevent crashes
 * 3. Never block the main application flow
 */
@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  constructor(
    @InjectRepository(SearchMetric)
    private readonly searchMetricRepo: Repository<SearchMetric>,
    @InjectRepository(AIMetric)
    private readonly aiMetricRepo: Repository<AIMetric>,
    @InjectRepository(FeatureUsage)
    private readonly featureUsageRepo: Repository<FeatureUsage>,
  ) {}

  /**
   * Track search operation
   * Fire-and-forget: Caller should NOT await this
   */
  async trackSearch(data: {
    queryText: string;
    queryLength: number;
    resultsCount: number;
    latencyMs: number;
    searchType: 'vector' | 'fuzzy' | 'exact' | 'hybrid';
    userId?: string;
    success?: boolean;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      const metric = this.searchMetricRepo.create({
        query_text: data.queryText.substring(0, 500), // Truncate to prevent overflow
        query_length: data.queryLength,
        results_count: data.resultsCount,
        latency_ms: Math.round(data.latencyMs),
        search_type: data.searchType,
        user_id: data.userId || null,
        success: data.success ?? true,
        metadata: data.metadata || null,
      });

      await this.searchMetricRepo.save(metric);
      this.logger.debug(
        `Search metric tracked: ${data.searchType} (${data.latencyMs}ms)`,
      );
    } catch (error) {
      this.logger.error('Failed to track search metric:', error);
      // DO NOT throw - this is fire-and-forget
    }
  }

  /**
   * Track AI operation
   * Fire-and-forget: Caller should NOT await this
   */
  async trackAI(data: {
    operationType: AIOperationType;
    latencyMs: number;
    success: boolean;
    userId?: string;
    dumpId?: string;
    confidenceScore?: number;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      const metric = this.aiMetricRepo.create({
        operation_type: data.operationType,
        latency_ms: Math.round(data.latencyMs),
        success: data.success,
        user_id: data.userId || null,
        dump_id: data.dumpId || null,
        confidence_score: data.confidenceScore || null,
        metadata: data.metadata || null,
      });

      await this.aiMetricRepo.save(metric);
      this.logger.debug(
        `AI metric tracked: ${data.operationType} (${data.latencyMs}ms)`,
      );
    } catch (error) {
      this.logger.error('Failed to track AI metric:', error);
      // DO NOT throw - this is fire-and-forget
    }
  }

  /**
   * Track feature usage
   * Fire-and-forget: Caller should NOT await this
   */
  async trackFeature(data: {
    featureType: FeatureType;
    detail?: string;
    userId?: string;
    dumpId?: string;
    reminderId?: string;
    trackableItemId?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      const metric = this.featureUsageRepo.create({
        feature_type: data.featureType,
        detail: data.detail || null,
        user_id: data.userId || null,
        dump_id: data.dumpId || null,
        reminder_id: data.reminderId || null,
        trackable_item_id: data.trackableItemId || null,
        metadata: data.metadata || null,
      });

      await this.featureUsageRepo.save(metric);
      this.logger.debug(`Feature usage tracked: ${data.featureType}`);
    } catch (error) {
      this.logger.error('Failed to track feature usage:', error);
      // DO NOT throw - this is fire-and-forget
    }
  }

  /**
   * Helper: Fire-and-forget wrapper
   * Usage: this.metricsService.fireAndForget(() => this.trackSearch(...))
   */
  fireAndForget(trackingFn: () => Promise<void>): void {
    trackingFn().catch((error) => {
      this.logger.error('Metric tracking failed (fire-and-forget):', error);
    });
  }
}
