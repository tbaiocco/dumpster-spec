import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dump } from '../../entities/dump.entity';
import { Reminder, ReminderType } from '../../entities/reminder.entity';
import { User } from '../../entities/user.entity';
import { ClaudeService } from '../ai/claude.service';
import { ReminderService } from '../reminders/reminder.service';

/**
 * Confidence level for contextual insights
 */
type ConfidenceLevel = 'high' | 'medium' | 'low';

/**
 * Type of contextual insight
 */
type InsightType = 'expiration' | 'deadline' | 'follow-up' | 'recurring-task' | 'preparation';

/**
 * Contextual insight extracted from user's dumps
 */
interface ContextualInsight {
  type: InsightType;
  title: string;
  description: string;
  suggestedDate: Date;
  confidence: ConfidenceLevel;
  relatedDumpIds: string[];
  reasoning: string;
}

/**
 * Analysis result from AI
 */
interface ProactiveAnalysisResult {
  insights: ContextualInsight[];
  summary: string;
  processingTimeMs: number;
}

/**
 * Service for proactive reminder generation based on user content analysis
 * 
 * This service uses AI to analyze user dumps and automatically suggest
 * contextual reminders (e.g., "Your passport expires in 3 months").
 */
@Injectable()
export class ProactiveService {
  private readonly logger = new Logger(ProactiveService.name);

  constructor(
    @InjectRepository(Dump)
    private readonly dumpRepository: Repository<Dump>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly claudeService: ClaudeService,
    private readonly reminderService: ReminderService,
  ) {}

