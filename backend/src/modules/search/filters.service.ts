import { Injectable, Logger } from '@nestjs/common';
import { SelectQueryBuilder } from 'typeorm';
import { Dump, ContentType } from '../../entities/dump.entity';
import { SearchFilters } from './search.service';

@Injectable()
export class FiltersService {
  private readonly logger = new Logger(FiltersService.name);

  /**
   * Apply search filters to a TypeORM query builder
   */
  applyFilters(
    queryBuilder: SelectQueryBuilder<Dump>,
    filters: SearchFilters,
  ): SelectQueryBuilder<Dump> {
    let query = queryBuilder;

    // Content type filter
    if (filters.contentTypes && filters.contentTypes.length > 0) {
      const mappedTypes = filters.contentTypes.map((type) =>
        this.mapContentTypeToEnum(type),
      );
      query = query.andWhere('dump.content_type IN (:...contentTypes)', {
        contentTypes: mappedTypes,
      });
    }

    // Category filter
    if (filters.categories && filters.categories.length > 0) {
      query = query.andWhere('category.name IN (:...categories)', {
        categories: filters.categories,
      });
    }

    // Date range filter
    if (filters.dateFrom) {
      query = query.andWhere('dump.created_at >= :dateFrom', {
        dateFrom: filters.dateFrom,
      });
    }

    if (filters.dateTo) {
      query = query.andWhere('dump.created_at <= :dateTo', {
        dateTo: filters.dateTo,
      });
    }

    // AI confidence filter
    if (filters.minConfidence !== undefined) {
      query = query.andWhere('dump.ai_confidence >= :minConfidence', {
        minConfidence: filters.minConfidence,
      });
    }

    // Urgency levels filter
    if (filters.urgencyLevels && filters.urgencyLevels.length > 0) {
      query = query.andWhere('dump.urgency_level IN (:...urgencyLevels)', {
        urgencyLevels: filters.urgencyLevels,
      });
    }

    // Include processing status filter
    if (filters.includeProcessing === false) {
      query = query.andWhere('dump.processing_status = :status', {
        status: 'completed',
      });
    } else if (filters.includeProcessing === true) {
      // Include all processing statuses (no additional filter needed)
    }

    return query;
  }

  /**
   * Apply advanced filters for power users
   */
  applyAdvancedFilters(
    queryBuilder: SelectQueryBuilder<Dump>,
    filters: SearchFilters & {
      hasReminders?: boolean;
      hasMediaUrl?: boolean;
      processingStatusFilter?: (
        | 'received'
        | 'processing'
        | 'completed'
        | 'failed'
      )[];
      entityTypes?: string[];
      confidenceRange?: { min: number; max: number };
      wordCountRange?: { min: number; max: number };
    },
  ): SelectQueryBuilder<Dump> {
    let query = this.applyFilters(queryBuilder, filters);

    // Has reminders filter
    if (filters.hasReminders !== undefined) {
      if (filters.hasReminders) {
        query = query.innerJoin('dump.reminders', 'reminder');
      } else {
        query = query
          .leftJoin('dump.reminders', 'reminder')
          .andWhere('reminder.id IS NULL');
      }
    }

    // Has media URL filter
    if (filters.hasMediaUrl !== undefined) {
      if (filters.hasMediaUrl) {
        query = query.andWhere(
          "dump.media_url IS NOT NULL AND dump.media_url != ''",
        );
      } else {
        query = query.andWhere(
          "(dump.media_url IS NULL OR dump.media_url = '')",
        );
      }
    }

    // Processing status filter
    if (
      filters.processingStatusFilter &&
      filters.processingStatusFilter.length > 0
    ) {
      query = query.andWhere(
        'dump.processing_status IN (:...processingStatuses)',
        {
          processingStatuses: filters.processingStatusFilter,
        },
      );
    }

    // Entity types filter (search in extracted_entities JSONB)
    if (filters.entityTypes && filters.entityTypes.length > 0) {
      const entityConditions = filters.entityTypes.map(
        (entityType, index) => `dump.extracted_entities ? :entityType${index}`,
      );

      if (entityConditions.length > 0) {
        query = query.andWhere(
          `(${entityConditions.join(' OR ')})`,
          Object.fromEntries(
            filters.entityTypes.map((type, index) => [
              `entityType${index}`,
              type,
            ]),
          ),
        );
      }
    }

    // Confidence range filter
    if (filters.confidenceRange) {
      if (filters.confidenceRange.min !== undefined) {
        query = query.andWhere('dump.ai_confidence >= :minConf', {
          minConf: filters.confidenceRange.min,
        });
      }
      if (filters.confidenceRange.max !== undefined) {
        query = query.andWhere('dump.ai_confidence <= :maxConf', {
          maxConf: filters.confidenceRange.max,
        });
      }
    }

    // Word count range filter (approximate using LENGTH)
    if (filters.wordCountRange) {
      if (filters.wordCountRange.min !== undefined) {
        query = query.andWhere('LENGTH(dump.raw_content) >= :minWords', {
          minWords: filters.wordCountRange.min * 5, // Rough approximation: 5 chars per word
        });
      }
      if (filters.wordCountRange.max !== undefined) {
        query = query.andWhere('LENGTH(dump.raw_content) <= :maxWords', {
          maxWords: filters.wordCountRange.max * 5,
        });
      }
    }

    return query;
  }

