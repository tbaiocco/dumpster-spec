import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { Dump } from '../../entities/dump.entity';
import { Reminder } from '../../entities/reminder.entity';
import { TrackingService } from './tracking.service';
import { PackageTrackingService } from './package-tracking.service';
import { ReminderModule } from '../reminders/reminder.module';

/**
 * Module for tracking functionality
 *
 * Provides:
 * - TrackingService: General time-sensitive item tracking
 * - PackageTrackingService: Carrier-specific package tracking
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Dump, Reminder]),
    HttpModule, // For external carrier APIs
    ReminderModule, // For auto-reminder creation
  ],
  providers: [TrackingService, PackageTrackingService],
  exports: [TrackingService, PackageTrackingService],
})
export class TrackingModule {}
