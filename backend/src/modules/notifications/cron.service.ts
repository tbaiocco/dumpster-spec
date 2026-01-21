import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { DigestService } from './digest.service';
import { ReminderService } from '../reminders/reminder.service';
import { ProactiveService } from './proactive.service';
import { DeliveryService } from './delivery.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Reminder } from '../../entities/reminder.entity';
import { TemplateService } from '../bots/template.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private readonly digestService: DigestService,
    private readonly reminderService: ReminderService,
    private readonly proactiveService: ProactiveService,
    private readonly deliveryService: DeliveryService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly templateService: TemplateService,
  ) {}

  /**
   * Morning digest delivery - 8 AM daily
   * Sends daily digest to all active users
   */
  @Cron('0 8 * * *', {
    name: 'morning-digest',
    timeZone: 'Europe/Lisbon', // Default timezone, should be user-specific
  })
  async handleMorningDigest(): Promise<void> {
    this.logger.log('Starting morning digest delivery job');

    try {
      const users = await this.getActiveUsers();
      let successCount = 0;
      let errorCount = 0;

      for (const user of users) {
        try {
          await this.deliverMorningDigest(user.id);
          successCount++;
        } catch (error) {
          this.logger.error(
            `Failed to deliver morning digest to user ${user.id}`,
            error,
          );
          errorCount++;
        }
      }

      this.logger.log(
        `Morning digest delivery complete: ${successCount} successful, ${errorCount} failed`,
      );
    } catch (error) {
      this.logger.error('Morning digest job failed', error);
    }
  }

  /**
   * Evening digest delivery - 8 PM daily
   * Sends evening review and tomorrow's preparation
   */
  @Cron('0 20 * * *', {
    name: 'evening-digest',
    timeZone: 'Europe/Lisbon',
  })
  async handleEveningDigest(): Promise<void> {
    this.logger.log('Starting evening digest delivery job');

    try {
      const users = await this.getActiveUsers();
      let successCount = 0;
      let errorCount = 0;

      for (const user of users) {
        try {
          await this.deliverEveningDigest(user.id);
          successCount++;
        } catch (error) {
          this.logger.error(
            `Failed to deliver evening digest to user ${user.id}`,
            error,
          );
          errorCount++;
        }
      }

      this.logger.log(
        `Evening digest delivery complete: ${successCount} successful, ${errorCount} failed`,
      );
    } catch (error) {
      this.logger.error('Evening digest job failed', error);
    }
  }

  /**
   * Reminder check - Every 5 minutes
   * Checks for pending reminders and sends them
   */
  @Cron(CronExpression.EVERY_5_MINUTES, {
    name: 'reminder-check',
  })
  async handleReminderCheck(): Promise<void> {
    this.logger.debug('Checking for pending reminders');

    try {
      const pendingReminders = await this.reminderService.getPendingReminders();

      if (pendingReminders.length === 0) {
        this.logger.debug('No pending reminders to send');
        return;
      }

      this.logger.log(
        `Found ${pendingReminders.length} pending reminders to send`,
      );

      let successCount = 0;
      let errorCount = 0;

      for (const reminder of pendingReminders) {
        try {
          await this.deliverReminder(reminder);
          successCount++;

          // Handle recurring reminders
          if (reminder.recurrence_pattern) {
            await this.reminderService.createNextRecurrence(reminder.id);
          }
        } catch (error) {
          this.logger.error(`Failed to deliver reminder ${reminder.id}`, error);
          errorCount++;
        }
      }

      this.logger.log(
        `Reminder check complete: ${successCount} sent, ${errorCount} failed`,
      );
    } catch (error) {
      this.logger.error('Reminder check job failed', error);
    }
  }

  /**
   * Cleanup old reminders - Daily at midnight
   * Removes old dismissed and sent reminders
   */
  @Cron('0 0 * * *', {
    name: 'cleanup-reminders',
  })
  async handleReminderCleanup(): Promise<void> {
    this.logger.log('Starting reminder cleanup job');

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // This would need to be implemented in ReminderService
      // For now, just log
      this.logger.log('Reminder cleanup completed (implementation pending)');
    } catch (error) {
      this.logger.error('Reminder cleanup job failed', error);
    }
  }

  /**
   * Daily proactive analysis - 3 AM daily
   * Analyzes user data and generates proactive insights and recommendations
   */
  @Cron('0 3 * * *', {
    name: 'daily-proactive-analysis',
    timeZone: 'Europe/Lisbon',
  })
  async handleDailyProactiveAnalysis(): Promise<void> {
    this.logger.log('Starting daily proactive analysis job');

    try {
      const result = await this.proactiveService.runDailyProactiveAnalysis();

      this.logger.log(
        `Daily proactive analysis complete: ${result.usersProcessed} users processed, ` +
          `${result.remindersCreated} reminders created, ${result.suggestionsGenerated} suggestions generated`,
      );
    } catch (error) {
      this.logger.error('Daily proactive analysis job failed', error);
    }
  }

  /**
   * Manual trigger for morning digest (for testing or manual delivery)
   */
  async triggerMorningDigest(userId: string): Promise<void> {
    this.logger.log(`Manually triggering morning digest for user ${userId}`);
    await this.deliverMorningDigest(userId);
  }

  /**
   * Manual trigger for evening digest
   */
  async triggerEveningDigest(userId: string): Promise<void> {
    this.logger.log(`Manually triggering evening digest for user ${userId}`);
    await this.deliverEveningDigest(userId);
  }

  /**
   * Manual trigger for reminder check
   */
  async triggerReminderCheck(): Promise<void> {
    this.logger.log('Manually triggering reminder check');
    await this.handleReminderCheck();
  }

  /**
   * Get cron job status
   */
  getCronJobStatus(): Record<string, any> {
    const jobs = this.schedulerRegistry.getCronJobs();
    const status: Record<string, any> = {};

    for (const [name, job] of jobs) {
      status[name] = {
        lastDate: job.lastDate(),
        nextDate: job.nextDate(),
      };
    }

    return status;
  }

  /**
   * Stop a specific cron job
   */
  stopCronJob(jobName: string): void {
    const job = this.schedulerRegistry.getCronJob(jobName);
    job.stop();
    this.logger.warn(`Cron job '${jobName}' stopped`);
  }

  /**
   * Start a specific cron job
   */
  startCronJob(jobName: string): void {
    const job = this.schedulerRegistry.getCronJob(jobName);
    job.start();
    this.logger.log(`Cron job '${jobName}' started`);
  }

  // Private helper methods

  private async getActiveUsers(): Promise<User[]> {
    // Get all users with phone numbers (active users)
    return this.userRepository.find({
      where: {
        // Add any active user criteria here
      },
      select: ['id', 'phone_number'],
    });
  }

  private async deliverMorningDigest(userId: string): Promise<void> {
    this.logger.debug(`Generating morning digest for user ${userId}`);

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user && user.notification_preferences?.morning_digest === false) {
      this.logger.debug(
        `User ${userId} has disabled morning digests. Skipping delivery.`,
      );
      return;
    }

    const digest = await this.digestService.generateMorningDigest(userId);
    const digestText = await this.digestService.formatDigestAsText(digest);

    // Build template variables for WhatsApp (keep email text unchanged)
    const timezone = user?.timezone || 'UTC';
    const language = user?.language || 'en';

    let template = this.templateService.getTemplate(`morning_digest_${language}`);
    template ??= this.templateService.getTemplate('morning_digest_en');

    const v1 = new Intl.DateTimeFormat(language, {
      timeZone: timezone,
      dateStyle: 'full',
    }).format(digest.date);
    const v2 = String(digest.summary.totalItems);
    const v3 = String(digest.summary.pendingReminders);
    const v4 = (digest.recommendations && digest.recommendations.length > 0) ? digest.recommendations.join(' ') : '(...)';
    
    const request = {
      userId,
      type: undefined as any,
      message: digestText,
      priority: 'medium' as any,
      templateName: template?.name,
      templateVars: [v1, v2, v3, v4],
      templateLanguage: template?.language || 'en_US',
    };

    const result = await this.deliveryService.deliver(request as any);

    if (result.success) {
      const messageIdPart = result.messageId
        ? ` (messageId: ${result.messageId})`
        : '';
      this.logger.log(
        `Morning digest delivered to user ${userId} via ${result.channel} at ${result.deliveredAt.toISOString()}${messageIdPart}`,
      );
    } else {
      this.logger.error(
        `Failed to deliver morning digest to user ${userId} via ${result.channel}: ${result.error}`,
      );
    }
  }

  private async deliverEveningDigest(userId: string): Promise<void> {
    this.logger.debug(`Generating evening digest for user ${userId}`);

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user && user.notification_preferences?.evening_digest === false) {
      this.logger.debug(
        `User ${userId} has disabled evening digests. Skipping delivery.`,
      );
      return;
    }

    const digest = await this.digestService.generateEveningDigest(userId);
    const digestText = await this.digestService.formatDigestAsText(digest);

    // Build template variables for WhatsApp (keep email text unchanged)
    const timezone = user?.timezone || 'UTC';
    const language = user?.language || 'en';

    let template = this.templateService.getTemplate(`evening_digest_${language}`);
    template ??= this.templateService.getTemplate('evening_digest_en');

    const v1 = new Intl.DateTimeFormat(language, {
      timeZone: timezone,
      dateStyle: 'full',
    }).format(digest.date);
    const v2 = String(digest.summary.totalItems);
    const v3 = String(digest.summary.pendingReminders);
    const v4 = (digest.recommendations && digest.recommendations.length > 0) ? digest.recommendations.join(' ') : '(...)';
    
    const request = {
      userId,
      type: undefined as any,
      message: digestText,
      priority: 'medium' as any,
      templateName: template?.name,
      templateVars: [v1, v2, v3, v4],
      templateLanguage: template?.language || 'en_US',
    };

    const result = await this.deliveryService.deliver(request as any);

    if (result.success) {
      const messageIdPart = result.messageId
        ? ` (messageId: ${result.messageId})`
        : '';
      this.logger.log(
        `Evening digest delivered to user ${userId} via ${result.channel} at ${result.deliveredAt.toISOString()}${messageIdPart}`,
      );
    } else {
      this.logger.error(
        `Failed to deliver evening digest to user ${userId} via ${result.channel}: ${result.error}`,
      );
    }
  }

  private async deliverReminder(reminder: Reminder): Promise<void> {
    this.logger.debug(`Delivering reminder ${reminder.id}`);

    const user = await this.userRepository.findOne({ where: { id: reminder.user_id } });
    if (user && user.notification_preferences?.reminder_alerts === false) {
      this.logger.debug(
        `User ${reminder.user_id} has disabled reminder alerts. Skipping delivery.`,
      );
      return;
    }

    const message = this.formatReminderMessage(reminder);

    // Build delivery request with template metadata for WhatsApp when appropriate
    const timezone = user?.timezone || 'UTC';
    const language = user?.language || 'en';

    let template = this.templateService.getTemplate(`new_reminder_with_context_${language}`);
    template ??= this.templateService.getTemplate('new_reminder_with_context_en');

    let request: any;

    this.logger.debug(`Reminder message: ${reminder.message}`);
    // Split reminder.message if it contains newlines
    if (reminder.message.includes('\n')) {
      const parts = reminder.message.split(/\n+/);
      reminder.message = parts[0];
      reminder.message_details = parts.slice(1).join(' ').trim();
    }

    if (reminder.dump){
      const v1 = reminder.message ? reminder.message.substring(0, 50) : '';
      const v2 = reminder.dump.raw_content ? reminder.dump.raw_content.substring(0, 200) : '';
      const v3 = new Intl.DateTimeFormat(language, {
        timeZone: timezone,
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(reminder.scheduled_for);
      const v4 = reminder.message_details
        ? this.templateService.truncate(reminder.message_details, 200)
        : '(...)';

      request = {
        userId: reminder.user_id,
        type: undefined,
        message,
        messageDetails: reminder.message_details,
        priority: 'high',
        templateName: template?.name,
        templateVars: [v1, v2, v3, v4],
        templateLanguage: template?.language || 'en_US',
      };
    } else {
      let template = this.templateService.getTemplate(`new_reminder_delivery_${language}`);
      template ??= this.templateService.getTemplate('new_reminder_delivery_en');
      
      const v1 = reminder.message;
      const v2 = new Intl.DateTimeFormat(language, {
        timeZone: timezone,
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(reminder.scheduled_for);
      const v3 = `${process.env.FRONTEND_URL || ''}/reminders/${reminder.id}`;
      const v4 = reminder.message_details
        ? this.templateService.truncate(reminder.message_details, 200)
        : '(...)';

      request = {
        userId: reminder.user_id,
        type: undefined,
        message,
        messageDetails: reminder.message_details,
        priority: 'high',
        templateName: template?.name,
        templateVars: [v1, v2, v4],
        templateLanguage: template?.language || 'en_US',
      };
    }

    const result = await this.deliveryService.deliver(request as any);

    if (result.success) {
      await this.reminderService.markReminderAsSent(reminder.id);
      const messageIdPart = result.messageId
        ? ` (messageId: ${result.messageId})`
        : '';
      this.logger.log(
        `Reminder ${reminder.id} delivered to user ${reminder.user_id} via ${result.channel} at ${result.deliveredAt.toISOString()}${messageIdPart}`,
      );
    } else {
      this.logger.error(
        `Failed to deliver reminder ${reminder.id} to user ${reminder.user_id} via ${result.channel}: ${result.error}`,
      );
    }
  }

  private formatReminderMessage(reminder: Reminder): string {
    let message = `🔔 Reminder: ${reminder.message}`;

    if (reminder.message_details) {
      message += `\n\n📝 Details: ${reminder.message_details.substring(0, 200)}`;
    }

    if (reminder.dump) {
      message += `\n\n📎 Related content: ${reminder.dump.raw_content.substring(0, 200)}`;
    }

    if (reminder.recurrence_pattern) {
      message += '\n\n🔁 This is a recurring reminder';
    }

    return message;
  }
}
