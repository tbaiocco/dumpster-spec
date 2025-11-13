import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan, Between } from 'typeorm';
import { Reminder, ReminderType, ReminderStatus } from '../../entities/reminder.entity';
import { User } from '../../entities/user.entity';

export interface CreateReminderRequest {
  userId: string;
  dumpId?: string;
  message: string;
  reminderType?: ReminderType;
  scheduledFor: Date;
  locationData?: Record<string, any>;
  recurrencePattern?: Record<string, any>;
  aiConfidence?: number;
}

export interface UpdateReminderRequest {
  message?: string;
  scheduledFor?: Date;
  status?: ReminderStatus;
  locationData?: Record<string, any>;
  recurrencePattern?: Record<string, any>;
}

export interface ReminderFilters {
  userId?: string;
  status?: ReminderStatus;
  reminderType?: ReminderType;
  startDate?: Date;
  endDate?: Date;
  includeRecurring?: boolean;
}

@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);

  constructor(
    @InjectRepository(Reminder)
    private reminderRepository: Repository<Reminder>,
  ) {}

  /**
   * Create a new reminder
   */
  async createReminder(request: CreateReminderRequest): Promise<Reminder> {
    this.logger.log(`Creating reminder for user ${request.userId}`);

    const reminder = this.reminderRepository.create({
      user_id: request.userId,
      dump_id: request.dumpId,
      message: request.message,
      reminder_type: request.reminderType || ReminderType.FOLLOW_UP,
      scheduled_for: request.scheduledFor,
      status: ReminderStatus.PENDING,
      location_data: request.locationData,
      recurrence_pattern: request.recurrencePattern,
      ai_confidence: request.aiConfidence || 100,
    });

    const saved = await this.reminderRepository.save(reminder);
    this.logger.log(`Created reminder ${saved.id} scheduled for ${saved.scheduled_for}`);

    return saved;
  }

  /**
   * Get reminder by ID
   */
  async getReminderById(reminderId: string): Promise<Reminder> {
    const reminder = await this.reminderRepository.findOne({
      where: { id: reminderId },
      relations: ['user', 'dump'],
    });

    if (!reminder) {
      throw new NotFoundException(`Reminder ${reminderId} not found`);
    }

    return reminder;
  }

  /**
   * Get reminders for a user with optional filters
   */
  async getUserReminders(
    userId: string,
    filters?: ReminderFilters,
  ): Promise<Reminder[]> {
    const query = this.reminderRepository
      .createQueryBuilder('reminder')
      .where('reminder.user_id = :userId', { userId })
      .leftJoinAndSelect('reminder.dump', 'dump')
      .orderBy('reminder.scheduled_for', 'ASC');

    if (filters?.status) {
      query.andWhere('reminder.status = :status', { status: filters.status });
    }

    if (filters?.reminderType) {
      query.andWhere('reminder.reminder_type = :reminderType', {
        reminderType: filters.reminderType,
      });
    }

    if (filters?.startDate && filters?.endDate) {
      query.andWhere('reminder.scheduled_for BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    } else if (filters?.startDate) {
      query.andWhere('reminder.scheduled_for >= :startDate', {
        startDate: filters.startDate,
      });
    } else if (filters?.endDate) {
      query.andWhere('reminder.scheduled_for <= :endDate', {
        endDate: filters.endDate,
      });
    }

    if (filters?.includeRecurring === false) {
      query.andWhere('reminder.reminder_type != :recurring', {
        recurring: ReminderType.RECURRING,
      });
    }

    const reminders = await query.getMany();
    this.logger.log(`Found ${reminders.length} reminders for user ${userId}`);

    return reminders;
  }

  /**
   * Get pending reminders that should be sent now
   */
  async getPendingReminders(beforeDate?: Date): Promise<Reminder[]> {
    const cutoffDate = beforeDate || new Date();

    const reminders = await this.reminderRepository.find({
      where: {
        status: ReminderStatus.PENDING,
        scheduled_for: LessThan(cutoffDate),
      },
      relations: ['user', 'dump'],
      order: {
        scheduled_for: 'ASC',
      },
    });

    this.logger.log(
      `Found ${reminders.length} pending reminders before ${cutoffDate.toISOString()}`,
    );

    return reminders;
  }

  /**
   * Get upcoming reminders within a time window
   */
  async getUpcomingReminders(
    userId: string,
    hoursAhead: number = 24,
  ): Promise<Reminder[]> {
    const now = new Date();
    const futureDate = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

    const reminders = await this.reminderRepository.find({
      where: {
        user_id: userId,
        status: ReminderStatus.PENDING,
        scheduled_for: Between(now, futureDate),
      },
      relations: ['dump'],
      order: {
        scheduled_for: 'ASC',
      },
    });

    this.logger.log(
      `Found ${reminders.length} upcoming reminders for user ${userId} in next ${hoursAhead} hours`,
    );

    return reminders;
  }

  /**
   * Update a reminder
   */
  async updateReminder(
    reminderId: string,
    updates: UpdateReminderRequest,
  ): Promise<Reminder> {
    const reminder = await this.getReminderById(reminderId);

    if (updates.message !== undefined) {
      reminder.message = updates.message;
    }

    if (updates.scheduledFor !== undefined) {
      reminder.scheduled_for = updates.scheduledFor;
    }

    if (updates.status !== undefined) {
      reminder.status = updates.status;
      if (updates.status === ReminderStatus.SENT && !reminder.sent_at) {
        reminder.sent_at = new Date();
      }
    }

    if (updates.locationData !== undefined) {
      reminder.location_data = updates.locationData;
    }

    if (updates.recurrencePattern !== undefined) {
      reminder.recurrence_pattern = updates.recurrencePattern;
    }

    const updated = await this.reminderRepository.save(reminder);
    this.logger.log(`Updated reminder ${reminderId}`);

    return updated;
  }

  /**
   * Mark reminder as sent
   */
  async markReminderAsSent(reminderId: string): Promise<Reminder> {
    return this.updateReminder(reminderId, {
      status: ReminderStatus.SENT,
    });
  }

  /**
   * Snooze a reminder
   */
  async snoozeReminder(
    reminderId: string,
    snoozeMinutes: number,
  ): Promise<Reminder> {
    const reminder = await this.getReminderById(reminderId);
    const newScheduledTime = new Date(
      reminder.scheduled_for.getTime() + snoozeMinutes * 60 * 1000,
    );

    return this.updateReminder(reminderId, {
      scheduledFor: newScheduledTime,
      status: ReminderStatus.SNOOZED,
    });
  }

  /**
   * Dismiss a reminder
   */
  async dismissReminder(reminderId: string): Promise<Reminder> {
    return this.updateReminder(reminderId, {
      status: ReminderStatus.DISMISSED,
    });
  }

  /**
   * Delete a reminder
   */
  async deleteReminder(reminderId: string): Promise<void> {
    const reminder = await this.getReminderById(reminderId);
    await this.reminderRepository.remove(reminder);
    this.logger.log(`Deleted reminder ${reminderId}`);
  }

  /**
   * Handle recurring reminders - create next occurrence
   */
  async createNextRecurrence(reminderId: string): Promise<Reminder | null> {
    const reminder = await this.getReminderById(reminderId);

    if (reminder.reminder_type !== ReminderType.RECURRING) {
      this.logger.warn(`Reminder ${reminderId} is not recurring`);
      return null;
    }

    if (!reminder.recurrence_pattern) {
      this.logger.warn(`Reminder ${reminderId} has no recurrence pattern`);
      return null;
    }

    // Calculate next scheduled time based on recurrence pattern
    const nextScheduledTime = this.calculateNextRecurrence(
      reminder.scheduled_for,
      reminder.recurrence_pattern,
    );

    if (!nextScheduledTime) {
      this.logger.warn(
        `Could not calculate next recurrence for reminder ${reminderId}`,
      );
      return null;
    }

    // Create new reminder for next occurrence
    const nextReminder = await this.createReminder({
      userId: reminder.user_id,
      dumpId: reminder.dump_id,
      message: reminder.message,
      reminderType: ReminderType.RECURRING,
      scheduledFor: nextScheduledTime,
      recurrencePattern: reminder.recurrence_pattern,
      locationData: reminder.location_data,
      aiConfidence: reminder.ai_confidence,
    });

    this.logger.log(
      `Created next recurrence ${nextReminder.id} for ${nextScheduledTime}`,
    );

    return nextReminder;
  }

  /**
   * Calculate next recurrence date based on pattern
   */
  private calculateNextRecurrence(
    currentDate: Date,
    pattern: Record<string, any>,
  ): Date | null {
    const { frequency, interval = 1 } = pattern;

    const nextDate = new Date(currentDate);

    switch (frequency) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + interval);
        break;
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + interval * 7);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + interval);
        break;
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + interval);
        break;
      default:
        this.logger.warn(`Unknown recurrence frequency: ${frequency}`);
        return null;
    }

    return nextDate;
  }

  /**
   * Get reminder statistics for a user
   */
  async getReminderStats(userId: string): Promise<{
    total: number;
    pending: number;
    sent: number;
    dismissed: number;
    upcoming24h: number;
  }> {
    const all = await this.getUserReminders(userId);
    const pending = all.filter((r) => r.status === ReminderStatus.PENDING);
    const sent = all.filter((r) => r.status === ReminderStatus.SENT);
    const dismissed = all.filter((r) => r.status === ReminderStatus.DISMISSED);
    const upcoming = await this.getUpcomingReminders(userId, 24);

    return {
      total: all.length,
      pending: pending.length,
      sent: sent.length,
      dismissed: dismissed.length,
      upcoming24h: upcoming.length,
    };
  }
}
