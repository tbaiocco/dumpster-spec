import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dump } from '../../entities/dump.entity';
import {
  Reminder,
  ReminderType,
  ReminderStatus,
} from '../../entities/reminder.entity';
import { ReminderService } from '../reminders/reminder.service';

/**
 * Tracking status for items
 */
export enum TrackingStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

/**
 * Type of trackable item
 */
export enum TrackingType {
  PACKAGE = 'package',
  APPLICATION = 'application',
  SUBSCRIPTION = 'subscription',
  WARRANTY = 'warranty',
  LOAN = 'loan',
  INSURANCE = 'insurance',
  OTHER = 'other',
}

/**
 * Trackable item interface
 */
export interface TrackableItem {
  id: string;
  dumpId: string;
  userId: string;
  type: TrackingType;
  title: string;
  description?: string;
  status: TrackingStatus;
  startDate: Date;
  expectedEndDate?: Date;
  actualEndDate?: Date;
  metadata: Record<string, any>;
  checkpoints: TrackingCheckpoint[];
  reminders: string[]; // Reminder IDs
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Tracking checkpoint (status update)
 */
export interface TrackingCheckpoint {
  timestamp: Date;
  status: string;
  location?: string;
  notes?: string;
  source?: string;
}

/**
 * Service for tracking time-sensitive items
 *
 * Handles package deliveries, applications, subscriptions, warranties, etc.
 */
@Injectable()
export class TrackingService {
  private readonly logger = new Logger(TrackingService.name);

  // In-memory storage for trackable items (would be in database in production)
  private trackableItems: Map<string, TrackableItem> = new Map();

  constructor(
    @InjectRepository(Dump)
    private readonly dumpRepository: Repository<Dump>,
    @InjectRepository(Reminder)
    private readonly reminderRepository: Repository<Reminder>,
    private readonly reminderService: ReminderService,
  ) {}

  /**
   * Create a trackable item from a dump
   */
  async createTrackableItem(
    userId: string,
    dumpId: string,
    options: {
      type: TrackingType;
      title: string;
      description?: string;
      expectedEndDate?: Date;
      metadata?: Record<string, any>;
      autoReminders?: boolean;
    },
  ): Promise<TrackableItem> {
    const id = this.generateId();
    const now = new Date();

    const trackableItem: TrackableItem = {
      id,
      dumpId,
      userId,
      type: options.type,
      title: options.title,
      description: options.description,
      status: TrackingStatus.PENDING,
      startDate: now,
      expectedEndDate: options.expectedEndDate,
      metadata: options.metadata || {},
      checkpoints: [
        {
          timestamp: now,
          status: 'Created',
          notes: 'Item created for tracking',
        },
      ],
      reminders: [],
      createdAt: now,
      updatedAt: now,
    };

    this.trackableItems.set(id, trackableItem);
    this.logger.log(`Created trackable item ${id} for user ${userId}`);

    // Auto-create reminders if requested
    if (options.autoReminders && options.expectedEndDate) {
      await this.createAutoReminders(trackableItem);
    }

    return trackableItem;
  }

  /**
   * Get trackable item by ID
   */
  async getTrackableItem(itemId: string): Promise<TrackableItem | null> {
    return this.trackableItems.get(itemId) || null;
  }

