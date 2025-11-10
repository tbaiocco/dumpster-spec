import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Dump } from '../../entities/dump.entity';
import { User } from '../../entities/user.entity';
import { ReminderService } from '../reminders/reminder.service';
import { ReminderStatus } from '../../entities/reminder.entity';

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
    private dumpRepository: Repository<Dump>,
    private reminderService: ReminderService,
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
   * Format digest as human-readable text
   */
  formatDigestAsText(digest: DigestContent): string {
    const lines: string[] = [];

    // Header
    lines.push('═══════════════════════════════════');
    lines.push(`📬 Daily Digest - ${digest.date.toLocaleDateString()}`);
    lines.push('═══════════════════════════════════');
    lines.push('');

    // Summary
    lines.push('📊 Summary:');
    lines.push(`   • Total items: ${digest.summary.totalItems}`);
    lines.push(`   • Pending reminders: ${digest.summary.pendingReminders}`);
    if (digest.summary.urgentItems > 0) {
      lines.push(`   • ⚠️ Urgent items: ${digest.summary.urgentItems}`);
    }
    lines.push('');

    // Sections
    for (const section of digest.sections) {
      lines.push(`${section.title}`);
      lines.push('─'.repeat(35));

      for (const item of section.items) {
        const priorityIcon =
          section.priority === 'high'
            ? '🔴'
            : section.priority === 'medium'
              ? '🟡'
              : '🟢';
        lines.push(`${priorityIcon} ${item.title}`);
        if (item.summary) {
          lines.push(`   ${item.summary}`);
        }
        if (item.dueDate) {
          lines.push(`   ⏰ ${item.dueDate.toLocaleString()}`);
        }
        lines.push('');
      }
    }

    // Recommendations
    if (digest.recommendations.length > 0) {
      lines.push('💡 Recommendations:');
      for (const rec of digest.recommendations) {
        lines.push(`   • ${rec}`);
      }
      lines.push('');
    }

    lines.push('═══════════════════════════════════');

    return lines.join('\n');
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
        html += `<strong>${item.title}</strong>`;
        if (item.summary) {
          html += `<p style="margin: 5px 0; color: #666;">${item.summary}</p>`;
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
        html += `<li>${rec}</li>`;
      }
      html += '</ul>';
      html += '</div>';
    }

    html += '</div>';

    return html;
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
