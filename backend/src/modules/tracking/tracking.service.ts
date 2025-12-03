import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dump } from '../../entities/dump.entity';
import {
  Reminder,
  ReminderType,
  ReminderStatus,
} from '../../entities/reminder.entity';
import {
  TrackableItem,
  TrackingStatus,
  TrackingType,
  TrackingCheckpoint,
} from '../../entities/trackable-item.entity';
import { ReminderService } from '../reminders/reminder.service';

@Injectable()
export class TrackingService {
  private readonly logger = new Logger(TrackingService.name);

  constructor(
    @InjectRepository(Dump)
    private readonly dumpRepository: Repository<Dump>,
    @InjectRepository(Reminder)
    private readonly reminderRepository: Repository<Reminder>,
    @InjectRepository(TrackableItem)
    private readonly trackableItemRepository: Repository<TrackableItem>,
    private readonly reminderService: ReminderService,
  ) {}

  async createTrackableItem(
    userId: string,
    dumpId: string | null,
    options: {
      type: TrackingType;
      title: string;
      description?: string;
      expectedEndDate?: Date;
      metadata?: Record<string, any>;
      autoReminders?: boolean;
    },
  ): Promise<TrackableItem> {
    const now = new Date();

    const trackableItem = this.trackableItemRepository.create({
      user_id: userId,
      dump_id: dumpId || undefined,
      type: options.type,
      title: options.title,
      description: options.description,
      status: TrackingStatus.PENDING,
      start_date: now,
      expected_end_date: options.expectedEndDate,
      metadata: options.metadata || {},
      checkpoints: [
        {
          timestamp: now,
          status: 'Created',
          notes: 'Item created for tracking',
        },
      ],
      reminder_ids: [],
    });

    const saved = await this.trackableItemRepository.save(trackableItem);
    this.logger.log(`Created trackable item ${saved.id} for user ${userId}`);

    if (options.autoReminders && options.expectedEndDate) {
      await this.createAutoReminders(saved);
    }

    return saved;
  }

  async getTrackableItem(itemId: string): Promise<TrackableItem | null> {
    return await this.trackableItemRepository.findOne({
      where: { id: itemId },
    });
  }

  async getUserTrackableItems(
    userId: string,
    filters?: {
      type?: TrackingType;
      status?: TrackingStatus;
      activeOnly?: boolean;
    },
  ): Promise<TrackableItem[]> {
    const queryBuilder =
      this.trackableItemRepository.createQueryBuilder('item');

    queryBuilder.where('item.user_id = :userId', { userId });

    if (filters?.type) {
      queryBuilder.andWhere('item.type = :type', { type: filters.type });
    }

    if (filters?.status) {
      queryBuilder.andWhere('item.status = :status', {
        status: filters.status,
      });
    }

    if (filters?.activeOnly) {
      queryBuilder.andWhere('item.status IN (:...statuses)', {
        statuses: [TrackingStatus.PENDING, TrackingStatus.IN_PROGRESS],
      });
    }

    queryBuilder.orderBy('item.updated_at', 'DESC');

    return await queryBuilder.getMany();
  }

  async updateTrackingStatus(
    itemId: string,
    checkpoint: {
      status: string;
      location?: string;
      notes?: string;
      source?: string;
    },
  ): Promise<TrackableItem> {
    const item = await this.trackableItemRepository.findOne({
      where: { id: itemId },
    });

    if (!item) {
      throw new Error(`Trackable item ${itemId} not found`);
    }

    const newCheckpoint: TrackingCheckpoint = {
      timestamp: new Date(),
      ...checkpoint,
    };

    item.checkpoints.push(newCheckpoint);

    if (checkpoint.status.toLowerCase().includes('delivered')) {
      item.status = TrackingStatus.COMPLETED;
      item.actual_end_date = newCheckpoint.timestamp;
    } else if (checkpoint.status.toLowerCase().includes('cancelled')) {
      item.status = TrackingStatus.CANCELLED;
    } else {
      item.status = TrackingStatus.IN_PROGRESS;
    }

    const updated = await this.trackableItemRepository.save(item);
    this.logger.log(`Updated tracking for item ${itemId}: ${checkpoint.status}`);

    return updated;
  }