  /**
   * Create filter suggestions based on user's data
   */
  async generateFilterSuggestions(
    userId: string,
    queryBuilder: SelectQueryBuilder<Dump>,
  ): Promise<{
    categories: string[];
    contentTypes: string[];
    urgencyLevels: number[];
    dateRanges: { label: string; from: Date; to?: Date }[];
    entityTypes: string[];
  }> {
    try {
      // Get available categories
      const categories = await queryBuilder
        .clone()
        .select('DISTINCT category.name', 'category')
        .innerJoin('dump.category', 'category')
        .where('dump.user_id = :userId', { userId })
        .andWhere('category.name IS NOT NULL')
        .orderBy('category.name')
        .getRawMany();

      // Get available content types
      const contentTypes = await queryBuilder
        .clone()
        .select('DISTINCT dump.content_type', 'contentType')
        .where('dump.user_id = :userId', { userId })
        .orderBy('dump.content_type')
        .getRawMany();

      // Get available urgency levels
      const urgencyLevels = await queryBuilder
        .clone()
        .select('DISTINCT dump.urgency_level', 'urgencyLevel')
        .where('dump.user_id = :userId', { userId })
        .andWhere('dump.urgency_level IS NOT NULL')
        .orderBy('dump.urgency_level', 'DESC')
        .getRawMany();

      // Generate common date ranges
      const now = new Date();
      const dateRanges = [
        {
          label: 'Today',
          from: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        },
        {
          label: 'This Week',
          from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        },
        {
          label: 'This Month',
          from: new Date(now.getFullYear(), now.getMonth(), 1),
        },
        {
          label: 'Last 3 Months',
          from: new Date(now.getFullYear(), now.getMonth() - 3, 1),
        },
      ];

      // Get common entity types from extracted_entities
      const entityTypesResult = await queryBuilder
        .clone()
        .select('dump.extracted_entities')
        .where('dump.user_id = :userId', { userId })
        .andWhere('dump.extracted_entities IS NOT NULL')
        .getMany();

      const entityTypeSet = new Set<string>();
      for (const dump of entityTypesResult) {
        if (
          dump.extracted_entities &&
          typeof dump.extracted_entities === 'object'
        ) {
          for (const key of Object.keys(dump.extracted_entities)) {
            entityTypeSet.add(key);
          }
        }
      }

      return {
        categories: categories.map((c) => c.category).filter(Boolean),
        contentTypes: contentTypes.map((c) => c.contentType).filter(Boolean),
        urgencyLevels: urgencyLevels.map((u) => u.urgencyLevel).filter(Boolean),
        dateRanges,
        entityTypes: Array.from(entityTypeSet).slice(0, 10), // Limit to top 10
      };
    } catch (error) {
      this.logger.error('Failed to generate filter suggestions:', error);
      return {
        categories: [],
        contentTypes: [],
        urgencyLevels: [],
        dateRanges: [],
        entityTypes: [],
      };
    }
  }

  /**
   * Validate filter values
   */
  validateFilters(filters: SearchFilters): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Validate content types
    if (filters.contentTypes) {
      const validContentTypes = ['text', 'voice', 'image', 'email'];
      for (const contentType of filters.contentTypes) {
        if (!validContentTypes.includes(contentType)) {
          errors.push(`Invalid content type: ${contentType}`);
        }
      }
    }

    // Validate date range
    if (filters.dateFrom && filters.dateTo) {
      if (filters.dateFrom > filters.dateTo) {
        errors.push('Date from must be before date to');
      }
    }

    // Validate confidence range
    if (filters.minConfidence !== undefined) {
      if (filters.minConfidence < 1 || filters.minConfidence > 5) {
        errors.push('Minimum confidence must be between 1 and 5');
      }
    }

