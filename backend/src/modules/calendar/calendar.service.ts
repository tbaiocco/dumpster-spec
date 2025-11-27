import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dump } from '../../entities/dump.entity';
import { Reminder } from '../../entities/reminder.entity';

/**
 * Calendar event interface
 */
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  startDate: Date;
  endDate?: Date;
  allDay?: boolean;
  recurrence?: RecurrenceRule;
  reminders?: number[]; // Minutes before event
  attendees?: string[];
  url?: string;
  status?: 'confirmed' | 'tentative' | 'cancelled';
}

/**
 * Recurrence rule (RFC 5545 format)
 */
export interface RecurrenceRule {
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval?: number;
  count?: number;
  until?: Date;
  byDay?: string[]; // ['MO', 'WE', 'FR']
  byMonthDay?: number[];
  byMonth?: number[];
}

/**
 * Service for calendar integration and .ics file generation
 */
@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(
    @InjectRepository(Dump)
    private readonly dumpRepository: Repository<Dump>,
    @InjectRepository(Reminder)
    private readonly reminderRepository: Repository<Reminder>,
  ) {}

  /**
   * Generate .ics calendar file from events
   */
  generateICS(events: CalendarEvent[]): string {
    const lines: string[] = [];

    // Calendar header
    lines.push('BEGIN:VCALENDAR');
    lines.push('VERSION:2.0');
    lines.push('PRODID:-//Dumpster//Universal Life Inbox//EN');
    lines.push('CALSCALE:GREGORIAN');
    lines.push('METHOD:PUBLISH');

    // Add events
    for (const event of events) {
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${event.id}@dumpster.app`);
      lines.push(`DTSTAMP:${this.formatICSDate(new Date())}`);
      lines.push(
        `DTSTART:${this.formatICSDate(event.startDate, event.allDay)}`,
      );

      if (event.endDate) {
        lines.push(`DTEND:${this.formatICSDate(event.endDate, event.allDay)}`);
      }

      lines.push(`SUMMARY:${this.escapeICSText(event.title)}`);

      if (event.description) {
        lines.push(`DESCRIPTION:${this.escapeICSText(event.description)}`);
      }

      if (event.location) {
        lines.push(`LOCATION:${this.escapeICSText(event.location)}`);
      }

      if (event.url) {
        lines.push(`URL:${event.url}`);
      }

      if (event.status) {
        lines.push(`STATUS:${event.status.toUpperCase()}`);
      }

      // Add recurrence rule
      if (event.recurrence) {
        lines.push(`RRULE:${this.formatRecurrenceRule(event.recurrence)}`);
      }

      // Add alarms/reminders
      if (event.reminders && event.reminders.length > 0) {
        for (const minutesBefore of event.reminders) {
          lines.push('BEGIN:VALARM');
          lines.push('ACTION:DISPLAY');
          lines.push(`DESCRIPTION:${this.escapeICSText(event.title)}`);
          lines.push(`TRIGGER:-PT${minutesBefore}M`);
          lines.push('END:VALARM');
        }
      }

      // Add attendees
      if (event.attendees && event.attendees.length > 0) {
        for (const attendee of event.attendees) {
          lines.push(`ATTENDEE:mailto:${attendee}`);
        }
      }

      lines.push('END:VEVENT');
    }

    // Calendar footer
    lines.push('END:VCALENDAR');

    return lines.join('\r\n');
  }

  /**
   * Generate calendar from user's reminders
   */
  async generateRemindersCalendar(userId: string): Promise<string> {
    const reminders = await this.reminderRepository.find({
      where: { user_id: userId },
      order: { scheduled_for: 'ASC' },
    });

    const events: CalendarEvent[] = reminders.map((reminder) => ({
      id: reminder.id,
      title: reminder.message,
      startDate: reminder.scheduled_for,
      allDay: false,
      reminders: [15], // 15 minutes before
      status: 'confirmed',
    }));

    return this.generateICS(events);
  }

  /**
   * Parse .ics file content to extract events
   */
  parseICS(icsContent: string): CalendarEvent[] {
    const events: CalendarEvent[] = [];
    const lines = icsContent.split(/\r?\n/).map((line) => line.trim());

    let currentEvent: Partial<CalendarEvent> | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line === 'BEGIN:VEVENT') {
        currentEvent = {
          id: '',
          title: '',
          startDate: new Date(),
          reminders: [],
          attendees: [],
        };
      } else if (line === 'END:VEVENT' && currentEvent) {
        if (currentEvent.id && currentEvent.title && currentEvent.startDate) {
          events.push(currentEvent as CalendarEvent);
        }
        currentEvent = null;
      } else if (currentEvent) {
        // Parse event properties
        const [key, ...valueParts] = line.split(':');
        const value = valueParts.join(':');

        if (key.startsWith('UID')) {
          currentEvent.id = value.split('@')[0];
        } else if (key.startsWith('SUMMARY')) {
          currentEvent.title = this.unescapeICSText(value);
        } else if (key.startsWith('DESCRIPTION')) {
          currentEvent.description = this.unescapeICSText(value);
        } else if (key.startsWith('LOCATION')) {
          currentEvent.location = this.unescapeICSText(value);
        } else if (key.startsWith('DTSTART')) {
          currentEvent.startDate = this.parseICSDate(value);
          currentEvent.allDay = key.includes('VALUE=DATE');
        } else if (key.startsWith('DTEND')) {
          currentEvent.endDate = this.parseICSDate(value);
        } else if (key.startsWith('URL')) {
          currentEvent.url = value;
        } else if (key.startsWith('STATUS')) {
          currentEvent.status = value.toLowerCase() as CalendarEvent['status'];
        } else if (key.startsWith('RRULE')) {
          currentEvent.recurrence = this.parseRecurrenceRule(value);
        } else if (key.startsWith('ATTENDEE')) {
          const email = value.replace('mailto:', '');
          if (!currentEvent.attendees) currentEvent.attendees = [];
          currentEvent.attendees.push(email);
        }
      }
    }

    return events;
  }

  /**
   * Extract calendar events from a dump
   */
  async extractEventsFromDump(dumpId: string): Promise<CalendarEvent[]> {
    const dump = await this.dumpRepository.findOne({
      where: { id: dumpId },
    });

    if (!dump) {
      return [];
    }

    // Check if dump contains .ics content
    if (
      dump.content_type === 'text' &&
      dump.raw_content?.includes('BEGIN:VCALENDAR')
    ) {
      return this.parseICS(dump.raw_content);
    }

    // TODO: Use AI to extract event information from text/email content
    return [];
  }

  /**
   * Format date for ICS (RFC 5545 format)
   */
  private formatICSDate(date: Date, allDay = false): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    if (allDay) {
      return `${year}${month}${day}`;
    }

    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');

    return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
  }

  /**
   * Parse ICS date to JavaScript Date
   */
  private parseICSDate(dateString: string): Date {
    // Remove timezone indicator if present
    const cleanDate = dateString.replace(/[TZ]/g, '');

    if (cleanDate.length === 8) {
      // All-day event (YYYYMMDD)
      const year = Number.parseInt(cleanDate.substring(0, 4), 10);
      const month = Number.parseInt(cleanDate.substring(4, 6), 10) - 1;
      const day = Number.parseInt(cleanDate.substring(6, 8), 10);
      return new Date(year, month, day);
    } else {
      // Date with time (YYYYMMDDTHHMMSS)
      const year = Number.parseInt(cleanDate.substring(0, 4), 10);
      const month = Number.parseInt(cleanDate.substring(4, 6), 10) - 1;
      const day = Number.parseInt(cleanDate.substring(6, 8), 10);
      const hour = Number.parseInt(cleanDate.substring(8, 10), 10);
      const minute = Number.parseInt(cleanDate.substring(10, 12), 10);
      const second = Number.parseInt(cleanDate.substring(12, 14), 10);
      return new Date(Date.UTC(year, month, day, hour, minute, second));
    }
  }

  /**
   * Format recurrence rule for ICS
   */
  private formatRecurrenceRule(rule: RecurrenceRule): string {
    const parts: string[] = [`FREQ=${rule.frequency}`];

    if (rule.interval) {
      parts.push(`INTERVAL=${rule.interval}`);
    }

    if (rule.count) {
      parts.push(`COUNT=${rule.count}`);
    }

    if (rule.until) {
      parts.push(`UNTIL=${this.formatICSDate(rule.until)}`);
    }

    if (rule.byDay && rule.byDay.length > 0) {
      parts.push(`BYDAY=${rule.byDay.join(',')}`);
    }

    if (rule.byMonthDay && rule.byMonthDay.length > 0) {
      parts.push(`BYMONTHDAY=${rule.byMonthDay.join(',')}`);
    }

    if (rule.byMonth && rule.byMonth.length > 0) {
      parts.push(`BYMONTH=${rule.byMonth.join(',')}`);
    }

    return parts.join(';');
  }

  /**
   * Parse recurrence rule from ICS
   */
  private parseRecurrenceRule(ruleString: string): RecurrenceRule {
    const rule: Partial<RecurrenceRule> = {};
    const parts = ruleString.split(';');

    for (const part of parts) {
      const [key, value] = part.split('=');

      switch (key) {
        case 'FREQ':
          rule.frequency = value as RecurrenceRule['frequency'];
          break;
        case 'INTERVAL':
          rule.interval = Number.parseInt(value, 10);
          break;
        case 'COUNT':
          rule.count = Number.parseInt(value, 10);
          break;
        case 'UNTIL':
          rule.until = this.parseICSDate(value);
          break;
        case 'BYDAY':
          rule.byDay = value.split(',');
          break;
        case 'BYMONTHDAY':
          rule.byMonthDay = value.split(',').map((d) => Number.parseInt(d, 10));
          break;
        case 'BYMONTH':
          rule.byMonth = value.split(',').map((m) => Number.parseInt(m, 10));
          break;
      }
    }

    return rule as RecurrenceRule;
  }

  /**
   * Escape text for ICS format
   */
  private escapeICSText(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  }

  /**
   * Unescape ICS text
   */
  private unescapeICSText(text: string): string {
    return text
      .replace(/\\n/g, '\n')
      .replace(/\\,/g, ',')
      .replace(/\\;/g, ';')
      .replace(/\\\\/g, '\\');
  }

  /**
   * Create downloadable .ics file URL
   */
  createDownloadUrl(icsContent: string): { url: string; filename: string } {
    // In production, upload to storage and return signed URL
    // For now, return data URL
    const base64 = Buffer.from(icsContent).toString('base64');
    const dataUrl = `data:text/calendar;base64,${base64}`;

    return {
      url: dataUrl,
      filename: `dumpster-calendar-${Date.now()}.ics`,
    };
  }
}
