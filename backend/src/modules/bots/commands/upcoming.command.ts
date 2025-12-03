import { Injectable, Logger } from '@nestjs/common';
import { ReminderService } from '../../reminders/reminder.service';
import { User } from '../../../entities/user.entity';
import { Reminder } from '../../../entities/reminder.entity';

@Injectable()
export class UpcomingCommand {
  private readonly logger = new Logger(UpcomingCommand.name);

  constructor(private readonly reminderService: ReminderService) {}

  async execute(
    user: User,
    hours: number = 24,
    platform: 'telegram' | 'whatsapp' = 'telegram',
  ): Promise<string> {
    try {
      this.logger.log(
        `Getting upcoming reminders for user ${user.id}, hours: ${hours}`,
      );

      const upcomingReminders = await this.reminderService.getUpcomingReminders(
        user.id,
        hours,
      );

      if (upcomingReminders.length === 0) {
        if (platform === 'whatsapp') {
          return (
            '⏰ *Upcoming Reminders*\n\n' +
            `No reminders scheduled for the next ${hours} hours.\n\n` +
            '_Create reminders by mentioning dates and times in your messages!_'
          );
        }

        return (
          '⏰ <b>Upcoming Reminders</b>\n\n' +
          `No reminders scheduled for the next ${hours} hours.\n\n` +
          '<i>Create reminders by mentioning dates and times in your messages!</i>'
        );
      }

      // Group reminders by time buckets
      const grouped = this.groupRemindersByTime(upcomingReminders);

      const headerText =
        platform === 'whatsapp'
          ? `⏰ *Upcoming Reminders* (Next ${hours}h)\n\n`
          : `⏰ <b>Upcoming Reminders</b> (Next ${hours}h)\n\n`;

      let response = headerText;

      // Now / Overdue
      if (grouped.now.length > 0) {
        response += '━━━━━━━━━━━━━━━━━━\n';
        response += platform === 'whatsapp' ? '🔴 *NOW*\n' : '🔴 <b>NOW</b>\n';
        response += this.formatReminders(grouped.now, platform);
      }

      // Today
      if (grouped.today.length > 0) {
        response += '━━━━━━━━━━━━━━━━━━\n';
        response +=
          platform === 'whatsapp' ? '📅 *TODAY*\n' : '📅 <b>TODAY</b>\n';
        response += this.formatReminders(grouped.today, platform);
      }

      // Tomorrow
      if (grouped.tomorrow.length > 0) {
        response += '━━━━━━━━━━━━━━━━━━\n';
        response +=
          platform === 'whatsapp'
            ? '📅 *TOMORROW*\n'
            : '📅 <b>TOMORROW</b>\n';
        response += this.formatReminders(grouped.tomorrow, platform);
      }

      // Later
      if (grouped.later.length > 0) {
        response += '━━━━━━━━━━━━━━━━━━\n';
        response +=
          platform === 'whatsapp' ? '📆 *LATER*\n' : '📆 <b>LATER</b>\n';
        response += this.formatReminders(grouped.later, platform);
      }

      response += '━━━━━━━━━━━━━━━━━━\n';
      const footerText =
        platform === 'whatsapp'
          ? `📊 Total: ${upcomingReminders.length} upcoming items\n\n_Use /upcoming 48 to see next 48 hours_`
          : `📊 Total: ${upcomingReminders.length} upcoming items\n\n<i>Use /upcoming 48 to see next 48 hours</i>`;
      response += footerText;

      return response;
    } catch (error) {
      this.logger.error(
        `Error getting upcoming reminders: ${error.message}`,
        error.stack,
      );

      if (platform === 'whatsapp') {
        return (
          '❌ *Error*\n\n' +
          "Sorry, I couldn't retrieve your upcoming reminders right now.\n\n" +
          '_Please try again in a moment._'
        );
      }

      return (
        '❌ <b>Error</b>\n\n' +
        "Sorry, I couldn't retrieve your upcoming reminders right now.\n\n" +
        '<i>Please try again in a moment.</i>'
      );
    }
  }

