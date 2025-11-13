import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dump } from '../../entities/dump.entity';
import { User } from '../../entities/user.entity';
import { Reminder } from '../../entities/reminder.entity';

/**
 * Admin Service
 * Provides analytics and metrics for the admin dashboard
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

    const processingSuccessRate = totalDumps > 0 
      ? (categorizedDumps / totalDumps) * 100 
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
      averageProcessingTime: 2.3, // Mock value in seconds
      processingSuccessRate: Math.round(processingSuccessRate),
      dailyStats,
      storage: storageStats,
    };
  }

  /**
   * Get daily statistics for specified number of days
   */
  private async getDailyStatistics(days: number = 30): Promise<Array<{ date: string; dumps: number; users: number }>> {
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

    const totalMediaFiles = result.reduce((sum, item) => sum + Number.parseInt(item.count, 10), 0);

    return {
      totalFiles: totalMediaFiles,
      byType: result.map(item => ({
        type: item.type,
        count: Number.parseInt(item.count, 10),
      })),
      // Mock storage size (would need to track actual file sizes)
      totalSizeMB: totalMediaFiles * 0.8, // Assume 800KB average per file
    };
  }

  /**
   * Get search analytics and metrics
   */
  async getSearchMetrics() {
    // In a real implementation, this would query a search_logs table
    // For now, we'll provide mock data based on dumps
    
    const totalDumps = await this.dumpRepository.count();
    
    // Category distribution (proxy for search queries)
    const categoryStats = await this.dumpRepository
      .createQueryBuilder('dump')
      .leftJoinAndSelect('dump.category', 'category')
      .select('category.name', 'category')
      .addSelect('COUNT(*)', 'count')
      .where('category.name IS NOT NULL')
      .groupBy('category.name')
      .getRawMany();

    const sortedStats = [...categoryStats].sort((a, b) => Number.parseInt(b.count, 10) - Number.parseInt(a.count, 10));
    const topQueries = sortedStats
      .slice(0, 10)
      .map(item => ({
        query: item.category,
        count: Number.parseInt(item.count, 10),
      }));

    // Search type distribution
    const queryDistribution = [
      { type: 'Vector Search', count: Math.floor(totalDumps * 0.6) },
      { type: 'Full-Text Search', count: Math.floor(totalDumps * 0.25) },
      { type: 'Hybrid Search', count: Math.floor(totalDumps * 0.15) },
    ];

    // Performance metrics (mock data)
    const latencyByType = [
      { type: 'Vector', avgLatency: 85, p95: 120, p99: 180 },
      { type: 'Full-Text', avgLatency: 45, p95: 80, p99: 120 },
      { type: 'Hybrid', avgLatency: 110, p95: 160, p99: 220 },
    ];

    return {
      totalSearches: totalDumps, // Mock: using dumps count as proxy
      topQueries,
      queryDistribution,
      averageLatency: 78, // ms
      latencyByType,
      successRate: 94.5, // percentage
    };
  }

  /**
   * Get AI processing metrics
   */
  async getAIMetrics() {
    // Total dumps processed
    const totalDumps = await this.dumpRepository.count();

    // Dumps with categories (successfully processed)
    const categorizedDumps = await this.dumpRepository
      .createQueryBuilder('dump')
      .where('dump.category_id IS NOT NULL')
      .getCount();

    // Confidence distribution
    const confidenceStats = await this.dumpRepository
      .createQueryBuilder('dump')
      .select(
        "CASE " +
        "WHEN dump.ai_confidence >= 90 THEN '0.9-1.0' " +
        "WHEN dump.ai_confidence >= 80 THEN '0.8-0.9' " +
        "WHEN dump.ai_confidence >= 70 THEN '0.7-0.8' " +
        "WHEN dump.ai_confidence >= 60 THEN '0.6-0.7' " +
        "ELSE '0.0-0.6' END",
        'range'
      )
      .addSelect('COUNT(*)', 'count')
      .where('dump.ai_confidence IS NOT NULL')
      .groupBy('range')
      .orderBy('range', 'DESC')
      .getRawMany();

    const confidenceDistribution = confidenceStats.map(item => ({
      range: item.range,
      count: Number.parseInt(item.count, 10),
    }));

    // Category breakdown
    const categoryBreakdown = await this.dumpRepository
      .createQueryBuilder('dump')
      .leftJoinAndSelect('dump.category', 'category')
      .select('category.name', 'category')
      .addSelect('COUNT(*)', 'count')
      .addSelect('AVG(dump.ai_confidence)', 'avgConfidence')
      .where('category.name IS NOT NULL')
      .groupBy('category.name')
      .orderBy('count', 'DESC')
      .getRawMany();

    const categoryStats = categoryBreakdown.map(item => ({
      category: item.category,
      count: Number.parseInt(item.count, 10),
      avgConfidence: Number.parseFloat(item.avgConfidence).toFixed(2),
    }));

    // Calculate average confidence
    const avgConfidenceResult = await this.dumpRepository
      .createQueryBuilder('dump')
      .select('AVG(dump.ai_confidence)', 'avg')
      .where('dump.ai_confidence IS NOT NULL')
      .getRawOne();

    const averageConfidence = avgConfidenceResult.avg 
      ? Number.parseFloat(avgConfidenceResult.avg) / 100 // Convert from 0-100 to 0-1
      : 0;

    // Processing success rate
    const processingSuccessRate = totalDumps > 0 
      ? (categorizedDumps / totalDumps) * 100 
      : 0;

    // Low confidence dumps (flagged for review) - confidence stored as 0-100
    const lowConfidenceDumps = await this.dumpRepository
      .createQueryBuilder('dump')
      .where('dump.ai_confidence < :threshold', { threshold: 70 })
      .getCount();

    return {
      totalProcessed: totalDumps,
      successfullyProcessed: categorizedDumps,
      processingSuccessRate: Math.round(processingSuccessRate),
      averageConfidence: Number.parseFloat(averageConfidence.toFixed(3)),
      confidenceDistribution,
      categoryBreakdown: categoryStats,
      lowConfidenceCount: lowConfidenceDumps,
      needsReview: lowConfidenceDumps,
    };
  }

  /**
   * Get user statistics
   */
  async getUserStats() {
    const totalUsers = await this.userRepository.count();
    
    // Users by activity (last 7, 30, 90 days) - using created_at as proxy
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const [activeWeek, activeMonth, activeQuarter] = await Promise.all([
      this.userRepository
        .createQueryBuilder('user')
        .where('user.created_at >= :sevenDaysAgo', { sevenDaysAgo })
        .getCount(),
      this.userRepository
        .createQueryBuilder('user')
        .where('user.created_at >= :thirtyDaysAgo', { thirtyDaysAgo })
        .getCount(),
      this.userRepository
        .createQueryBuilder('user')
        .where('user.created_at >= :ninetyDaysAgo', { ninetyDaysAgo })
        .getCount(),
    ]);

    // User registration trend (last 12 months)
    const monthlyRegistrations = await this.getMonthlyRegistrations(12);

    return {
      totalUsers,
      activeWeek,
      activeMonth,
      activeQuarter,
      monthlyRegistrations,
    };
  }

  /**
   * Get monthly user registrations
   */
  private async getMonthlyRegistrations(months: number = 12): Promise<Array<{ month: string; count: number }>> {
    const stats: Array<{ month: string; count: number }> = [];
    const today = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const startDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const endDate = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);

      const count = await this.userRepository
        .createQueryBuilder('user')
        .where('user.created_at >= :startDate', { startDate })
        .andWhere('user.created_at <= :endDate', { endDate })
        .getCount();

      stats.push({
        month: startDate.toISOString().substring(0, 7), // YYYY-MM format
        count,
      });
    }

    return stats;
  }

  /**
   * Get flagged content for review
   */
  async getFlaggedContent(status?: string, priority?: string, limit: number = 50) {
    const queryBuilder = this.dumpRepository
      .createQueryBuilder('dump')
      .leftJoinAndSelect('dump.category', 'category')
      .leftJoinAndSelect('dump.user', 'user')
      .where('dump.ai_confidence < :threshold', { threshold: 70 })
      .orderBy('dump.ai_confidence', 'ASC')
      .limit(limit);

    const flaggedDumps = await queryBuilder.getMany();

    return flaggedDumps.map(dump => ({
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
  private calculatePriority(confidence: number): 'low' | 'medium' | 'high' | 'critical' {
    if (confidence < 30) return 'critical';
    if (confidence < 50) return 'high';
    if (confidence < 60) return 'medium';
    return 'low';
  }

  /**
   * Approve a flagged dump
   */
  async approveDump(dumpId: string, notes?: string) {
    // In production, this would update a review_status table
    // For now, we'll just verify the dump exists
    const dump = await this.dumpRepository.findOne({ where: { id: dumpId } });
    
    if (!dump) {
      throw new Error('Dump not found');
    }

    // Could update a flag or create an audit log entry here
    return {
      success: true,
      message: 'Dump approved',
      dumpId,
      notes,
    };
  }

  /**
   * Reject a flagged dump
   */
  async rejectDump(dumpId: string, reason: string, notes?: string) {
    // In production, this would update a review_status table
    const dump = await this.dumpRepository.findOne({ where: { id: dumpId } });
    
    if (!dump) {
      throw new Error('Dump not found');
    }

    // Could mark as rejected or soft-delete here
    return {
      success: true,
      message: 'Dump rejected',
      dumpId,
      reason,
      notes,
    };
  }
}