    // Validate urgency levels
    if (filters.urgencyLevels) {
      for (const level of filters.urgencyLevels) {
        if (level < 1 || level > 5) {
          errors.push(
            `Invalid urgency level: ${level}. Must be between 1 and 5`,
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Build dynamic filters from query parameters
   */
  buildFiltersFromQuery(queryParams: Record<string, any>): SearchFilters {
    const filters: SearchFilters = {};

    // Content types
    if (queryParams.contentTypes) {
      const types = Array.isArray(queryParams.contentTypes)
        ? queryParams.contentTypes
        : [queryParams.contentTypes];
      filters.contentTypes = types.filter((t) =>
        ['text', 'voice', 'image', 'email'].includes(t),
      );
    }

    // Categories
    if (queryParams.categories) {
      const cats = Array.isArray(queryParams.categories)
        ? queryParams.categories
        : [queryParams.categories];
      filters.categories = cats.filter(Boolean);
    }

    // Date range
    if (queryParams.dateFrom) {
      try {
        filters.dateFrom = new Date(queryParams.dateFrom);
      } catch {
        // Invalid date, ignore
      }
    }

    if (queryParams.dateTo) {
      try {
        filters.dateTo = new Date(queryParams.dateTo);
      } catch {
        // Invalid date, ignore
      }
    }

    // Confidence
    if (queryParams.minConfidence) {
      const confidence = Number.parseInt(queryParams.minConfidence, 10);
      if (!Number.isNaN(confidence) && confidence >= 1 && confidence <= 5) {
        filters.minConfidence = confidence;
      }
    }

    // Urgency levels
    if (queryParams.urgencyLevels) {
      const levels = Array.isArray(queryParams.urgencyLevels)
        ? queryParams.urgencyLevels
        : [queryParams.urgencyLevels];
      filters.urgencyLevels = levels
        .map((l) => Number.parseInt(l, 10))
        .filter((l) => !Number.isNaN(l) && l >= 1 && l <= 5);
    }

    // Include processing
    if (queryParams.includeProcessing !== undefined) {
      filters.includeProcessing = queryParams.includeProcessing === 'true';
    }

    return filters;
  }

  /**
   * Map API content type to entity enum
   */
  private mapContentTypeToEnum(contentType: string): ContentType {
    switch (contentType) {
      case 'text':
        return ContentType.TEXT;
      case 'voice':
        return ContentType.VOICE;
      case 'image':
        return ContentType.IMAGE;
      case 'email':
        return ContentType.EMAIL;
      default:
        return ContentType.TEXT;
    }
  }

  /**
   * Get filter statistics for analytics
   */
  async getFilterStats(
    userId: string,
    queryBuilder: SelectQueryBuilder<Dump>,
  ): Promise<{
    totalDumps: number;
    contentTypeBreakdown: Record<string, number>;
    categoryBreakdown: Record<string, number>;
    urgencyBreakdown: Record<number, number>;
    confidenceBreakdown: Record<number, number>;
    processingStatusBreakdown: Record<string, number>;
  }> {
    try {
      // Get total count
      const totalDumps = await queryBuilder
        .clone()
        .where('dump.user_id = :userId', { userId })
        .getCount();

      // Content type breakdown
      const contentTypeStats = await queryBuilder
        .clone()
        .select(['dump.content_type', 'COUNT(*) as count'])
        .where('dump.user_id = :userId', { userId })
        .groupBy('dump.content_type')
        .getRawMany();

      // Category breakdown
      const categoryStats = await queryBuilder
        .clone()
        .select(['category.name', 'COUNT(*) as count'])
        .innerJoin('dump.category', 'category')
        .where('dump.user_id = :userId', { userId })
        .groupBy('category.name')
        .getRawMany();

      // Urgency breakdown
      const urgencyStats = await queryBuilder
        .clone()
        .select(['dump.urgency_level', 'COUNT(*) as count'])
        .where('dump.user_id = :userId', { userId })
        .andWhere('dump.urgency_level IS NOT NULL')
        .groupBy('dump.urgency_level')
        .getRawMany();

      // Confidence breakdown
      const confidenceStats = await queryBuilder
        .clone()
        .select(['dump.ai_confidence', 'COUNT(*) as count'])
        .where('dump.user_id = :userId', { userId })
        .andWhere('dump.ai_confidence IS NOT NULL')
        .groupBy('dump.ai_confidence')
        .getRawMany();

      // Processing status breakdown
      const statusStats = await queryBuilder
        .clone()
        .select(['dump.processing_status', 'COUNT(*) as count'])
        .where('dump.user_id = :userId', { userId })
        .groupBy('dump.processing_status')
        .getRawMany();

      return {
        totalDumps,
        contentTypeBreakdown: Object.fromEntries(
          contentTypeStats.map((s) => [
            s.dump_content_type,
            Number.parseInt(s.count, 10),
          ]),
        ),
        categoryBreakdown: Object.fromEntries(
          categoryStats.map((s) => [
            s.category_name,
            Number.parseInt(s.count, 10),
          ]),
        ),
        urgencyBreakdown: Object.fromEntries(
          urgencyStats.map((s) => [
            s.dump_urgency_level,
            Number.parseInt(s.count, 10),
          ]),
        ),
        confidenceBreakdown: Object.fromEntries(
          confidenceStats.map((s) => [
            s.dump_ai_confidence,
            Number.parseInt(s.count, 10),
          ]),
        ),
        processingStatusBreakdown: Object.fromEntries(
          statusStats.map((s) => [
            s.dump_processing_status,
            Number.parseInt(s.count, 10),
          ]),
        ),
      };
    } catch (error) {
      this.logger.error('Failed to get filter statistics:', error);
      return {
        totalDumps: 0,
        contentTypeBreakdown: {},
        categoryBreakdown: {},
        urgencyBreakdown: {},
        confidenceBreakdown: {},
        processingStatusBreakdown: {},
      };
    }
  }
}
