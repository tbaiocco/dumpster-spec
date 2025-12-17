import { Test, TestingModule } from '@nestjs/testing';
import { CalendarService } from '../../../src/modules/calendar/calendar.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Dump } from '../../../src/entities/dump.entity';
import {
  Reminder,
  ReminderStatus,
} from '../../../src/entities/reminder.entity';
import { Repository } from 'typeorm';

describe('CalendarService', () => {
  let service: CalendarService;
  let reminderRepository: jest.Mocked<Repository<Reminder>>;

  beforeEach(async () => {
    const mockDumpRepo = {
      find: jest.fn(),
    };

    const mockReminderRepo = {
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarService,
        {
          provide: getRepositoryToken(Dump),
          useValue: mockDumpRepo,
        },
        {
          provide: getRepositoryToken(Reminder),
          useValue: mockReminderRepo,
        },
      ],
    }).compile();

    service = module.get<CalendarService>(CalendarService);
    reminderRepository = module.get(getRepositoryToken(Reminder));
  });

  describe('generateICS', () => {
    it('should generate valid ICS file with events', () => {
      const events = [
        {
          id: 'event-123',
          title: 'Test event',
          description: 'Test description',
          startDate: new Date('2025-12-01T10:00:00Z'),
          endDate: new Date('2025-12-01T11:00:00Z'),
        },
      ];

      const ics = service.generateICS(events);

      expect(ics).toContain('BEGIN:VCALENDAR');
      expect(ics).toContain('END:VCALENDAR');
      expect(ics).toContain('BEGIN:VEVENT');
      expect(ics).toContain('SUMMARY:Test event');
      expect(ics).toContain('DTSTART:20251201T100000Z');
    });

    it('should handle recurring events', () => {
      const events = [
        {
          id: 'event-123',
          title: 'Daily standup',
          startDate: new Date('2025-12-01T09:00:00Z'),
          recurrence: {
            frequency: 'DAILY' as const,
            interval: 1,
          },
        },
      ];

      const ics = service.generateICS(events);

      expect(ics).toContain('RRULE:FREQ=DAILY;INTERVAL=1');
    });

    it('should include location data if available', () => {
      const events = [
        {
          id: 'event-123',
          title: 'Meeting',
          startDate: new Date('2025-12-01T14:00:00Z'),
          location: '123 Main St',
        },
      ];

      const ics = service.generateICS(events);

      expect(ics).toContain('LOCATION:123 Main St');
    });

    it('should handle empty event list', () => {
      const ics = service.generateICS([]);

      expect(ics).toContain('BEGIN:VCALENDAR');
      expect(ics).toContain('END:VCALENDAR');
      expect(ics).not.toContain('BEGIN:VEVENT');
    });
  });

  describe('generateRemindersCalendar', () => {
    it('should generate ICS from user reminders', async () => {
      const mockReminders = [
        {
          id: 'reminder-123',
          message: 'Test reminder',
          scheduled_for: new Date('2025-12-01T10:00:00Z'),
          status: ReminderStatus.PENDING,
          user_id: 'user-123',
          created_at: new Date(),
        },
      ];

      reminderRepository.find.mockResolvedValue(mockReminders as any);

      const ics = await service.generateRemindersCalendar('user-123');

      expect(ics).toContain('BEGIN:VCALENDAR');
      expect(ics).toContain('SUMMARY:Test reminder');
      expect(reminderRepository.find).toHaveBeenCalledWith({
        where: { user_id: 'user-123' },
        order: { scheduled_for: 'ASC' },
      });
    });
  });

  describe('parseICS', () => {
    it('should parse valid ICS file', () => {
      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Dumpster//Calendar//EN
BEGIN:VEVENT
UID:event-123
DTSTART:20251201T100000Z
DTEND:20251201T110000Z
SUMMARY:Team Meeting
DESCRIPTION:Weekly team sync
LOCATION:Conference Room A
END:VEVENT
END:VCALENDAR`;

      const events = service.parseICS(icsContent);

      expect(events).toHaveLength(1);
      expect(events[0].title).toBe('Team Meeting');
      expect(events[0].description).toBe('Weekly team sync');
      expect(events[0].location).toBe('Conference Room A');
    });

    it('should parse multiple events', () => {
      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:event-1
DTSTART:20251201T100000Z
SUMMARY:Event 1
END:VEVENT
BEGIN:VEVENT
UID:event-2
DTSTART:20251202T100000Z
SUMMARY:Event 2
END:VEVENT
END:VCALENDAR`;

      const events = service.parseICS(icsContent);

      expect(events).toHaveLength(2);
      expect(events[0].title).toBe('Event 1');
      expect(events[1].title).toBe('Event 2');
    });
  });
});