  private groupRemindersByTime(reminders: Reminder[]): {
    now: Reminder[];
    today: Reminder[];
    tomorrow: Reminder[];
    later: Reminder[];
  } {
    const now = new Date();
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const tomorrowStart = new Date(todayEnd);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);

    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const grouped = {
      now: [] as Reminder[],
      today: [] as Reminder[],
      tomorrow: [] as Reminder[],
      later: [] as Reminder[],
    };

    for (const reminder of reminders) {
      const reminderTime = new Date(reminder.scheduled_for);

      // Within 1 hour or overdue
      const diffMinutes = (reminderTime.getTime() - now.getTime()) / (1000 * 60);
      if (diffMinutes <= 60) {
        grouped.now.push(reminder);
      }
      // Rest of today
      else if (reminderTime <= todayEnd) {
        grouped.today.push(reminder);
      }
      // Tomorrow
      else if (reminderTime >= tomorrowStart && reminderTime <= tomorrowEnd) {
        grouped.tomorrow.push(reminder);
      }
      // Later
      else {
        grouped.later.push(reminder);
      }
    }

    return grouped;
  }

  private formatReminders(
    reminders: Reminder[],
    platform: 'telegram' | 'whatsapp',
  ): string {
    let output = '';

    for (const reminder of reminders) {
      const icon = this.getReminderIcon(reminder.reminder_type);
      const time = this.formatTime(new Date(reminder.scheduled_for));
      
      // Title/message
      const title = reminder.message || 'Reminder';
      const titleText = platform === 'whatsapp' ? title : title;
      
      output += `${icon} ${titleText}\n`;
      output += `   📅 ${time}\n`;

      // Add related dump context if available
      if (reminder.dump?.ai_summary) {
        const summary = reminder.dump.ai_summary.substring(0, 80);
        const summaryText =
          platform === 'whatsapp'
            ? `   _${summary}${reminder.dump.ai_summary.length > 80 ? '...' : ''}_\n`
            : `   <i>${summary}${reminder.dump.ai_summary.length > 80 ? '...' : ''}</i>\n`;
        output += summaryText;
      }

      output += '\n';
    }

    return output;
  }

  private getReminderIcon(reminderType?: string): string {
    const icons: Record<string, string> = {
      once: '⏰',
      daily: '🔄',
      weekly: '📅',
      monthly: '📆',
      deadline: '⚠️',
      'follow-up': '📞',
      task: '✓',
    };

    return icons[reminderType?.toLowerCase() || ''] || '⏰';
  }

  private formatTime(date: Date): string {
    const now = new Date();
    const diffMinutes = Math.floor(
      (date.getTime() - now.getTime()) / (1000 * 60),
    );

    // Overdue
    if (diffMinutes < 0) {
      const overdueMins = Math.abs(diffMinutes);
      if (overdueMins < 60) {
        return `Overdue by ${overdueMins}m`;
      }
      const overdueHours = Math.floor(overdueMins / 60);
      return `Overdue by ${overdueHours}h`;
    }

    // Within next hour
    if (diffMinutes < 60) {
      return `In ${diffMinutes}m`;
    }

    // Today
    if (this.isToday(date)) {
      return `Today at ${date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    }

    // Tomorrow
    if (this.isTomorrow(date)) {
      return `Tomorrow at ${date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    }

    // Later this week
    const daysUntil = Math.ceil(diffMinutes / (60 * 24));
    if (daysUntil <= 7) {
      return `${date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })} at ${date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    }

    // Further out
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private isToday(date: Date): boolean {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }

  private isTomorrow(date: Date): boolean {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return (
      date.getDate() === tomorrow.getDate() &&
      date.getMonth() === tomorrow.getMonth() &&
      date.getFullYear() === tomorrow.getFullYear()
    );
  }
}