  /**
   * Analyze user's dumps to extract proactive reminder opportunities
   */
  async analyzeUserContent(
    userId: string,
    options: {
      lookbackDays?: number;
      maxDumps?: number;
      categories?: string[];
      confidenceThreshold?: ConfidenceLevel;
    } = {},
  ): Promise<ProactiveAnalysisResult> {
    const startTime = Date.now();
    const {
      lookbackDays = 30,
      maxDumps = 100,
      categories,
      confidenceThreshold = 'medium',
    } = options;

    try {
      this.logger.log(`Analyzing content for user ${userId}`);

      // Fetch recent user dumps
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - lookbackDays);

      const queryBuilder = this.dumpRepository
        .createQueryBuilder('dump')
        .leftJoinAndSelect('dump.category', 'category')
        .where('dump.user_id = :userId', { userId })
        .andWhere('dump.created_at > :cutoffDate', { cutoffDate })
        .orderBy('dump.created_at', 'DESC')
        .take(maxDumps);

      if (categories && categories.length > 0) {
        queryBuilder.andWhere('category.name IN (:...categories)', { categories });
      }

      const dumps = await queryBuilder.getMany();

      if (dumps.length === 0) {
        return {
          insights: [],
          summary: 'No recent content found for analysis',
          processingTimeMs: Date.now() - startTime,
        };
      }

      // Prepare content for AI analysis
      const contentSummary = this.prepareDumpsForAnalysis(dumps);

      // Use Claude to extract contextual insights
      const insights = await this.extractInsightsWithAI(contentSummary, userId);

      // Filter by confidence threshold
      const filteredInsights = this.filterByConfidence(insights, confidenceThreshold);

      const summary = this.generateAnalysisSummary(filteredInsights, dumps.length);

      return {
        insights: filteredInsights,
        summary,
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error(`Failed to analyze user content: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Generate proactive reminders from insights and save them
   */
  async generateRemindersFromInsights(
    userId: string,
    insights: ContextualInsight[],
    options: {
      autoCreate?: boolean;
      notifyUser?: boolean;
    } = {},
  ): Promise<{ created: Reminder[]; suggestions: ContextualInsight[] }> {
    const { autoCreate = false } = options;

    const created: Reminder[] = [];
    const suggestions: ContextualInsight[] = [];

    for (const insight of insights) {
      try {
        if (autoCreate && insight.confidence === 'high') {
          // Automatically create high-confidence reminders
          const reminder = await this.reminderService.createReminder({
            userId,
            message: `${insight.title}\n\n${insight.description}`,
            reminderType: this.mapInsightTypeToReminderType(insight.type),
            scheduledFor: insight.suggestedDate,
            aiConfidence: 85, // High confidence from proactive analysis
          });

          created.push(reminder);
          this.logger.log(`Auto-created proactive reminder: ${insight.title}`);
        } else {
          // Add to suggestions for user review
          suggestions.push(insight);
        }
      } catch (error) {
        this.logger.warn(`Failed to create reminder from insight: ${error.message}`);
        suggestions.push(insight); // Fall back to suggestion
      }
    }

    return { created, suggestions };
  }

  /**
   * Run proactive analysis for all active users
   * (Called by cron job)
   */
  async runDailyProactiveAnalysis(): Promise<{
    usersProcessed: number;
    remindersCreated: number;
    suggestionsGenerated: number;
  }> {
    this.logger.log('Starting daily proactive analysis for all users');

    const users = await this.userRepository.find();

    let remindersCreated = 0;
    let suggestionsGenerated = 0;

    for (const user of users) {
      try {
        // Analyze user content
        const analysis = await this.analyzeUserContent(user.id, {
          lookbackDays: 7,
          maxDumps: 50,
          confidenceThreshold: 'medium',
        });

        // Generate reminders from insights
        const result = await this.generateRemindersFromInsights(
          user.id,
          analysis.insights,
          {
            autoCreate: true, // Auto-create high-confidence ones
            notifyUser: true,
          },
        );

        remindersCreated += result.created.length;
        suggestionsGenerated += result.suggestions.length;

        this.logger.log(
          `User ${user.id}: Created ${result.created.length} reminders, ${result.suggestions.length} suggestions`,
        );
      } catch (error) {
        this.logger.error(`Failed to process user ${user.id}: ${error.message}`);
      }
    }

    this.logger.log(
      `Daily proactive analysis complete: ${users.length} users, ${remindersCreated} reminders, ${suggestionsGenerated} suggestions`,
    );

    return {
      usersProcessed: users.length,
      remindersCreated,
      suggestionsGenerated,
    };
  }

  /**
   * Get proactive suggestions for a user (not yet created as reminders)
   */
  async getProactiveSuggestions(userId: string): Promise<ContextualInsight[]> {
    const analysis = await this.analyzeUserContent(userId, {
      lookbackDays: 14,
      maxDumps: 50,
      confidenceThreshold: 'medium',
    });

    return analysis.insights;
  }

  /**
   * Prepare dumps for AI analysis
   */
  private prepareDumpsForAnalysis(dumps: Dump[]): string {
    const dumpSummaries = dumps.map((dump, index) => {
      const category = dump.category?.name || 'Uncategorized';
      const content = dump.raw_content?.substring(0, 500) || ''; // Limit content length
      const entities = dump.extracted_entities ? JSON.stringify(dump.extracted_entities) : '';

      return `[${index + 1}] Dump ${dump.id.substring(0, 8)}
Category: ${category}
Type: ${dump.content_type}
Date: ${dump.created_at.toISOString()}
Content: ${content}
Entities: ${entities}
---`;
    });

    return dumpSummaries.join('\n\n');
  }

  /**
   * Use Claude AI to extract contextual insights
   */
  private async extractInsightsWithAI(
    contentSummary: string,
    userId: string,
  ): Promise<ContextualInsight[]> {
    const systemPrompt = `You are a proactive assistant analyzing user content to identify opportunities for helpful reminders.

Your task is to identify:
1. **Expiration dates**: Passports, licenses, subscriptions, warranties
2. **Deadlines**: Projects, bills, appointments
3. **Follow-ups**: Tasks that need checking back (e.g., "waiting for response")
4. **Recurring tasks**: Regular activities mentioned multiple times
5. **Preparation needs**: Events requiring advance preparation

For each insight, provide:
- type: One of [expiration, deadline, follow-up, recurring-task, preparation]
- title: Short, actionable reminder title
- description: Context and details
- suggestedDate: When to remind (ISO format)
- confidence: high/medium/low based on clarity of information
- relatedDumpIds: Array of dump IDs that support this insight
- reasoning: Why this reminder would be helpful

Return valid JSON array of insights.`;

    const userPrompt = `Analyze this user content and suggest proactive reminders:

${contentSummary}

Return insights as JSON array.`;

    try {
      const response = await this.claudeService.analyzeContent({
        content: userPrompt,
        contentType: 'text',
        context: {
          source: 'telegram',
          userId,
          timestamp: new Date(),
        },
      });

      // Try to parse insights from the summary or use fallback
      const summary = response.summary || '';
      const jsonMatch = summary.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        this.logger.warn('AI response did not contain valid JSON array');
        return [];
      }

      const insights = JSON.parse(jsonMatch[0]) as ContextualInsight[];
      return insights;
    } catch (error) {
      this.logger.error(`Failed to extract insights with AI: ${error.message}`);
      return [];
    }
  }

  /**
   * Filter insights by confidence threshold
   */
  private filterByConfidence(
    insights: ContextualInsight[],
    threshold: ConfidenceLevel,
  ): ContextualInsight[] {
    const confidenceOrder = { high: 3, medium: 2, low: 1 };
    const minConfidence = confidenceOrder[threshold];

    return insights.filter(
      (insight) => confidenceOrder[insight.confidence] >= minConfidence,
    );
  }

  /**
   * Generate analysis summary
   */
  private generateAnalysisSummary(
    insights: ContextualInsight[],
    totalDumps: number,
  ): string {
    const byType = insights.reduce(
      (acc, insight) => {
        acc[insight.type] = (acc[insight.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const typesSummary = Object.entries(byType)
      .map(([type, count]) => `${count} ${type}`)
      .join(', ');

    return `Analyzed ${totalDumps} dumps, found ${insights.length} proactive opportunities: ${typesSummary || 'none'}`;
  }

  /**
   * Map insight type to reminder type
   */
  private mapInsightTypeToReminderType(insightType: InsightType): ReminderType {
    switch (insightType) {
      case 'expiration':
      case 'deadline':
        return ReminderType.DEADLINE;
      case 'follow-up':
        return ReminderType.FOLLOW_UP;
      case 'recurring-task':
        return ReminderType.RECURRING;
      case 'preparation':
      default:
        return ReminderType.FOLLOW_UP;
    }
  }

  /**
   * Check if a dump might need a proactive reminder
   * (Quick check without full AI analysis)
   */
  async quickCheckDump(dump: Dump): Promise<ContextualInsight | null> {
    // Look for common patterns in content
    const content = (dump.raw_content || '').toLowerCase();

    // Check for expiration-related keywords
    const expirationKeywords = [
      'expires',
      'expiry',
      'expiration',
      'valid until',
      'renewal',
      'renew',
    ];
    const hasExpiration = expirationKeywords.some((keyword) =>
      content.includes(keyword),
    );

    if (hasExpiration) {
      // Extract potential dates (simplified)
      const datePattern = /\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2}/g;
      const dates = content.match(datePattern);

      if (dates && dates.length > 0) {
        return {
          type: 'expiration',
          title: `Check expiration: Document ${dump.id.substring(0, 8)}`,
          description: `This item may have an expiration date: ${dates[0]}`,
          suggestedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
          confidence: 'medium',
          relatedDumpIds: [dump.id],
          reasoning: 'Contains expiration-related keywords and date patterns',
        };
      }
    }

    return null;
  }
}
