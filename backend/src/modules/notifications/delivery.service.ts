import { Injectable, Logger } from '@nestjs/common';
import { TelegramService } from '../bots/telegram.service';
import { WhatsAppService } from '../bots/whatsapp.service';
import { UserService } from '../users/user.service';
import { EmailService } from './email.service';

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

export interface DeliveryService {
  sendDigest(userId: string, digestContent: string): Promise<DeliveryResult>;
  sendReminder(
    userId: string,
    reminderMessage: string,
  ): Promise<DeliveryResult>;
  sendAlert(userId: string, alertMessage: string): Promise<DeliveryResult>;
  sendUpdate(userId: string, updateMessage: string): Promise<DeliveryResult>;
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
export class DeliveryService implements DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(
    private readonly telegramService: TelegramService,
    private readonly whatsappService: WhatsAppService,
    private readonly userService: UserService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Send a digest to a user
   * Automatically selects the best channel
   */
  async sendDigest(
    userId: string,
    digestContent: string,
  ): Promise<DeliveryResult> {
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
  async sendReminder(
    userId: string,
    reminderMessage: string,
  ): Promise<DeliveryResult> {
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
  async sendAlert(
    userId: string,
    alertMessage: string,
  ): Promise<DeliveryResult> {
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
  async sendUpdate(
    userId: string,
    updateMessage: string,
  ): Promise<DeliveryResult> {
    return this.deliver({
      userId,
      type: NotificationType.UPDATE,
      message: updateMessage,
      priority: 'low',
    });
  }

  /**
   * Main delivery method - routes to appropriate channel(s)
   * Email is always sent if user has an email address
   * Additionally, one other channel is selected: Telegram > WhatsApp > SMS
   */
  async deliver(request: DeliveryRequest): Promise<DeliveryResult> {
    this.logger.log(
      `Delivering ${request.type} notification to user ${request.userId}`,
    );

    try {
      // Get user to determine available channels
      const user = await this.userService.findOne(request.userId);

      if (!user) {
        throw new Error(`User ${request.userId} not found`);
      }

      const results: DeliveryResult[] = [];

      // Always send to email if available (primary channel)
      if (user.email) {
        const emailResult = await this.attemptEmailDelivery(request, user);
        results.push(emailResult);
      }

      // Select and send to one additional channel (Telegram > WhatsApp > SMS)
      const additionalChannel =
        request.channel || (await this.selectAdditionalChannel(user));

      if (additionalChannel) {
        const additionalResult = await this.attemptAdditionalChannelDelivery(
          request,
          additionalChannel,
        );
        results.push(additionalResult);
      }

      // Return the first successful result, or the last result if all failed
      const successfulResult = results.find((r) => r.success);
      const finalResult = successfulResult || results.at(-1);

      if (!finalResult) {
        throw new Error('No delivery channels available for user');
      }

      // Log summary
      const successCount = results.filter((r) => r.success).length;
      this.logger.log(
        `Delivery complete for user ${request.userId}: ${successCount}/${results.length} channels successful`,
      );

      return finalResult;
    } catch (error) {
      this.logger.error(
        `Failed to deliver notification to user ${request.userId}`,
        error,
      );

      return {
        success: false,
        channel: request.channel || NotificationChannel.EMAIL,
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

  // Private helper methods for delivery attempts

  /**
   * Attempt to deliver via email with error handling
   */
  private async attemptEmailDelivery(
    request: DeliveryRequest,
    user: any,
  ): Promise<DeliveryResult> {
    try {
      const emailResult = await this.deliverViaEmail(request);

      if (emailResult.success) {
        this.logger.log(
          `Email delivered to user ${request.userId} at ${user.email}`,
        );
      } else {
        this.logger.warn(
          `Email delivery failed for user ${request.userId}: ${emailResult.error}`,
        );
      }

      return emailResult;
    } catch (error) {
      this.logger.error(
        `Email delivery error for user ${request.userId}`,
        error,
      );
      return {
        success: false,
        channel: NotificationChannel.EMAIL,
        deliveredAt: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Attempt to deliver via additional channel with error handling
   */
  private async attemptAdditionalChannelDelivery(
    request: DeliveryRequest,
    channel: NotificationChannel,
  ): Promise<DeliveryResult> {
    try {
      let result: DeliveryResult;

      switch (channel) {
        case NotificationChannel.TELEGRAM:
          result = await this.deliverViaTelegram(request);
          break;
        case NotificationChannel.WHATSAPP:
          result = await this.deliverViaWhatsApp(request);
          break;
        case NotificationChannel.SMS:
          result = await this.deliverViaSMS(request);
          break;
        default:
          throw new Error(`Unsupported channel: ${channel}`);
      }

      if (result.success) {
        this.logger.log(
          `Successfully delivered ${request.type} to user ${request.userId} via ${result.channel}`,
        );
      } else {
        this.logger.warn(
          `${channel} delivery failed for user ${request.userId}: ${result.error}`,
        );
      }

      return result;
    } catch (error) {
      this.logger.error(
        `${channel} delivery error for user ${request.userId}`,
        error,
      );
      return {
        success: false,
        channel,
        deliveredAt: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
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

    try {
      const user = await this.userService.findOne(request.userId);

      // Check if user has email field (may not be in entity yet)
      const userEmail = (user as any)?.email;
      if (!userEmail) {
        throw new Error('User does not have email configured');
      }

      // Format message based on type
      const subject = this.getEmailSubject(request.type);
      const formattedMessage = this.formatMessageForEmail(
        request.message,
        request.type,
      );

      // Send via Email
      const result = await this.emailService.sendEmail({
        to: userEmail,
        subject,
        text: formattedMessage,
      });

      if (!result.success) {
        throw new Error(result.error || 'Email send failed');
      }

      return {
        success: true,
        channel: NotificationChannel.EMAIL,
        deliveredAt: new Date(),
        messageId: result.messageId,
      };
    } catch (error) {
      throw new Error(
        `Email delivery failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private async deliverViaSMS(
    request: DeliveryRequest,
  ): Promise<DeliveryResult> {
    this.logger.debug(`Delivering via SMS to user ${request.userId}`);

    // SMS delivery not yet implemented
    throw new Error('SMS delivery not yet implemented');
  }

  // Private helper methods

  /**
   * Select additional channel (besides email)
   * Priority order: Telegram > WhatsApp > SMS
   * Returns null if no additional channel is available
   */
  private async selectAdditionalChannel(
    user: any,
  ): Promise<NotificationChannel | null> {
    // Priority order: Telegram > WhatsApp > SMS
    if (user.chat_id_telegram) {
      return NotificationChannel.TELEGRAM;
    }

    if (user.chat_id_whatsapp || user.phone_number) {
      return NotificationChannel.WHATSAPP;
    }

    // SMS not yet implemented, so return null if no other channel
    return null;
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

  private formatMessageForEmail(
    message: string,
    type: NotificationType,
  ): string {
    const emoji = this.getEmojiForType(type);
    return `${emoji} ${this.getTypeLabel(type)}\n\n${message}`;
  }

  private getEmailSubject(type: NotificationType): string {
    switch (type) {
      case NotificationType.DIGEST:
        return '📬 Your Daily Digest';
      case NotificationType.REMINDER:
        return '🔔 Reminder';
      case NotificationType.ALERT:
        return '⚠️ Alert';
      case NotificationType.UPDATE:
        return '📢 Update';
      default:
        return '💬 Notification';
    }
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
