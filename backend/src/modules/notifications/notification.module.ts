import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { Dump } from '../../entities/dump.entity';
import { Reminder } from '../../entities/reminder.entity';
import { User } from '../../entities/user.entity';
import { DigestService } from './digest.service';
import { DeliveryService } from './delivery.service';
import { CronService } from './cron.service';
import { ProactiveService } from './proactive.service';
import { ReminderModule } from '../reminders/reminder.module';
import { BotsModule } from '../bots/bots.module';
import { UserModule } from '../users/user.module';
import { ClaudeService } from '../ai/claude.service';

/**
 * Module for notification functionality
 * 
 * Provides:
 * - DigestService: Daily digest generation
 * - DeliveryService: Multi-channel notification delivery
 * - CronService: Scheduled jobs for automated notifications
 * - ProactiveService: AI-powered contextual reminder suggestions
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Dump, Reminder, User]),
    ScheduleModule.forRoot(), // Enable cron scheduling
    ReminderModule,
    forwardRef(() => BotsModule), // Circular dependency with bots
    UserModule,
  ],
  providers: [
    DigestService,
    DeliveryService,
    CronService,
    ProactiveService,
    ClaudeService, // AI service for proactive reminders
  ],
  exports: [
    DigestService,
    DeliveryService,
    ProactiveService,
  ],
})
export class NotificationModule {}