  async completeTracking(itemId: string): Promise<TrackableItem> {
    const item = await this.trackableItemRepository.findOne({
      where: { id: itemId },
    });

    if (!item) {
      throw new Error(`Trackable item ${itemId} not found`);
    }

    item.status = TrackingStatus.COMPLETED;
    item.actual_end_date = new Date();

    item.checkpoints.push({
      timestamp: new Date(),
      status: 'Completed',
      notes: 'Item marked as completed',
    });

    const updated = await this.trackableItemRepository.save(item);
    this.logger.log(`Completed tracking for item ${itemId}`);

    await this.cancelPendingReminders(item);

    return updated;
  }

  async deleteTrackableItem(itemId: string): Promise<void> {
    const item = await this.trackableItemRepository.findOne({
      where: { id: itemId },
    });

    if (!item) {
      throw new Error(`Trackable item ${itemId} not found`);
    }

    await this.cancelPendingReminders(item);

    await this.trackableItemRepository.delete(itemId);
    this.logger.log(`Deleted trackable item ${itemId}`);
  }

  async detectTrackableItems(
    userId: string,
    dumpId: string,
  ): Promise<{
    detected: boolean;
    suggestions: Array<{
      type: TrackingType;
      title: string;
      description: string;
      confidence: number;
      expectedDuration?: number;
    }>;
  }> {
    const dump = await this.dumpRepository.findOne({
      where: { id: dumpId, user_id: userId },
    });

    if (!dump) {
      return { detected: false, suggestions: [] };
    }

    const content = (dump.raw_content || '').toLowerCase();
    const suggestions: Array<{
      type: TrackingType;
      title: string;
      description: string;
      confidence: number;
      expectedDuration?: number;
    }> = [];

    if (
      content.includes('tracking number') ||
      content.includes('shipment') ||
      content.includes('delivery')
    ) {
      suggestions.push({
        type: TrackingType.PACKAGE,
        title: 'Package Delivery',
        description: 'Track this package delivery',
        confidence: 80,
        expectedDuration: 7,
      });
    }

    if (
      content.includes('application') ||
      content.includes('submitted') ||
      content.includes('review')
    ) {
      suggestions.push({
        type: TrackingType.APPLICATION,
        title: 'Application Status',
        description: 'Track this application',
        confidence: 70,
        expectedDuration: 30,
      });
    }

    if (
      content.includes('subscription') ||
      content.includes('renew') ||
      content.includes('trial')
    ) {
      suggestions.push({
        type: TrackingType.SUBSCRIPTION,
        title: 'Subscription',
        description: 'Track this subscription',
        confidence: 75,
        expectedDuration: 365,
      });
    }

    if (content.includes('warranty') || content.includes('guarantee')) {
      suggestions.push({
        type: TrackingType.WARRANTY,
        title: 'Warranty',
        description: 'Track this warranty period',
        confidence: 85,
        expectedDuration: 365,
      });
    }

    return {
      detected: suggestions.length > 0,
      suggestions,
    };
  }

