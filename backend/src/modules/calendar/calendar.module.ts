import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Dump } from '../../entities/dump.entity';
import { Reminder } from '../../entities/reminder.entity';
import { CalendarService } from './calendar.service';

/**
 * Module for calendar functionality
 * 
 * Provides:
 * - CalendarService: .ics generation, event parsing, calendar integration
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Dump, Reminder]),
  ],
  providers: [CalendarService],
  exports: [CalendarService],
})
export class CalendarModule {}
