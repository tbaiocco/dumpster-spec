import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { Dump } from '../../entities/dump.entity';
import { Reminder } from '../../entities/reminder.entity';
import { TrackableItem } from '../../entities/trackable-item.entity';
import { TrackingService } from './tracking.service';
import { PackageTrackingService } from './package-tracking.service';
import { TrackingController } from './tracking.controller';
import { TrackingEventsService } from './tracking-events.service';
import { ReminderModule } from '../reminders/reminder.module';

/**
 * Module for tracking functionality
 *
 * Provides:
 * - TrackingService: General time-sensitive item tracking
 * - PackageTrackingService: Carrier-specific package tracking
 * - TrackingEventsService: Event listener for async tracking detection
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Dump, Reminder, TrackableItem]),
    HttpModule, // For external carrier APIs
    ReminderModule, // For auto-reminder creation
  ],
  controllers: [TrackingController],
  providers: [TrackingService, PackageTrackingService, TrackingEventsService],
  exports: [TrackingService, PackageTrackingService],
})
export class TrackingModule {}
