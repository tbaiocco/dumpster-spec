import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Dump } from '../../entities/dump.entity';
import { User } from '../../entities/user.entity';
import { ReminderService } from '../reminders/reminder.service';
import { ReminderStatus } from '../../entities/reminder.entity';
import { TranslationService } from '../ai/translation.service';

export interface DigestContent {
  userId: string;
  date: Date;
  summary: DigestSummary;
  sections: DigestSection[];
  recommendations: string[];
}

export interface DigestSummary {
  totalItems: number;
  pendingReminders: number;
  urgentItems: number;
  categoriesBreakdown: Record<string, number>;
}

export interface DigestSection {
  title: string;
  priority: 'high' | 'medium' | 'low';
  items: DigestItem[];
}

export interface DigestItem {
  id: string;
  type: 'dump' | 'reminder';
  title: string;
  summary: string;
  categoryName?: string;
  urgencyLevel?: number;
  dueDate?: Date;
  actionRequired?: boolean;
}

@Injectable()
export class DigestService {
  private readonly logger = new Logger(DigestService.name);

  constructor(
    @InjectRepository(Dump)
    private readonly dumpRepository: Repository<Dump>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly reminderService: ReminderService,
    private readonly translationService: TranslationService,
  ) {}

  /**
   * Generate daily digest for a user
   */
  async generateDailyDigest(userId: string): Promise<DigestContent> {
    this.logger.log(`Generating daily digest for user ${userId}`);

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get recent dumps from the last 24 hours
    const recentDumps = await this.getRecentDumps(userId, yesterday, now);

    // Get pending reminders for today
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    const pendingReminders = await this.reminderService.getUserReminders(userId, {
      status: ReminderStatus.PENDING,
      startDate: now,
      endDate: todayEnd,
    });

    // Get upcoming reminders (next 24 hours)
    const upcomingReminders = await this.reminderService.getUpcomingReminders(
      userId,
      24,
    );

    // Build digest sections
    const sections: DigestSection[] = [];

    // Section 1: Urgent items (high urgency dumps and overdue reminders)
    const urgentSection = this.buildUrgentSection(recentDumps, pendingReminders);
    if (urgentSection.items.length > 0) {
      sections.push(urgentSection);
    }

    // Section 2: Today's reminders
    const todaySection = this.buildTodayRemindersSection(pendingReminders);
    if (todaySection.items.length > 0) {
      sections.push(todaySection);
    }

    // Section 3: Recent captures (last 24 hours)
    const recentSection = this.buildRecentCapturesSection(recentDumps);
    if (recentSection.items.length > 0) {
      sections.push(recentSection);
    }

    // Section 4: Upcoming items (next 24 hours)
    const upcomingSection = this.buildUpcomingSection(upcomingReminders);
    if (upcomingSection.items.length > 0) {
      sections.push(upcomingSection);
    }

    // Build summary
    const summary = this.buildDigestSummary(recentDumps, pendingReminders);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      recentDumps,
      pendingReminders,
    );

    const digest: DigestContent = {
      userId,
      date: now,
      summary,
      sections,
      recommendations,
    };

    this.logger.log(
      `Generated digest with ${sections.length} sections and ${summary.totalItems} items`,
    );

