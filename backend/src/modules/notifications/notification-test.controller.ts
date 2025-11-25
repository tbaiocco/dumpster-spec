import { Controller, Post, Param, Body, Get } from '@nestjs/common';
import { CronService } from './cron.service';
import { DeliveryService, NotificationType } from './delivery.service';

/**
 * Test controller for manual notification delivery
 * Only for development/testing - should be disabled in production
 */
@Controller('test/notifications')
export class NotificationTestController {
  constructor(
    private readonly cronService: CronService,
    private readonly deliveryService: DeliveryService,
  ) {}

  /**
   * Test morning digest delivery for a specific user
   * POST /test/notifications/digest/morning/:userId
   */
  @Post('digest/morning/:userId')
  async testMorningDigest(@Param('userId') userId: string) {
    await this.cronService.triggerMorningDigest(userId);
    return {
      success: true,
      message: `Morning digest triggered for user ${userId}`,
    };
  }

  /**
   * Test evening digest delivery for a specific user
   * POST /test/notifications/digest/evening/:userId
   */
  @Post('digest/evening/:userId')
  async testEveningDigest(@Param('userId') userId: string) {
    await this.cronService.triggerEveningDigest(userId);
    return {
      success: true,
      message: `Evening digest triggered for user ${userId}`,
    };
  }

  /**
   * Test reminder check (checks all pending reminders)
   * POST /test/notifications/reminders/check
   */
  @Post('reminders/check')
  async testReminderCheck() {
    await this.cronService.triggerReminderCheck();
    return {
      success: true,
      message: 'Reminder check triggered',
    };
  }

  /**
   * Send a test message to a specific user
   * POST /test/notifications/send/:userId
   * Body: { message: string, type?: 'digest' | 'reminder' | 'alert' | 'update' }
   */
  @Post('send/:userId')
  async testDirectSend(
    @Param('userId') userId: string,
    @Body() body: { message: string; type?: NotificationType },
  ) {
    const type = body.type || NotificationType.UPDATE;
    const message = body.message || 'Test notification';

    let result;
    switch (type) {
      case NotificationType.DIGEST:
        result = await this.deliveryService.sendDigest(userId, message);
        break;
      case NotificationType.REMINDER:
        result = await this.deliveryService.sendReminder(userId, message);
        break;
      case NotificationType.ALERT:
        result = await this.deliveryService.sendAlert(userId, message);
        break;
      case NotificationType.UPDATE:
        result = await this.deliveryService.sendUpdate(userId, message);
        break;
    }

    return {
      success: result.success,
      channel: result.channel,
      deliveredAt: result.deliveredAt,
      messageId: result.messageId,
      error: result.error,
    };
  }

  /**
   * Get cron job status
   * GET /test/notifications/cron/status
   */
  @Get('cron/status')
  async getCronStatus() {
    return this.cronService.getCronJobStatus();
  }

  /**
   * Get delivery service configuration info
   * GET /test/notifications/config
   */
  @Get('config')
  async getConfig() {
    return {
      message: 'Notification system is configured',
      availableChannels: ['email', 'telegram', 'whatsapp'],
      note: 'Email is always sent if user has email. Additional channel selected based on availability.',
    };
  }
}
