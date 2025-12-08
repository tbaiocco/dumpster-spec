import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dump } from '../../entities/dump.entity';
import { Reminder, ReminderType } from '../../entities/reminder.entity';
import { User } from '../../entities/user.entity';
import { ClaudeService } from '../ai/claude.service';
import { ReminderService } from '../reminders/reminder.service';
import { TrackingService } from '../tracking/tracking.service';
import { TrackingType } from '../../entities/trackable-item.entity';

/**
 * Confidence level for contextual insights
 */
type ConfidenceLevel = 'high' | 'medium' | 'low';

/**
 * Type of contextual insight
 */
type InsightType =
  | 'expiration'
  | 'deadline'
  | 'follow-up'
  | 'recurring-task'
  | 'preparation';

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
    private readonly trackingService: TrackingService,
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
        queryBuilder.andWhere('category.name IN (:...categories)', {
          categories,
        });
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
      const filteredInsights = this.filterByConfidence(
        insights,
        confidenceThreshold,
      );

      const summary = this.generateAnalysisSummary(
        filteredInsights,
        dumps.length,
      );

      return {
        insights: filteredInsights,
        summary,
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error(
        `Failed to analyze user content: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Analyze user content from pre-fetched dumps (optimized for cron jobs)
   * Avoids duplicate database queries
   */
  private async analyzeUserContentFromDumps(
    dumps: Dump[],
    userId: string,
  ): Promise<ProactiveAnalysisResult> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `Analyzing ${dumps.length} pre-fetched dumps for user ${userId}`,
      );

      if (dumps.length === 0) {
        return {
          insights: [],
          summary: 'No content provided for analysis',
          processingTimeMs: Date.now() - startTime,
        };
      }

      // Prepare content for AI analysis
      const contentSummary = this.prepareDumpsForAnalysis(dumps);

      // Use Claude to extract contextual insights
      const insights = await this.extractInsightsWithAI(contentSummary, userId);

      // Filter by medium confidence threshold (suitable for daily analysis)
      const filteredInsights = this.filterByConfidence(insights, 'medium');

      const summary = this.generateAnalysisSummary(
        filteredInsights,
        dumps.length,
      );

      return {
        insights: filteredInsights,
        summary,
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error(
        `Failed to analyze user content from dumps: ${error.message}`,
        error.stack,
      );
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
          // Use the first related dump ID as the primary source
          const primaryDumpId =
            insight.relatedDumpIds && insight.relatedDumpIds.length > 0
              ? insight.relatedDumpIds[0]
              : undefined;

          const reminder = await this.reminderService.createReminder({
            userId,
            dumpId: primaryDumpId, // Link reminder to the dump that generated it
            message: `${insight.title}\n\n${insight.description}`,
            reminderType: this.mapInsightTypeToReminderType(insight.type),
            scheduledFor: insight.suggestedDate,
            aiConfidence: 85, // High confidence from proactive analysis
          });

          created.push(reminder);
          this.logger.log(
            `Auto-created proactive reminder: ${insight.title} (linked to dump ${primaryDumpId || 'none'})`,
          );
        } else {
          // Add to suggestions for user review
          suggestions.push(insight);
        }
      } catch (error) {
        this.logger.warn(
          `Failed to create reminder from insight: ${error.message}`,
        );
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
    trackingItemsCreated: number;
  }> {
    this.logger.log('Starting daily proactive analysis for all users');

    const users = await this.userRepository.find();

    let remindersCreated = 0;
    let suggestionsGenerated = 0;
    let trackingItemsCreated = 0;

    for (const user of users) {
      try {
        // Get recent dumps for analysis (last 7 days) - single query
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 7);

        const dumps = await this.dumpRepository
          .createQueryBuilder('dump')
          .leftJoinAndSelect('dump.category', 'category')
          .where('dump.user_id = :userId', { userId: user.id })
          .andWhere('dump.created_at > :cutoffDate', { cutoffDate })
          .orderBy('dump.created_at', 'DESC')
          .take(50)
          .getMany();

        if (dumps.length === 0) {
          this.logger.log(`User ${user.id}: No recent dumps to analyze`);
          continue;
        }

        // Analyze user content for reminders using pre-fetched dumps
        const analysis = await this.analyzeUserContentFromDumps(dumps, user.id);

        // Generate reminders from insights
        const reminderResult = await this.generateRemindersFromInsights(
          user.id,
          analysis.insights,
          {
            autoCreate: true, // Auto-create high-confidence ones
            notifyUser: true,
          },
        );

        remindersCreated += reminderResult.created.length;
        suggestionsGenerated += reminderResult.suggestions.length;

        // Filter out dumps that were used for reminders to avoid overlap in tracking
        const dumpIdsWithReminders = new Set(
          analysis.insights.flatMap((insight) => insight.relatedDumpIds),
        );
        const dumpsForTracking = dumps.filter(
          (dump) => !dumpIdsWithReminders.has(dump.id),
        );

        this.logger.log(
          `User ${user.id}: ${dumps.length} dumps, ${dumpIdsWithReminders.size} used for reminders, ${dumpsForTracking.length} available for tracking`,
        );

        // Detect and create tracking items from remaining dumps
        const trackingResult = await this.detectAndCreateTrackingItems(
          user.id,
          dumpsForTracking,
        );

        trackingItemsCreated += trackingResult.created;

        this.logger.log(
          `User ${user.id}: Created ${reminderResult.created.length} reminders, ${reminderResult.suggestions.length} suggestions, ${trackingResult.created} tracking items`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to process user ${user.id}: ${error.message}`,
        );
      }
    }

    this.logger.log(
      `Daily proactive analysis complete: ${users.length} users, ${remindersCreated} reminders, ${suggestionsGenerated} suggestions, ${trackingItemsCreated} tracking items`,
    );

    return {
      usersProcessed: users.length,
      remindersCreated,
      suggestionsGenerated,
      trackingItemsCreated,
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
      const summary = dump.ai_summary || '';
      
      // Extract key information from entities
      let entitiesInfo = '';
      if (dump.extracted_entities) {
        const entities = dump.extracted_entities.entities as any || {};
        const dates = entities.dates || [];
        const times = entities.times || [];
        const people = entities.people || [];
        const actionItems = dump.extracted_entities.actionItems || [];
        
        if (dates.length > 0 || times.length > 0 || people.length > 0 || actionItems.length > 0) {
          entitiesInfo = `
Action Items: ${actionItems.join(', ') || 'None'}
Dates: ${dates.join(', ') || 'None'}
Times: ${times.join(', ') || 'None'}
People: ${people.join(', ') || 'None'}`;
        }
      }

      return `[${index + 1}] Dump ${dump.id.substring(0, 8)} (ID: ${dump.id})
Category: ${category}
Type: ${dump.content_type}
Date: ${dump.created_at.toISOString()}
Content: ${content}
AI Summary: ${summary}${entitiesInfo}
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

CRITICAL: You must respond with ONLY a valid JSON array, no other text before or after.

Your task is to identify:
1. **Follow-ups**: Tasks with specific dates/times that need action (e.g., "Call X tomorrow morning")
2. **Deadlines**: Projects, bills, appointments with due dates
3. **Expiration dates**: Passports, licenses, subscriptions, warranties
4. **Recurring tasks**: Regular activities mentioned multiple times
5. **Preparation needs**: Events requiring advance preparation

IMPORTANT: Pay special attention to action items with dates and times. These should ALWAYS generate follow-up reminders.

For each insight, provide:
- type: One of [follow-up, deadline, expiration, recurring-task, preparation]
- title: Short, actionable reminder title (e.g., "Call Gilson about car repair")
- description: Context and details (e.g., "Scheduled for 2025-12-04 at 09:00")
- suggestedDate: When to remind in ISO format (e.g., "2025-12-04T09:00:00Z")
- confidence: high (clear date/time), medium (implied timing), or low (vague)
- relatedDumpIds: Array of FULL dump IDs from the "ID:" field (e.g., ["3b9384f5-abc1-4567-89ef-0123456789ab"])
- reasoning: Why this reminder would be helpful (e.g., "Action item with specific date and time")

Example response (ONLY THIS, NO OTHER TEXT):
[
  {
    "type": "follow-up",
    "title": "Call Gilson about car repair",
    "description": "Scheduled call tomorrow morning at 09:00",
    "suggestedDate": "2025-12-04T09:00:00Z",
    "confidence": "high",
    "relatedDumpIds": ["3b9384f5-abc1-4567-89ef-0123456789ab"],
    "reasoning": "Action item with specific date and time extracted from entities"
  }
]

If no opportunities found, return empty array: []`;

    const userPrompt = `Analyze this user content and suggest proactive reminders.

${contentSummary}

CRITICAL: Respond with ONLY a JSON array, no other text. Look especially for action items with dates and times in the entities.`;

    try {
      // Use queryWithCustomPrompt for raw JSON response instead of analyzeContent
      const fullPrompt = `${systemPrompt}

${userPrompt}`;

      const response = await this.claudeService.queryWithCustomPrompt(fullPrompt);

      this.logger.debug(`AI response: ${response.substring(0, 200)}...`);

      // Try to extract JSON array from the response
      const jsonRegex = /\[[\s\S]*\]/;
      const jsonMatch = jsonRegex.exec(response);
      if (!jsonMatch) {
        this.logger.warn(
          `AI response did not contain valid JSON array. Response was: ${response.substring(0, 500)}`,
        );
        return [];
      }

      const insights = JSON.parse(jsonMatch[0]) as ContextualInsight[];

      this.logger.log(`Successfully parsed ${insights.length} insights from AI`);

      // Validate and parse dates
      const validatedInsights = insights.map((insight) => ({
        ...insight,
        suggestedDate: new Date(insight.suggestedDate),
      }));

      return validatedInsights;
    } catch (error) {
      this.logger.error(
        `Failed to extract insights with AI: ${error.message}`,
        error.stack,
      );
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

  /**
   * Detect tracking opportunities from dumps and create trackable items
   * Uses AI analysis to identify packages, subscriptions, warranties, etc.
   */
  async detectAndCreateTrackingItems(
    userId: string,
    dumps: Dump[],
  ): Promise<{
    created: number;
    suggestions: Array<{
      type: TrackingType;
      title: string;
      description: string;
      dumpId: string;
    }>;
  }> {
    const suggestions: Array<{
      type: TrackingType;
      title: string;
      description: string;
      dumpId: string;
    }> = [];
    let created = 0;

    for (const dump of dumps) {
      const content = dump.raw_content?.substring(0, 2000) || '';
      if (!content) continue;

      // Use AI to detect tracking opportunities
      const trackingInsights = await this.detectTrackingWithAI(content, dump);

      for (const insight of trackingInsights) {
        try {
          // Check if similar tracking already exists
          const existing = await this.trackingService.getUserTrackableItems(
            userId,
            {},
          );

          const isDuplicate = existing.some(
            (item) =>
              item.type === insight.type &&
              item.title.toLowerCase() === insight.title.toLowerCase(),
          );

          if (!isDuplicate) {
            // Create the trackable item
            await this.trackingService.createTrackableItem(
              userId,
              dump.id,
              {
                type: insight.type,
                title: insight.title,
                description: insight.description,
                expectedEndDate: insight.expectedDate,
                metadata: {
                  source: 'proactive_detection',
                  confidence: insight.confidence,
                  detectedAt: new Date().toISOString(),
                  trackingNumber: insight.trackingNumber,
                },
                autoReminders: true,
              },
            );

            created++;
            suggestions.push({
              type: insight.type,
              title: insight.title,
              description: insight.description,
              dumpId: dump.id,
            });
          }
        } catch (error) {
          this.logger.error(
            `Failed to create tracking item: ${error.message}`,
            error.stack,
          );
        }
      }
    }

    return { created, suggestions };
  }

  /**
   * Use Claude AI to detect tracking opportunities
   */
  private async detectTrackingWithAI(
    content: string,
    dump: Dump,
  ): Promise<
    Array<{
      type: TrackingType;
      title: string;
      description: string;
      trackingNumber?: string;
      expectedDate?: Date;
      confidence: ConfidenceLevel;
    }>
  > {
    const prompt = `Analyze the following message and identify TRACKING opportunities ONLY. 

CRITICAL: DO NOT include reminders, appointments, or action items. Focus ONLY on status-monitoring items.

**TRACKING items** (what to include):
1. **Packages**: Tracking numbers (UPS, FedEx, USPS, DHL, etc.), shipment notifications, delivery confirmations
2. **Applications**: Job applications, visa applications, loan applications with reference numbers
3. **Subscriptions**: Trial periods, subscription renewals, membership expirations
4. **Warranties**: Product warranties, service contracts, guarantee periods
5. **Loans**: Loan applications, payment deadlines, maturity dates
6. **Insurance**: Policy renewals, claim tracking, coverage periods

**NOT tracking items** (what to EXCLUDE):
- Appointments (dentist, doctor, meetings) → These are REMINDERS, not tracking
- Phone calls to make → These are REMINDERS, not tracking
- Tasks with specific dates/times → These are REMINDERS, not tracking
- Follow-ups with people → These are REMINDERS, not tracking
- General action items → These are REMINDERS, not tracking

TRACKING = monitoring status of something in progress (packages, applications, subscriptions)
REMINDERS = time-based actions you need to take (calls, meetings, follow-ups)

For each TRACKING opportunity found, provide:
- type: One of: package, application, subscription, warranty, loan, insurance (DO NOT use 'other' for reminder-like items)
- title: Short descriptive title (max 100 chars)
- description: Detailed description with relevant context
- trackingNumber: If applicable (tracking codes, reference numbers, policy numbers)
- expectedDate: When status update or completion is expected (ISO 8601 format)
- confidence: high, medium, or low

Message to analyze:
${content.substring(0, 2000)}

Return your analysis as a JSON array. If no tracking opportunities found, return empty array [].
IMPORTANT: Respond with ONLY valid JSON, no other text.`;

    try {
      const response = await this.claudeService.queryWithCustomPrompt(prompt);

      // Parse AI response
      const jsonPattern = /\[[\s\S]*\]/;
      const jsonMatch = jsonPattern.exec(response);
      if (!jsonMatch) {
        this.logger.warn('No JSON array found in AI response');
        return [];
      }

      const insights = JSON.parse(jsonMatch[0]);

      // Validate and normalize the insights
      return insights
        .filter((insight) => insight.type && insight.title)
        .map((insight) => ({
          type: this.normalizeTrackingType(insight.type),
          title: insight.title.substring(0, 100),
          description: insight.description || insight.title,
          trackingNumber: insight.trackingNumber || undefined,
          expectedDate: insight.expectedDate
            ? new Date(insight.expectedDate)
            : undefined,
          confidence: insight.confidence || 'medium',
        }));
    } catch (error) {
      this.logger.error(
        `AI tracking detection failed: ${error.message}`,
        error.stack,
      );
      // Fallback to keyword-based detection
      return this.detectTrackingWithKeywords(content);
    }
  }

  /**
   * Normalize tracking type from AI response to valid enum
   */
  private normalizeTrackingType(type: string): TrackingType {
    const normalized = type.toLowerCase().trim();
    const typeMap: Record<string, TrackingType> = {
      package: TrackingType.PACKAGE,
      packages: TrackingType.PACKAGE,
      shipment: TrackingType.PACKAGE,
      delivery: TrackingType.PACKAGE,
      application: TrackingType.APPLICATION,
      applications: TrackingType.APPLICATION,
      subscription: TrackingType.SUBSCRIPTION,
      subscriptions: TrackingType.SUBSCRIPTION,
      trial: TrackingType.SUBSCRIPTION,
      warranty: TrackingType.WARRANTY,
      warranties: TrackingType.WARRANTY,
      guarantee: TrackingType.WARRANTY,
      loan: TrackingType.LOAN,
      loans: TrackingType.LOAN,
      mortgage: TrackingType.LOAN,
      insurance: TrackingType.INSURANCE,
      policy: TrackingType.INSURANCE,
      claim: TrackingType.INSURANCE,
    };

    return typeMap[normalized] || TrackingType.OTHER;
  }

  /**
   * Fallback keyword-based tracking detection
   */
  private detectTrackingWithKeywords(content: string): Array<{
    type: TrackingType;
    title: string;
    description: string;
    trackingNumber?: string;
    expectedDate?: Date;
    confidence: ConfidenceLevel;
  }> {
    const results: Array<{
      type: TrackingType;
      title: string;
      description: string;
      trackingNumber?: string;
      expectedDate?: Date;
      confidence: ConfidenceLevel;
    }> = [];
    const contentLower = content.toLowerCase();

    // Package detection
    const trackingNumberPattern =
      /\b(1Z[\dA-Z]{16}|\d{22}|\d{12}|\d{20})\b/gi;
    const trackingMatches = content.match(trackingNumberPattern);
    if (
      trackingMatches ||
      contentLower.includes('tracking') ||
      contentLower.includes('shipment') ||
      contentLower.includes('delivery')
    ) {
      results.push({
        type: TrackingType.PACKAGE,
        title: 'Package Delivery',
        description: trackingMatches
          ? `Package with tracking number: ${trackingMatches[0]}`
          : 'Package shipment detected',
        trackingNumber: trackingMatches ? trackingMatches[0] : undefined,
        confidence: trackingMatches ? 'high' : 'medium',
      });
    }

    // Subscription detection
    if (
      contentLower.includes('trial') ||
      contentLower.includes('subscription') ||
      contentLower.includes('membership')
    ) {
      results.push({
        type: TrackingType.SUBSCRIPTION,
        title: 'Subscription/Trial Period',
        description: 'Subscription or trial period detected',
        confidence: 'medium',
      });
    }

    // Warranty detection
    if (
      contentLower.includes('warranty') ||
      contentLower.includes('guarantee')
    ) {
      results.push({
        type: TrackingType.WARRANTY,
        title: 'Warranty Period',
        description: 'Product warranty or guarantee detected',
        confidence: 'medium',
      });
    }

    // Application detection
    if (
      contentLower.includes('application') &&
      (contentLower.includes('reference') ||
        contentLower.includes('status') ||
        contentLower.includes('submitted'))
    ) {
      results.push({
        type: TrackingType.APPLICATION,
        title: 'Application Status',
        description: 'Application submission detected',
        confidence: 'medium',
      });
    }

    return results;
  }
}
