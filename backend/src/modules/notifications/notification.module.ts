import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { Dump } from '../../entities/dump.entity';
import { Reminder } from '../../entities/reminder.entity';
import { User } from '../../entities/user.entity';
import { DigestService } from './digest.service';
import { DeliveryService } from './delivery.service';
import { EmailService } from './email.service';
import { CronService } from './cron.service';
import { ProactiveService } from './proactive.service';
import { NotificationTestController } from './notification-test.controller';
import { ReminderModule } from '../reminders/reminder.module';
import { BotsModule } from '../bots/bots.module';
import { UserModule } from '../users/user.module';
import { ClaudeService } from '../ai/claude.service';
import { TranslationService } from '../ai/translation.service';

/**
 * Module for notification functionality
 * 
 * Provides:
 * - DigestService: Daily digest generation
 * - DeliveryService: Multi-channel notification delivery
 * - CronService: Scheduled jobs for automated notifications
 * - ProactiveService: AI-powered contextual reminder suggestions
 * - NotificationTestController: Test endpoints for manual delivery (dev only)
 * - TranslationService: AI-powered translation for multi-language support
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Dump, Reminder, User]),
    ScheduleModule.forRoot(), // Enable cron scheduling
    ReminderModule,
    forwardRef(() => BotsModule), // Circular dependency with bots
    UserModule,
  ],
  controllers: [
    NotificationTestController,
  ],
  providers: [
    DigestService,
    DeliveryService,
    EmailService,
    CronService,
    ProactiveService,
    ClaudeService, // AI service for proactive reminders
    TranslationService, // AI translation service
  ],
  exports: [
    DigestService,
    DeliveryService,
    EmailService,
    ProactiveService,
  ],
})
export class NotificationModule {}
