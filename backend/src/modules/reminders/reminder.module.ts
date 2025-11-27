import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reminder } from '../../entities/reminder.entity';
import { Dump } from '../../entities/dump.entity';
import { User } from '../../entities/user.entity';
import { ReminderService } from './reminder.service';
import { ReminderController } from './reminder.controller';

/**
 * Module for reminder functionality
 *
 * Provides:
 * - ReminderService: Core reminder scheduling and management
 * - ReminderController: REST API endpoints
 * - Reminder entity repository
 */
@Module({
  imports: [TypeOrmModule.forFeature([Reminder, Dump, User])],
  providers: [ReminderService],
  controllers: [ReminderController],
  exports: [ReminderService], // Export for use in other modules
})
export class ReminderModule {}