  /**
   * Get all trackable items for a user
   */
  async getUserTrackableItems(
    userId: string,
    filters?: {
      type?: TrackingType;
      status?: TrackingStatus;
      activeOnly?: boolean;
    },
  ): Promise<TrackableItem[]> {
    let items = Array.from(this.trackableItems.values()).filter(
      (item) => item.userId === userId,
    );

    if (filters?.type) {
      items = items.filter((item) => item.type === filters.type);
    }

    if (filters?.status) {
      items = items.filter((item) => item.status === filters.status);
    }

    if (filters?.activeOnly) {
      items = items.filter(
        (item) =>
          item.status === TrackingStatus.PENDING ||
          item.status === TrackingStatus.IN_PROGRESS,
      );
    }

    return items.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /**
   * Update tracking status
   */
  async updateTrackingStatus(
    itemId: string,
    checkpoint: {
      status: string;
      location?: string;
      notes?: string;
      source?: string;
    },
  ): Promise<TrackableItem> {
    const item = this.trackableItems.get(itemId);
    if (!item) {
      throw new Error(`Trackable item ${itemId} not found`);
    }

    const newCheckpoint: TrackingCheckpoint = {
      timestamp: new Date(),
      ...checkpoint,
    };

    item.checkpoints.push(newCheckpoint);
    item.updatedAt = new Date();

    // Update status based on checkpoint
    if (checkpoint.status.toLowerCase().includes('delivered')) {
      item.status = TrackingStatus.COMPLETED;
      item.actualEndDate = newCheckpoint.timestamp;
    } else if (checkpoint.status.toLowerCase().includes('cancelled')) {
      item.status = TrackingStatus.CANCELLED;
    } else {
      item.status = TrackingStatus.IN_PROGRESS;
    }

    this.trackableItems.set(itemId, item);
    this.logger.log(
      `Updated tracking for item ${itemId}: ${checkpoint.status}`,
    );

    return item;
  }

  /**
   * Mark item as completed
   */
  async completeTracking(itemId: string): Promise<TrackableItem> {
    const item = this.trackableItems.get(itemId);
    if (!item) {
      throw new Error(`Trackable item ${itemId} not found`);
    }

    item.status = TrackingStatus.COMPLETED;
    item.actualEndDate = new Date();
    item.updatedAt = new Date();

    item.checkpoints.push({
      timestamp: new Date(),
      status: 'Completed',
      notes: 'Item marked as completed',
    });

    this.trackableItems.set(itemId, item);
    this.logger.log(`Completed tracking for item ${itemId}`);

    // Cancel any pending reminders
    await this.cancelPendingReminders(item);

    return item;
  }

  /**
   * Delete trackable item
   */
  async deleteTrackableItem(itemId: string): Promise<void> {
    const item = this.trackableItems.get(itemId);
    if (!item) {
      throw new Error(`Trackable item ${itemId} not found`);
    }

    // Cancel any associated reminders
    await this.cancelPendingReminders(item);

    this.trackableItems.delete(itemId);
    this.logger.log(`Deleted trackable item ${itemId}`);
  }

  /**
   * Auto-detect trackable items from dumps
   */
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
      expectedDuration?: number; // days
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

    // Detect package tracking
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

    // Detect application tracking
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

    // Detect subscription tracking
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

    // Detect warranty tracking
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

  /**
   * Create automatic reminders for a trackable item
   */
  private async createAutoReminders(item: TrackableItem): Promise<void> {
    if (!item.expectedEndDate) {
      return;
    }

    const reminders: Array<{ days: number; message: string }> = [];

    // Different reminder schedules based on type
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
      const reminderDate = new Date(item.expectedEndDate);
      reminderDate.setDate(reminderDate.getDate() - reminder.days);

      // Only create future reminders
      if (reminderDate > new Date()) {
        try {
          const created = await this.reminderService.createReminder({
            userId: item.userId,
            dumpId: item.dumpId,
            message: `${item.title}: ${reminder.message}`,
            reminderType: ReminderType.DEADLINE,
            scheduledFor: reminderDate,
            aiConfidence: 75,
          });

          item.reminders.push(created.id);
          this.logger.log(
            `Created auto-reminder for ${item.id} at ${reminderDate.toISOString()}`,
          );
        } catch (error) {
          this.logger.warn(`Failed to create auto-reminder: ${error.message}`);
        }
      }
    }

    this.trackableItems.set(item.id, item);
  }

  /**
   * Cancel pending reminders for an item
   */
  private async cancelPendingReminders(item: TrackableItem): Promise<void> {
    for (const reminderId of item.reminders) {
      try {
        const reminder = await this.reminderRepository.findOne({
          where: { id: reminderId },
        });

        if (reminder && reminder.status === ReminderStatus.PENDING) {
          reminder.status = ReminderStatus.DISMISSED;
          await this.reminderRepository.save(reminder);
          this.logger.log(
            `Cancelled reminder ${reminderId} for item ${item.id}`,
          );
        }
      } catch (error) {
        this.logger.warn(
          `Failed to cancel reminder ${reminderId}: ${error.message}`,
        );
      }
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `track_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get tracking statistics for a user
   */
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

  /**
   * Check for overdue items and create alerts
   */
  async checkOverdueItems(): Promise<{
    overdueCount: number;
    alertsCreated: number;
  }> {
    const now = new Date();
    let overdueCount = 0;
    let alertsCreated = 0;

    for (const item of this.trackableItems.values()) {
      if (
        item.expectedEndDate &&
        item.expectedEndDate < now &&
        (item.status === TrackingStatus.PENDING ||
          item.status === TrackingStatus.IN_PROGRESS)
      ) {
        overdueCount++;

        // Check if we already created an overdue alert
        const hasOverdueAlert = item.checkpoints.some(
          (cp) => cp.status === 'Overdue Alert',
        );

        if (!hasOverdueAlert) {
          try {
            // Create overdue reminder
            await this.reminderService.createReminder({
              userId: item.userId,
              dumpId: item.dumpId,
              message: `⚠️ ${item.title} is overdue!`,
              reminderType: ReminderType.DEADLINE,
              scheduledFor: now,
              aiConfidence: 100,
            });

            // Add checkpoint
            item.checkpoints.push({
              timestamp: now,
              status: 'Overdue Alert',
              notes: 'Item is overdue',
            });

            item.status = TrackingStatus.EXPIRED;
            item.updatedAt = now;
            this.trackableItems.set(item.id, item);

            alertsCreated++;
            this.logger.log(`Created overdue alert for item ${item.id}`);
          } catch (error) {
            this.logger.warn(
              `Failed to create overdue alert for ${item.id}: ${error.message}`,
            );
          }
        }
      }
    }

    this.logger.log(
      `Checked overdue items: ${overdueCount} overdue, ${alertsCreated} alerts created`,
    );

    return { overdueCount, alertsCreated };
  }
}
