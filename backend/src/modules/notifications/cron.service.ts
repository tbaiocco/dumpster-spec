import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { DigestService } from './digest.service';
import { ReminderService } from '../reminders/reminder.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Reminder, ReminderStatus } from '../../entities/reminder.entity';

export interface DeliveryService {
  sendDigest(userId: string, digestContent: string): Promise<void>;
  sendReminder(userId: string, reminderMessage: string): Promise<void>;
}

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);
  private deliveryService: DeliveryService | null = null;

  constructor(
    private readonly digestService: DigestService,
    private readonly reminderService: ReminderService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private schedulerRegistry: SchedulerRegistry,
  ) {}

  /**
   * Set the delivery service for sending notifications
   * This allows circular dependency resolution
   */
  setDeliveryService(service: DeliveryService): void {
    this.deliveryService = service;
    this.logger.log('Delivery service configured for cron jobs');
  }

  /**
   * Morning digest delivery - 8 AM daily
   * Sends daily digest to all active users
   */
  @Cron('0 8 * * *', {
    name: 'morning-digest',
    timeZone: 'America/New_York', // Default timezone, should be user-specific
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
    timeZone: 'America/New_York',
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

      this.logger.log(`Found ${pendingReminders.length} pending reminders to send`);

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
          this.logger.error(
            `Failed to deliver reminder ${reminder.id}`,
            error,
          );
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

    jobs.forEach((job, name) => {
      status[name] = {
        lastDate: job.lastDate(),
        nextDate: job.nextDate(),
      };
    });

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

    const digest = await this.digestService.generateMorningDigest(userId);
    const digestText = this.digestService.formatDigestAsText(digest);

    if (this.deliveryService) {
      await this.deliveryService.sendDigest(userId, digestText);
      this.logger.debug(`Morning digest delivered to user ${userId}`);
    } else {
      this.logger.warn('Delivery service not configured, digest not sent');
    }
  }

  private async deliverEveningDigest(userId: string): Promise<void> {
    this.logger.debug(`Generating evening digest for user ${userId}`);

    const digest = await this.digestService.generateEveningDigest(userId);
    const digestText = this.digestService.formatDigestAsText(digest);

    if (this.deliveryService) {
      await this.deliveryService.sendDigest(userId, digestText);
      this.logger.debug(`Evening digest delivered to user ${userId}`);
    } else {
      this.logger.warn('Delivery service not configured, digest not sent');
    }
  }

  private async deliverReminder(reminder: Reminder): Promise<void> {
    this.logger.debug(`Delivering reminder ${reminder.id}`);

    const message = this.formatReminderMessage(reminder);

    if (this.deliveryService) {
      await this.deliveryService.sendReminder(reminder.user_id, message);
      await this.reminderService.markReminderAsSent(reminder.id);
      this.logger.debug(`Reminder ${reminder.id} delivered and marked as sent`);
    } else {
      this.logger.warn('Delivery service not configured, reminder not sent');
    }
  }

  private formatReminderMessage(reminder: Reminder): string {
    let message = `🔔 Reminder: ${reminder.message}`;

    if (reminder.dump) {
      message += `\n\n📎 Related content: ${reminder.dump.raw_content.substring(0, 100)}`;
    }

    if (reminder.recurrence_pattern) {
      message += '\n\n🔁 This is a recurring reminder';
    }

    return message;
  }
}