    return digest;
  }

  /**
   * Generate morning digest (optimized for morning delivery)
   */
  async generateMorningDigest(userId: string): Promise<DigestContent> {
    this.logger.log(`Generating morning digest for user ${userId}`);

    const digest = await this.generateDailyDigest(userId);

    // Add morning-specific recommendations
    digest.recommendations.unshift(
      '☀️ Good morning! Here\'s what\'s on your plate today.',
    );

    return digest;
  }

  /**
   * Generate evening digest (review and preparation)
   */
  async generateEveningDigest(userId: string): Promise<DigestContent> {
    this.logger.log(`Generating evening digest for user ${userId}`);

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    // Get today's completed items
    const todayDumps = await this.getRecentDumps(userId, todayStart, now);

    // Get tomorrow's reminders
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowStart = new Date(tomorrow);
    tomorrowStart.setHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const tomorrowReminders = await this.reminderService.getUserReminders(
      userId,
      {
        status: ReminderStatus.PENDING,
        startDate: tomorrowStart,
        endDate: tomorrowEnd,
      },
    );

    const sections: DigestSection[] = [];

    // Section 1: Today's activity summary
    const todaySummarySection: DigestSection = {
      title: "📊 Today's Activity",
      priority: 'medium',
      items: todayDumps.slice(0, 5).map((dump) => ({
        id: dump.id,
        type: 'dump' as const,
        title: dump.raw_content.substring(0, 50),
        summary: `Captured and categorized as ${dump.category?.name || 'uncategorized'}`,
        categoryName: dump.category?.name || 'uncategorized',
      })),
    };

    if (todaySummarySection.items.length > 0) {
      sections.push(todaySummarySection);
    }

    // Section 2: Tomorrow's reminders
    const tomorrowSection: DigestSection = {
      title: '📅 Tomorrow\'s Schedule',
      priority: 'high',
      items: tomorrowReminders.map((reminder) => ({
        id: reminder.id,
        type: 'reminder' as const,
        title: reminder.message,
        summary: `Scheduled for ${reminder.scheduled_for.toLocaleTimeString()}`,
        dueDate: reminder.scheduled_for,
        actionRequired: true,
      })),
    };

    if (tomorrowSection.items.length > 0) {
      sections.push(tomorrowSection);
    }

    const summary: DigestSummary = {
      totalItems: todayDumps.length + tomorrowReminders.length,
      pendingReminders: tomorrowReminders.length,
      urgentItems: 0,
      categoriesBreakdown: this.buildCategoriesBreakdown(todayDumps),
    };

    const recommendations = [
      '🌙 Evening review complete. Rest well!',
      `You captured ${todayDumps.length} items today.`,
    ];

    if (tomorrowReminders.length > 0) {
      recommendations.push(
        `${tomorrowReminders.length} reminders scheduled for tomorrow.`,
      );
    }

    return {
      userId,
      date: now,
      summary,
      sections,
      recommendations,
    };
  }

  /**
   * Format digest as human-readable text with user's timezone and language preferences
   * Translates all text content to the user's preferred language
   */
  async formatDigestAsText(digest: DigestContent): Promise<string> {
    // Fetch user to get timezone and language preferences
    const user = await this.userRepository.findOne({
      where: { id: digest.userId },
    });

    const timezone = user?.timezone || 'UTC';
    const language = user?.language || 'en';

    // Translate static labels if not English
    const labels = await this.translateLabels(language);

    const lines: string[] = [
      '═══════════════════════════════════',
      `📬 ${labels.dailyDigest} - ${this.formatDate(digest.date, timezone, language)}`,
      '═══════════════════════════════════',
      '',
      `📊 ${labels.summary}:`,
      `   • ${labels.totalItems}: ${digest.summary.totalItems}`,
      `   • ${labels.pendingReminders}: ${digest.summary.pendingReminders}`,
    ];

    if (digest.summary.urgentItems > 0) {
      lines.push(`   • ⚠️ ${labels.urgentItems}: ${digest.summary.urgentItems}`);
    }
    lines.push('');

    // Sections
    for (const section of digest.sections) {
      // Translate section title
      const translatedTitle = await this.translationService.translate({
        text: section.title.replace(/^[^\s]+\s/, ''), // Remove emoji
        targetLanguage: language,
        context: 'Digest section title',
      });
      
      const emojiMatch = /^[^\s]+/.exec(section.title);
      const sectionEmoji = emojiMatch ? emojiMatch[0] : '';
      lines.push(`${sectionEmoji} ${translatedTitle.translatedText}`, '─'.repeat(35));

      for (const item of section.items) {
        const priorityIcon = this.getPriorityIcon(section.priority);
        
        // Translate item title and summary
        const translatedTitle = await this.translationService.translate({
          text: item.title,
          targetLanguage: language,
          context: 'Digest item title',
        });
        
        lines.push(`${priorityIcon} ${translatedTitle.translatedText}`);
        
        if (item.summary) {
          const translatedSummary = await this.translationService.translate({
            text: item.summary,
            targetLanguage: language,
            context: 'Digest item summary',
          });
          lines.push(`   ${translatedSummary.translatedText}`);
        }
        
        if (item.dueDate) {
          lines.push(`   ⏰ ${this.formatDateTime(item.dueDate, timezone, language)}`);
        }
        
        lines.push('');
      }
    }

    // Recommendations
    if (digest.recommendations.length > 0) {
      lines.push(`💡 ${labels.recommendations}:`);
      
      // Translate recommendations in batch for efficiency
      const translatedRecs = await this.translationService.translateBatch(
        digest.recommendations,
        language,
      );
      
      for (const rec of translatedRecs) {
        lines.push(`   • ${rec}`);
      }
      lines.push('');
    }

    lines.push('═══════════════════════════════════');

    return lines.join('\n');
  }

  /**
   * Translate static UI labels for digest
   */
  private async translateLabels(language: string): Promise<{
    dailyDigest: string;
    summary: string;
    totalItems: string;
    pendingReminders: string;
    urgentItems: string;
    recommendations: string;
  }> {
    if (language === 'en') {
      return {
        dailyDigest: 'Daily Digest',
        summary: 'Summary',
        totalItems: 'Total items',
        pendingReminders: 'Pending reminders',
        urgentItems: 'Urgent items',
        recommendations: 'Recommendations',
      };
    }

    const labels = [
      'Daily Digest',
      'Summary',
      'Total items',
      'Pending reminders',
      'Urgent items',
      'Recommendations',
    ];

    const translated = await this.translationService.translateBatch(
      labels,
      language,
    );

    return {
      dailyDigest: translated[0],
      summary: translated[1],
      totalItems: translated[2],
      pendingReminders: translated[3],
      urgentItems: translated[4],
      recommendations: translated[5],
    };
  }

  /**
   * Get priority icon for section
   */
  private getPriorityIcon(priority: 'high' | 'medium' | 'low'): string {
    if (priority === 'high') return '🔴';
    if (priority === 'medium') return '🟡';
    return '🟢';
  }

  /**
   * Format date according to user's timezone and language
   */
  private formatDate(date: Date, timezone: string, language: string): string {
    return new Intl.DateTimeFormat(language, {
      timeZone: timezone,
      dateStyle: 'full',
    }).format(date);
  }

  /**
   * Format date and time according to user's timezone and language
   */
  private formatDateTime(date: Date, timezone: string, language: string): string {
    return new Intl.DateTimeFormat(language, {
      timeZone: timezone,
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }

  /**
   * Format digest as HTML
   */
  formatDigestAsHTML(digest: DigestContent): string {
    let html = '<div style="font-family: Arial, sans-serif; max-width: 600px;">';

    // Header
    html += '<h2 style="color: #333;">📬 Daily Digest</h2>';
    html += `<p style="color: #666;">${digest.date.toLocaleDateString()}</p>`;

    // Summary
    html += '<div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">';
    html += '<h3 style="margin-top: 0;">Summary</h3>';
    html += '<ul style="list-style: none; padding: 0;">';
    html += `<li>📊 Total items: ${digest.summary.totalItems}</li>`;
    html += `<li>⏰ Pending reminders: ${digest.summary.pendingReminders}</li>`;
    if (digest.summary.urgentItems > 0) {
      html += `<li style="color: #d32f2f;">⚠️ Urgent items: ${digest.summary.urgentItems}</li>`;
    }
    html += '</ul>';
    html += '</div>';

    // Sections
    for (const section of digest.sections) {
      const borderColor =
        section.priority === 'high'
          ? '#d32f2f'
          : section.priority === 'medium'
            ? '#f57c00'
            : '#388e3c';

      html += `<div style="border-left: 4px solid ${borderColor}; padding-left: 15px; margin: 20px 0;">`;
      html += `<h3 style="color: ${borderColor};">${section.title}</h3>`;

      for (const item of section.items) {
        html += '<div style="margin: 10px 0; padding: 10px; background: #fafafa; border-radius: 3px;">';
        html += `<strong>${this.escapeHtml(item.title)}</strong>`;
        if (item.summary) {
          html += `<p style="margin: 5px 0; color: #666;">${this.escapeHtml(item.summary)}</p>`;
        }
        if (item.dueDate) {
          html += `<p style="margin: 5px 0; color: #1976d2;">⏰ ${item.dueDate.toLocaleString()}</p>`;
        }
        html += '</div>';
      }

      html += '</div>';
    }

    // Recommendations
    if (digest.recommendations.length > 0) {
      html += '<div style="background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0;">';
      html += '<h3 style="color: #1976d2; margin-top: 0;">💡 Recommendations</h3>';
      html += '<ul>';
      for (const rec of digest.recommendations) {
        html += `<li>${this.escapeHtml(rec)}</li>`;
      }
      html += '</ul>';
      html += '</div>';
    }

    html += '</div>';

    return html;
  }

  /**
   * Escape HTML special characters to prevent XSS
   */
  private escapeHtml(text: string): string {
    const htmlEscapeMap: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };

    return text.replace(/[&<>"']/g, (char) => htmlEscapeMap[char]);
  }

  // Private helper methods

  private async getRecentDumps(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Dump[]> {
    return this.dumpRepository.find({
      where: {
        user_id: userId,
        created_at: Between(startDate, endDate),
      },
      relations: ['category'],
      order: {
        created_at: 'DESC',
      },
      take: 50, // Limit to recent 50
    });
  }

  private buildUrgentSection(
    dumps: Dump[],
    reminders: any[],
  ): DigestSection {
    const urgentDumps = dumps.filter((d) => d.urgency_level && d.urgency_level >= 8);

    const items: DigestItem[] = urgentDumps.map((dump) => ({
      id: dump.id,
      type: 'dump' as const,
      title: dump.raw_content.substring(0, 60),
      summary: dump.ai_summary || 'High priority item',
      categoryName: dump.category?.name || 'uncategorized',
      urgencyLevel: dump.urgency_level,
      actionRequired: true,
    }));

    return {
      title: '🚨 Urgent Items',
      priority: 'high',
      items,
    };
  }

  private buildTodayRemindersSection(reminders: any[]): DigestSection {
    const items: DigestItem[] = reminders.map((reminder) => ({
      id: reminder.id,
      type: 'reminder' as const,
      title: reminder.message,
      summary: `Scheduled for ${reminder.scheduled_for.toLocaleTimeString()}`,
      dueDate: reminder.scheduled_for,
      actionRequired: true,
    }));

    return {
      title: '📅 Today\'s Reminders',
      priority: 'high',
      items,
    };
  }

  private buildRecentCapturesSection(dumps: Dump[]): DigestSection {
    const items: DigestItem[] = dumps.slice(0, 10).map((dump) => ({
      id: dump.id,
      type: 'dump' as const,
      title: dump.raw_content.substring(0, 60),
      summary: dump.ai_summary || 'Recently captured',
      categoryName: dump.category?.name || 'uncategorized',
    }));

    return {
      title: '📝 Recent Captures (Last 24h)',
      priority: 'medium',
      items,
    };
  }

  private buildUpcomingSection(reminders: any[]): DigestSection {
    const items: DigestItem[] = reminders.map((reminder) => ({
      id: reminder.id,
      type: 'reminder' as const,
      title: reminder.message,
      summary: `Coming up at ${reminder.scheduled_for.toLocaleString()}`,
      dueDate: reminder.scheduled_for,
    }));

    return {
      title: '⏰ Upcoming (Next 24h)',
      priority: 'low',
      items,
    };
  }

  private buildDigestSummary(
    dumps: Dump[],
    reminders: any[],
  ): DigestSummary {
    const urgentItems = dumps.filter((d) => d.urgency_level && d.urgency_level >= 8).length;

    return {
      totalItems: dumps.length + reminders.length,
      pendingReminders: reminders.length,
      urgentItems,
      categoriesBreakdown: this.buildCategoriesBreakdown(dumps),
    };
  }

  private buildCategoriesBreakdown(dumps: Dump[]): Record<string, number> {
    const breakdown: Record<string, number> = {};

    for (const dump of dumps) {
      const categoryName = dump.category?.name || 'uncategorized';
      breakdown[categoryName] = (breakdown[categoryName] || 0) + 1;
    }

    return breakdown;
  }

  private generateRecommendations(
    dumps: Dump[],
    reminders: any[],
  ): string[] {
    const recommendations: string[] = [];

    // Recommend based on captured content
    if (dumps.length === 0) {
      recommendations.push(
        "You haven't captured anything recently. Anything on your mind?",
      );
    } else if (dumps.length > 20) {
      recommendations.push(
        'You\'ve been very active! Consider reviewing and organizing your captures.',
      );
    }

    // Recommend based on reminders
    if (reminders.length === 0) {
      recommendations.push('No reminders scheduled. All clear!');
    } else if (reminders.length > 10) {
      recommendations.push(
        'You have many reminders today. Prioritize what\'s most important.',
      );
    }

    // Category-based recommendations
    const categories = this.buildCategoriesBreakdown(dumps);
    const topCategory = Object.entries(categories).sort(
      ([, a], [, b]) => b - a,
    )[0];

    if (topCategory) {
      recommendations.push(
        `Most captures in "${topCategory[0]}" category (${topCategory[1]} items).`,
      );
    }

    return recommendations;
  }
}
