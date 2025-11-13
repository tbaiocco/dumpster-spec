import { Injectable, Logger } from '@nestjs/common';
import { TelegramService } from '../bots/telegram.service';
import { WhatsAppService } from '../bots/whatsapp.service';
import { UserService } from '../users/user.service';

export enum NotificationChannel {
  TELEGRAM = 'telegram',
  WHATSAPP = 'whatsapp',
  EMAIL = 'email',
  SMS = 'sms',
}

export enum NotificationType {
  DIGEST = 'digest',
  REMINDER = 'reminder',
  ALERT = 'alert',
  UPDATE = 'update',
}

export interface DeliveryRequest {
  userId: string;
  channel?: NotificationChannel;
  type: NotificationType;
  message: string;
  priority?: 'high' | 'medium' | 'low';
  metadata?: Record<string, any>;
}

export interface DeliveryResult {
  success: boolean;
  channel: NotificationChannel;
  deliveredAt: Date;
  messageId?: string;
  error?: string;
}

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(
    private readonly telegramService: TelegramService,
    private readonly whatsappService: WhatsAppService,
    private readonly userService: UserService,
  ) {}

  /**
   * Send a digest to a user
   * Automatically selects the best channel
   */
  async sendDigest(userId: string, digestContent: string): Promise<DeliveryResult> {
    return this.deliver({
      userId,
      type: NotificationType.DIGEST,
      message: digestContent,
      priority: 'medium',
    });
  }

  /**
   * Send a reminder to a user
   * Automatically selects the best channel
   */
  async sendReminder(userId: string, reminderMessage: string): Promise<DeliveryResult> {
    return this.deliver({
      userId,
      type: NotificationType.REMINDER,
      message: reminderMessage,
      priority: 'high',
    });
  }

  /**
   * Send an alert notification to a user
   */
  async sendAlert(userId: string, alertMessage: string): Promise<DeliveryResult> {
    return this.deliver({
      userId,
      type: NotificationType.ALERT,
      message: alertMessage,
      priority: 'high',
    });
  }

  /**
   * Send an update notification to a user
   */
  async sendUpdate(userId: string, updateMessage: string): Promise<DeliveryResult> {
    return this.deliver({
      userId,
      type: NotificationType.UPDATE,
      message: updateMessage,
      priority: 'low',
    });
  }

  /**
   * Main delivery method - routes to appropriate channel
   */
  async deliver(request: DeliveryRequest): Promise<DeliveryResult> {
    this.logger.log(
      `Delivering ${request.type} notification to user ${request.userId}`,
    );

    try {
      // Get user to determine preferred channel
      const user = await this.userService.findOne(request.userId);

      if (!user) {
        throw new Error(`User ${request.userId} not found`);
      }

      // Determine delivery channel
      const channel = request.channel || await this.selectBestChannel(user);

      // Route to appropriate channel handler
      let result: DeliveryResult;

      switch (channel) {
        case NotificationChannel.TELEGRAM:
          result = await this.deliverViaTelegram(request);
          break;
        case NotificationChannel.WHATSAPP:
          result = await this.deliverViaWhatsApp(request);
          break;
        case NotificationChannel.EMAIL:
          result = await this.deliverViaEmail(request);
          break;
        case NotificationChannel.SMS:
          result = await this.deliverViaSMS(request);
          break;
        default:
          throw new Error(`Unsupported channel: ${channel}`);
      }

      this.logger.log(
        `Successfully delivered ${request.type} to user ${request.userId} via ${result.channel}`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to deliver notification to user ${request.userId}`,
        error,
      );

      return {
        success: false,
        channel: request.channel || NotificationChannel.TELEGRAM,
        deliveredAt: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Deliver notification to multiple users
   */
  async deliverToMultiple(
    userIds: string[],
    request: Omit<DeliveryRequest, 'userId'>,
  ): Promise<DeliveryResult[]> {
    this.logger.log(`Delivering notification to ${userIds.length} users`);

    const results = await Promise.allSettled(
      userIds.map((userId) =>
        this.deliver({
          ...request,
          userId,
        }),
      ),
    );

    const deliveryResults: DeliveryResult[] = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          success: false,
          channel: request.channel || NotificationChannel.TELEGRAM,
          deliveredAt: new Date(),
          error: result.reason?.message || 'Delivery failed',
        };
      }
    });

    const successCount = deliveryResults.filter((r) => r.success).length;
    this.logger.log(
      `Bulk delivery complete: ${successCount}/${userIds.length} successful`,
    );

    return deliveryResults;
  }

  // Private channel-specific delivery methods

  private async deliverViaTelegram(
    request: DeliveryRequest,
  ): Promise<DeliveryResult> {
    this.logger.debug(`Delivering via Telegram to user ${request.userId}`);

    try {
      const user = await this.userService.findOne(request.userId);

      if (!user?.chat_id_telegram) {
        throw new Error('User does not have Telegram configured');
      }

      // Format message based on type
      const formattedMessage = this.formatMessageForTelegram(
        request.message,
        request.type,
      );

      // Send via Telegram
      await this.telegramService.sendMessage({
        chat_id: Number.parseInt(user.chat_id_telegram, 10),
        text: formattedMessage,
        parse_mode: 'HTML',
      });

      return {
        success: true,
        channel: NotificationChannel.TELEGRAM,
        deliveredAt: new Date(),
      };
    } catch (error) {
      throw new Error(
        `Telegram delivery failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private async deliverViaWhatsApp(
    request: DeliveryRequest,
  ): Promise<DeliveryResult> {
    this.logger.debug(`Delivering via WhatsApp to user ${request.userId}`);

    try {
      const user = await this.userService.findOne(request.userId);

      if (!user?.phone_number) {
        throw new Error('User does not have WhatsApp configured');
      }

      // Format message based on type
      const formattedMessage = this.formatMessageForWhatsApp(
        request.message,
        request.type,
      );

      // Send via WhatsApp (using Twilio API format)
      await this.whatsappService.sendMessage({
        messaging_product: 'whatsapp',
        to: user.phone_number,
        type: 'text',
        text: {
          body: formattedMessage,
        },
      });

      return {
        success: true,
        channel: NotificationChannel.WHATSAPP,
        deliveredAt: new Date(),
      };
    } catch (error) {
      throw new Error(
        `WhatsApp delivery failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private async deliverViaEmail(
    request: DeliveryRequest,
  ): Promise<DeliveryResult> {
    this.logger.debug(`Delivering via Email to user ${request.userId}`);

    // Email delivery not yet implemented
    throw new Error('Email delivery not yet implemented');
  }

  private async deliverViaSMS(
    request: DeliveryRequest,
  ): Promise<DeliveryResult> {
    this.logger.debug(`Delivering via SMS to user ${request.userId}`);

    // SMS delivery not yet implemented
    throw new Error('SMS delivery not yet implemented');
  }

  // Private helper methods

  private async selectBestChannel(user: any): Promise<NotificationChannel> {
    // Priority order: Telegram > WhatsApp > Email > SMS
    if (user.chat_id_telegram) {
      return NotificationChannel.TELEGRAM;
    }

    if (user.phone_number) {
      return NotificationChannel.WHATSAPP;
    }

    // Fallback to email if available
    if (user.email) {
      return NotificationChannel.EMAIL;
    }

    // Default to Telegram (will fail if not configured)
    return NotificationChannel.TELEGRAM;
  }

  private formatMessageForTelegram(
    message: string,
    type: NotificationType,
  ): string {
    const emoji = this.getEmojiForType(type);
    return `${emoji} <b>${this.getTypeLabel(type)}</b>\n\n${message}`;
  }

  private formatMessageForWhatsApp(
    message: string,
    type: NotificationType,
  ): string {
    const emoji = this.getEmojiForType(type);
    return `${emoji} *${this.getTypeLabel(type)}*\n\n${message}`;
  }

  private getEmojiForType(type: NotificationType): string {
    switch (type) {
      case NotificationType.DIGEST:
        return '📬';
      case NotificationType.REMINDER:
        return '🔔';
      case NotificationType.ALERT:
        return '⚠️';
      case NotificationType.UPDATE:
        return '📢';
      default:
        return '💬';
    }
  }

  private getTypeLabel(type: NotificationType): string {
    switch (type) {
      case NotificationType.DIGEST:
        return 'Daily Digest';
      case NotificationType.REMINDER:
        return 'Reminder';
      case NotificationType.ALERT:
        return 'Alert';
      case NotificationType.UPDATE:
        return 'Update';
      default:
        return 'Notification';
    }
  }

  /**
   * Get delivery statistics
   */
  async getDeliveryStats(userId?: string): Promise<{
    totalDeliveries: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    byChannel: Record<string, number>;
    byType: Record<string, number>;
  }> {
    // This would require storing delivery logs in the database
    // For now, return placeholder data
    return {
      totalDeliveries: 0,
      successfulDeliveries: 0,
      failedDeliveries: 0,
      byChannel: {},
      byType: {},
    };
  }
}
