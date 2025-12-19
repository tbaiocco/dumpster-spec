import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dump } from '../../entities/dump.entity';
import { User } from '../../entities/user.entity';
import { Reminder } from '../../entities/reminder.entity';
import { Category } from '../../entities/category.entity';
import { SearchMetric } from '../../entities/search-metric.entity';
import { AIMetric, AIOperationType } from '../../entities/ai-metric.entity';
import { FeatureUsage, FeatureType } from '../../entities/feature-usage.entity';

/**
 * Admin Service (UPDATED)
 * Now uses real database metrics instead of mocks
 */
@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Dump)
    private readonly dumpRepository: Repository<Dump>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Reminder)
    private readonly reminderRepository: Repository<Reminder>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(SearchMetric)
    private readonly searchMetricRepo: Repository<SearchMetric>,
    @InjectRepository(AIMetric)
    private readonly aiMetricRepo: Repository<AIMetric>,
    @InjectRepository(FeatureUsage)
    private readonly featureUsageRepo: Repository<FeatureUsage>,
  ) {}

  /**
   * Get system-wide metrics and statistics
   */
  async getSystemMetrics() {
    // Total counts
    const totalUsers = await this.userRepository.count();
    const totalDumps = await this.dumpRepository.count();
    const totalReminders = await this.reminderRepository.count();

    // Active users (with any activity) - Note: User entity doesn't have lastLoginAt
    // Using created_at as proxy for now
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentUsers = await this.userRepository
      .createQueryBuilder('user')
      .where('user.created_at >= :thirtyDaysAgo', { thirtyDaysAgo })
      .getCount();

    // Dumps with categories (successfully processed)
    const categorizedDumps = await this.dumpRepository
      .createQueryBuilder('dump')
      .where('dump.category_id IS NOT NULL')
      .getCount();

    const processingSuccessRate =
      totalDumps > 0 ? (categorizedDumps / totalDumps) * 100 : 0;

    // REAL PROCESSING TIME (from AI metrics)
    const avgProcessingTime = await this.aiMetricRepo
      .createQueryBuilder('metric')
      .select('AVG(metric.latency_ms)', 'avg')
      .where('metric.operation_type = :type', {
        type: AIOperationType.CONTENT_ANALYSIS,
      })
      .andWhere('metric.success = true')
      .getRawOne();

    const averageProcessingTime = avgProcessingTime?.avg
      ? Number.parseFloat(avgProcessingTime.avg) / 1000 // Convert to seconds
      : 0;

    // Daily statistics for the last 30 days
    const dailyStats = await this.getDailyStatistics(30);

    // Storage statistics
    const storageStats = await this.getStorageStatistics();

    return {
      totalUsers,
      totalDumps,
      totalReminders,
      activeUsers: recentUsers,
      averageProcessingTime: Number.parseFloat(
        averageProcessingTime.toFixed(2),
      ), // REAL DATA
      processingSuccessRate: Math.round(processingSuccessRate),
      dailyStats,
      storage: storageStats,
    };
  }

  /**
   * Get daily statistics for specified number of days
   */
  private async getDailyStatistics(
    days: number = 30,
  ): Promise<Array<{ date: string; dumps: number; users: number }>> {
    const stats: Array<{ date: string; dumps: number; users: number }> = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const [dumpsCount, usersCount] = await Promise.all([
        this.dumpRepository
          .createQueryBuilder('dump')
          .where('dump.created_at >= :date', { date })
          .andWhere('dump.created_at < :nextDate', { nextDate })
          .getCount(),
        this.userRepository
          .createQueryBuilder('user')
          .where('user.created_at >= :date', { date })
          .andWhere('user.created_at < :nextDate', { nextDate })
          .getCount(),
      ]);

      stats.push({
        date: date.toISOString().split('T')[0],
        dumps: dumpsCount,
        users: usersCount,
      });
    }

    return stats;
  }

  /**
   * Get storage statistics
   */
  private async getStorageStatistics() {
    // Query for dumps with media content
    const result = await this.dumpRepository
      .createQueryBuilder('dump')
      .select('dump.content_type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('dump.content_type IS NOT NULL')
      .groupBy('dump.content_type')
      .getRawMany();

    const totalMediaFiles = result.reduce(
      (sum, item) => sum + Number.parseInt(item.count, 10),
      0,
    );

    return {
      totalFiles: totalMediaFiles,
      byType: result.map((item) => ({
        type: item.type,
        count: Number.parseInt(item.count, 10),
      })),
      // Mock storage size (would need to track actual file sizes)
      totalSizeMB: totalMediaFiles * 0.8, // Assume 800KB average per file
    };
  }

  /**
   * Get flagged content for review
   */
  async getFlaggedContent(
    status?: string,
    priority?: string,
    limit: number = 50,
    userId?: string,
  ) {
    const queryBuilder = this.dumpRepository
      .createQueryBuilder('dump')
      .leftJoinAndSelect('dump.category', 'category')
      .leftJoinAndSelect('dump.user', 'user')
      .where('dump.ai_confidence < :threshold', { threshold: 70 })
      .orderBy('dump.ai_confidence', 'ASC')
      .limit(limit);

    // Filter by userId if provided
    if (userId) {
      queryBuilder.andWhere('dump.user_id = :userId', { userId });
    }

    const flaggedDumps = await queryBuilder.getMany();

    return flaggedDumps.map((dump) => ({
      id: dump.id,
      dump: {
        id: dump.id,
        rawContent: dump.raw_content,
        category: dump.category ? { name: dump.category.name } : null,
        aiConfidence: dump.ai_confidence,
      },
      priority: this.calculatePriority(dump.ai_confidence || 0),
      status: 'pending', // Would need a review_status table in production
      flaggedAt: dump.created_at,
      user: {
        id: dump.user?.id,
        phoneNumber: dump.user?.phone_number,
      },
    }));
  }

  /**
   * Calculate priority based on confidence score (0-100 scale)
   */
  private calculatePriority(
    confidence: number,
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (confidence < 30) return 'critical';
    if (confidence < 50) return 'high';
    if (confidence < 60) return 'medium';
    return 'low';
  }

  /**
   * Approve a flagged dump
   * Sets ai_confidence to 100 and updates any provided fields
   */
  async approveDump(
    dumpId: string,
    updates?: {
      raw_content?: string;
      category?: string; // Category name
      notes?: string;
    },
  ) {
    const dump = await this.dumpRepository.findOne({
      where: { id: dumpId },
      relations: ['category'],
    });

    if (!dump) {
      throw new Error('Dump not found');
    }

    // Set confidence to 100 to mark as reviewed and approved
    dump.ai_confidence = 100;

    // Update raw_content if provided
    if (updates?.raw_content !== undefined) {
      dump.raw_content = updates.raw_content;
    }

    // Update category if provided
    if (updates?.category) {
      const categoryRepository =
        this.dumpRepository.manager.getRepository('Category');
      const category = (await categoryRepository.findOne({
        where: { name: updates.category },
      })) as any;

      if (category) {
        dump.category_id = category.id;
      }
    }

    // Save the updated dump
    await this.dumpRepository.save(dump);

    return {
      success: true,
      message: 'Dump approved and updated',
      dumpId,
      updates: {
        raw_content: updates?.raw_content,
        category: updates?.category,
        ai_confidence: 100,
      },
      notes: updates?.notes,
    };
  }

  /**
   * Reject a flagged dump
   * Permanently deletes the dump from the database
   */
  async rejectDump(dumpId: string, reason: string, notes?: string) {
    const dump = await this.dumpRepository.findOne({ where: { id: dumpId } });

    if (!dump) {
      throw new Error('Dump not found');
    }

    // Delete the dump permanently
    await this.dumpRepository.remove(dump);

    return {
      success: true,
      message: 'Dump rejected and deleted',
      dumpId,
      reason,
      notes,
    };
  }

  /**
   * Get all dumps with pagination and optional search
   * Used by admin dashboard to view all dumps across all users
   */
  async getAllDumps(page: number = 1, limit: number = 50, search?: string) {
    const skip = (page - 1) * limit;

    const queryBuilder = this.dumpRepository
      .createQueryBuilder('dump')
      .leftJoinAndSelect('dump.category', 'category')
      .leftJoinAndSelect('dump.user', 'user')
      .orderBy('dump.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    // Add search filter if provided
    if (search) {
      queryBuilder.where(
        'dump.raw_content ILIKE :search OR dump.extracted_content ILIKE :search',
        { search: `%${search}%` },
      );
    }

    const [dumps, total] = await queryBuilder.getManyAndCount();

    return {
      dumps,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get all categories
   * Used by: ReviewPage for category selection dropdown
   */
  async getAllCategories() {
    const categories = await this.categoryRepository.find({
      where: { is_active: true },
      order: { name: 'ASC' },
    });

    return categories.map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description,
      color: category.color,
      icon: category.icon,
    }));
  }

  /**
   * Get search analytics and metrics (REAL DATA)
   */
  async getSearchMetrics() {
    const totalSearches = await this.searchMetricRepo.count();

    // Top 10 queries by frequency
    const topQueriesRaw = await this.searchMetricRepo
      .createQueryBuilder('metric')
      .select('metric.query_text', 'query')
      .addSelect('COUNT(*)', 'count')
      .groupBy('metric.query_text')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    const topQueries = topQueriesRaw.map((item) => ({
      query: item.query,
      count: Number.parseInt(item.count, 10),
    }));

    // Query distribution by search type
    const queryDistRaw = await this.searchMetricRepo
      .createQueryBuilder('metric')
      .select('metric.search_type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('metric.search_type')
      .getRawMany();

    const queryDistribution = queryDistRaw.map((item) => ({
      type: item.type,
      count: Number.parseInt(item.count, 10),
    }));

    // Average latency
    const avgLatencyResult = await this.searchMetricRepo
      .createQueryBuilder('metric')
      .select('AVG(metric.latency_ms)', 'avg')
      .getRawOne();

    const averageLatency = avgLatencyResult?.avg
      ? Number.parseFloat(avgLatencyResult.avg)
      : 0;

    // Latency by type with percentiles
    const latencyByTypeRaw = await this.searchMetricRepo
      .createQueryBuilder('metric')
      .select('metric.search_type', 'type')
      .addSelect('AVG(metric.latency_ms)', 'avgLatency')
      .addSelect(
        'PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY metric.latency_ms)',
        'p95',
      )
      .addSelect(
        'PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY metric.latency_ms)',
        'p99',
      )
      .groupBy('metric.search_type')
      .getRawMany();

    const latencyByType = latencyByTypeRaw.map((item) => ({
      type: item.type,
      avgLatency: Math.round(Number.parseFloat(item.avgLatency || '0')),
      p95: Math.round(Number.parseFloat(item.p95 || '0')),
      p99: Math.round(Number.parseFloat(item.p99 || '0')),
    }));

    // Success rate
    const successCount = await this.searchMetricRepo
      .createQueryBuilder('metric')
      .where('metric.success = true')
      .getCount();

    const successRate =
      totalSearches > 0 ? (successCount / totalSearches) * 100 : 0;

    return {
      totalSearches,
      topQueries,
      queryDistribution,
      averageLatency: Math.round(averageLatency),
      latencyByType,
      successRate: Number.parseFloat(successRate.toFixed(2)),
    };
  }

  /**
   * Get AI processing metrics (REAL DATA)
   */
  async getAIMetrics() {
    const totalProcessed = await this.aiMetricRepo.count();

    const successfullyProcessed = await this.aiMetricRepo
      .createQueryBuilder('metric')
      .where('metric.success = true')
      .getCount();

    const processingSuccessRate =
      totalProcessed > 0 ? (successfullyProcessed / totalProcessed) * 100 : 0;

    // Average confidence
    const avgConfidenceResult = await this.aiMetricRepo
      .createQueryBuilder('metric')
      .select('AVG(metric.confidence_score)', 'avg')
      .where('metric.confidence_score IS NOT NULL')
      .getRawOne();

    const averageConfidence = avgConfidenceResult?.avg
      ? Number.parseFloat(avgConfidenceResult.avg) / 100 // Convert to 0-1 scale
      : 0;

    // Confidence distribution
    const confidenceStats = await this.aiMetricRepo
      .createQueryBuilder('metric')
      .select(
        'CASE ' +
          "WHEN metric.confidence_score >= 90 THEN '0.9-1.0' " +
          "WHEN metric.confidence_score >= 80 THEN '0.8-0.9' " +
          "WHEN metric.confidence_score >= 70 THEN '0.7-0.8' " +
          "WHEN metric.confidence_score >= 60 THEN '0.6-0.7' " +
          "ELSE '0.0-0.6' END",
        'range',
      )
      .addSelect('COUNT(*)', 'count')
      .where('metric.confidence_score IS NOT NULL')
      .groupBy('range')
      .orderBy('range', 'DESC')
      .getRawMany();

    const confidenceDistribution = confidenceStats.map((item) => ({
      range: item.range,
      count: Number.parseInt(item.count, 10),
    }));

    // Category breakdown (from AI metrics metadata)
    const categoryBreakdown = await this.aiMetricRepo
      .createQueryBuilder('metric')
      .select("metric.metadata->>'categoryAssigned'", 'category')
      .addSelect('COUNT(*)', 'count')
      .addSelect('AVG(metric.confidence_score)', 'avgConfidence')
      .where("metric.metadata->>'categoryAssigned' IS NOT NULL")
      .groupBy("metric.metadata->>'categoryAssigned'")
      .orderBy('count', 'DESC')
      .getRawMany();

    const categoryStats = categoryBreakdown.map((item) => ({
      category: item.category,
      count: Number.parseInt(item.count, 10),
      avgConfidence: Number.parseFloat(item.avgConfidence || '0').toFixed(2),
    }));

    // Low confidence count
    const lowConfidenceCount = await this.aiMetricRepo
      .createQueryBuilder('metric')
      .where('metric.confidence_score < :threshold', { threshold: 70 })
      .getCount();

    return {
      totalProcessed,
      successfullyProcessed,
      processingSuccessRate: Math.round(processingSuccessRate),
      averageConfidence: Number.parseFloat(averageConfidence.toFixed(3)),
      confidenceDistribution,
      categoryBreakdown: categoryStats,
      lowConfidenceCount,
      needsReview: lowConfidenceCount,
    };
  }

  /**
   * Get user statistics (REAL ACTIVITY DATA)
   */
  async getUserStats() {
    const totalUsers = await this.userRepository.count();

    // Active users by feature usage (last 7, 30, 90 days)
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const [activeWeek, activeMonth, activeQuarter] = await Promise.all([
      this.featureUsageRepo
        .createQueryBuilder('usage')
        .select('COUNT(DISTINCT usage.user_id)', 'count')
        .where('usage.timestamp >= :sevenDaysAgo', { sevenDaysAgo })
        .andWhere('usage.user_id IS NOT NULL')
        .getRawOne()
        .then((r) => Number.parseInt(r?.count || '0', 10)),
      this.featureUsageRepo
        .createQueryBuilder('usage')
        .select('COUNT(DISTINCT usage.user_id)', 'count')
        .where('usage.timestamp >= :thirtyDaysAgo', { thirtyDaysAgo })
        .andWhere('usage.user_id IS NOT NULL')
        .getRawOne()
        .then((r) => Number.parseInt(r?.count || '0', 10)),
      this.featureUsageRepo
        .createQueryBuilder('usage')
        .select('COUNT(DISTINCT usage.user_id)', 'count')
        .where('usage.timestamp >= :ninetyDaysAgo', { ninetyDaysAgo })
        .andWhere('usage.user_id IS NOT NULL')
        .getRawOne()
        .then((r) => Number.parseInt(r?.count || '0', 10)),
    ]);

    // User registration trend (last 12 months)
    const monthlyRegistrations = await this.getMonthlyRegistrations(12);

    // Average dumps per user
    const totalDumps = await this.dumpRepository.count();
    const avgDumpsPerUser = totalUsers > 0 ? totalDumps / totalUsers : 0;

    return {
      totalUsers,
      activeWeek,
      activeMonth,
      activeQuarter,
      monthlyRegistrations,
      avgDumpsPerUser: Number.parseFloat(avgDumpsPerUser.toFixed(2)),
    };
  }

  /**
   * Get feature usage statistics (NEW)
   */
  async getFeatureStats() {
    const featureBreakdown = await this.featureUsageRepo
      .createQueryBuilder('usage')
      .select('usage.feature_type', 'feature')
      .addSelect('COUNT(*)', 'count')
      .groupBy('usage.feature_type')
      .orderBy('count', 'DESC')
      .getRawMany();

    const stats = featureBreakdown.map((item) => ({
      feature: item.feature,
      count: Number.parseInt(item.count, 10),
    }));

    // Total feature usage
    const totalUsage = stats.reduce((sum, item) => sum + item.count, 0);

    // Most popular feature (return just the feature name)
    const mostPopular = stats[0]?.feature || 'none';

    // Add percentage to breakdown
    const breakdown = stats.map((item) => ({
      feature: item.feature,
      count: item.count,
      percentage: totalUsage > 0 ? (item.count / totalUsage) * 100 : 0,
    }));

    return {
      totalUsage,
      mostPopular,
      breakdown,
    };
  }

  /**
   * Get monthly user registrations for the last N months
   */
  private async getMonthlyRegistrations(
    months: number,
  ): Promise<Array<{ month: string; count: number }>> {
    const result: Array<{ month: string; count: number }> = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);

      const count = await this.userRepository
        .createQueryBuilder('user')
        .where('user.created_at >= :date', { date })
        .andWhere('user.created_at < :nextMonth', { nextMonth })
        .getCount();

      result.push({
        month: date.toISOString().slice(0, 7), // YYYY-MM format
        count,
      });
    }

    return result;
  }
}