  private async createAutoReminders(item: TrackableItem): Promise<void> {
    if (!item.expected_end_date) {
      return;
    }

    const reminders: Array<{ days: number; message: string }> = [];

    switch (item.type) {
      case TrackingType.PACKAGE:
        reminders.push(
          { days: 1, message: 'Package expected to arrive today' },
          { days: 7, message: 'Package expected to arrive in 1 week' },
        );
        break;

      case TrackingType.APPLICATION:
        reminders.push(
          { days: 7, message: 'Application review due in 1 week' },
          { days: 14, message: 'Application review due in 2 weeks' },
        );
        break;

      case TrackingType.SUBSCRIPTION:
        reminders.push(
          { days: 7, message: 'Subscription renewal in 1 week' },
          { days: 30, message: 'Subscription renewal in 1 month' },
        );
        break;

      case TrackingType.WARRANTY:
        reminders.push(
          { days: 30, message: 'Warranty expires in 1 month' },
          { days: 90, message: 'Warranty expires in 3 months' },
        );
        break;

      default:
        reminders.push({ days: 1, message: 'Item due today' });
    }

    for (const reminder of reminders) {
      const reminderDate = new Date(item.expected_end_date);
      reminderDate.setDate(reminderDate.getDate() - reminder.days);

      if (reminderDate > new Date()) {
        try {
          const created = await this.reminderService.createReminder({
            userId: item.user_id,
            dumpId: item.dump_id,
            message: `${item.title}: ${reminder.message}`,
            reminderType: ReminderType.DEADLINE,
            scheduledFor: reminderDate,
            aiConfidence: 75,
          });

          item.reminder_ids.push(created.id);
          await this.trackableItemRepository.save(item);

          this.logger.log(`Created auto-reminder for ${item.id} at ${reminderDate.toISOString()}`);
        } catch (error) {
          this.logger.warn(`Failed to create auto-reminder: ${error.message}`);
        }
      }
    }
  }

  private async cancelPendingReminders(item: TrackableItem): Promise<void> {
    for (const reminderId of item.reminder_ids) {
      try {
        const reminder = await this.reminderRepository.findOne({
          where: { id: reminderId },
        });

        if (reminder && reminder.status === ReminderStatus.PENDING) {
          reminder.status = ReminderStatus.DISMISSED;
          await this.reminderRepository.save(reminder);
          this.logger.log(`Cancelled reminder ${reminderId} for item ${item.id}`);
        }
      } catch (error) {
        this.logger.warn(`Failed to cancel reminder ${reminderId}: ${error.message}`);
      }
    }
  }

  async getTrackingStats(userId: string): Promise<{
    total: number;
    active: number;
    completed: number;
    byType: Record<TrackingType, number>;
  }> {
    const items = await this.getUserTrackableItems(userId);

    const stats = {
      total: items.length,
      active: 0,
      completed: 0,
      byType: {} as Record<TrackingType, number>,
    };

    for (const item of items) {
      if (
        item.status === TrackingStatus.PENDING ||
        item.status === TrackingStatus.IN_PROGRESS
      ) {
        stats.active++;
      }

      if (item.status === TrackingStatus.COMPLETED) {
        stats.completed++;
      }

      stats.byType[item.type] = (stats.byType[item.type] || 0) + 1;
    }

    return stats;
  }

  async checkOverdueItems(): Promise<{
    overdueCount: number;
    alertsCreated: number;
  }> {
    const now = new Date();
    let overdueCount = 0;
    let alertsCreated = 0;

    const items = await this.trackableItemRepository.find({
      where: {
        status: TrackingStatus.PENDING as any,
      },
    });

    for (const item of items) {
      if (
        item.expected_end_date &&
        item.expected_end_date < now &&
        (item.status === TrackingStatus.PENDING ||
          item.status === TrackingStatus.IN_PROGRESS)
      ) {
        overdueCount++;

        const hasOverdueAlert = item.checkpoints.some(
          (cp) => cp.status === 'Overdue Alert',
        );

        if (!hasOverdueAlert) {
          try {
            await this.reminderService.createReminder({
              userId: item.user_id,
              dumpId: item.dump_id,
              message: `⚠️ ${item.title} is overdue!`,
              reminderType: ReminderType.DEADLINE,
              scheduledFor: now,
              aiConfidence: 100,
            });

            item.checkpoints.push({
              timestamp: now,
              status: 'Overdue Alert',
              notes: 'Item is overdue',
            });

            item.status = TrackingStatus.EXPIRED;
            await this.trackableItemRepository.save(item);

            alertsCreated++;
            this.logger.log(`Created overdue alert for item ${item.id}`);
          } catch (error) {
            this.logger.warn(`Failed to create overdue alert for ${item.id}: ${error.message}`);
          }
        }
      }
    }

    this.logger.log(`Checked overdue items: ${overdueCount} overdue, ${alertsCreated} alerts created`);

    return { overdueCount, alertsCreated };
  }
}
