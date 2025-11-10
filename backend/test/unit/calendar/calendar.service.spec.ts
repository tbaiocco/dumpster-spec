import { Test, TestingModule } from '@nestjs/testing';
import { CalendarService } from '../../../src/modules/calendar/calendar.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Dump } from '../../../src/entities/dump.entity';
import { Reminder, ReminderStatus } from '../../../src/entities/reminder.entity';
import { Repository } from 'typeorm';

describe('CalendarService', () => {
  let service: CalendarService;
  let dumpRepository: jest.Mocked<Repository<Dump>>;
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
    dumpRepository = module.get(getRepositoryToken(Dump));
    reminderRepository = module.get(getRepositoryToken(Reminder));
  });

  describe('generateICS', () => {
    it('should generate valid ICS file with reminders', async () => {
      const mockReminders = [
        {
          id: 'reminder-123',
          message: 'Test reminder',
          scheduled_for: new Date('2025-12-01T10:00:00Z'),
          status: ReminderStatus.PENDING,
          created_at: new Date(),
        },
      ];

      reminderRepository.find.mockResolvedValue(mockReminders as any);

      const ics = await service.generateICS('user-123', {
        startDate: new Date('2025-12-01'),
        endDate: new Date('2025-12-31'),
      });

      expect(ics).toContain('BEGIN:VCALENDAR');
      expect(ics).toContain('END:VCALENDAR');
      expect(ics).toContain('BEGIN:VEVENT');
      expect(ics).toContain('SUMMARY:Test reminder');
      expect(ics).toContain('DTSTART:20251201T100000Z');
    });

    it('should handle recurring reminders', async () => {
      const mockReminders = [
        {
          id: 'reminder-123',
          message: 'Daily standup',
          scheduled_for: new Date('2025-12-01T09:00:00Z'),
          status: ReminderStatus.PENDING,
          recurrence_pattern: {
            frequency: 'daily',
            interval: 1,
          },
          created_at: new Date(),
        },
      ];

      reminderRepository.find.mockResolvedValue(mockReminders as any);

      const ics = await service.generateICS('user-123');

      expect(ics).toContain('RRULE:FREQ=DAILY;INTERVAL=1');
    });

    it('should include location data if available', async () => {
      const mockReminders = [
        {
          id: 'reminder-123',
          message: 'Meeting',
          scheduled_for: new Date('2025-12-01T14:00:00Z'),
          status: ReminderStatus.PENDING,
          location_data: {
            address: '123 Main St',
            coordinates: { lat: 40.7128, lng: -74.0060 },
          },
          created_at: new Date(),
        },
      ];

      reminderRepository.find.mockResolvedValue(mockReminders as any);

      const ics = await service.generateICS('user-123');

      expect(ics).toContain('LOCATION:123 Main St');
    });

    it('should handle empty reminder list', async () => {
      reminderRepository.find.mockResolvedValue([]);

      const ics = await service.generateICS('user-123');

      expect(ics).toContain('BEGIN:VCALENDAR');
      expect(ics).toContain('END:VCALENDAR');
      expect(ics).not.toContain('BEGIN:VEVENT');
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
      expect(events[0].summary).toBe('Team Meeting');
      expect(events[0].description).toBe('Weekly team sync');
      expect(events[0].location).toBe('Conference Room A');
    });

    it('should parse recurring events', () => {
      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Dumpster//Calendar//EN
BEGIN:VEVENT
UID:event-123
DTSTART:20251201T090000Z
SUMMARY:Daily Standup
RRULE:FREQ=DAILY;INTERVAL=1;COUNT=30
END:VEVENT
END:VCALENDAR`;

      const events = service.parseICS(icsContent);

      expect(events).toHaveLength(1);
      expect(events[0].recurrence).toBeDefined();
      expect(events[0].recurrence.frequency).toBe('daily');
    });

    it('should handle malformed ICS gracefully', () => {
      const invalidICS = 'This is not valid ICS content';

      expect(() => service.parseICS(invalidICS)).toThrow();
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
      expect(events[0].summary).toBe('Event 1');
      expect(events[1].summary).toBe('Event 2');
    });
  });

  describe('formatRecurrenceRule', () => {
    it('should format daily recurrence', () => {
      const pattern = { frequency: 'daily', interval: 1 };
      const rule = (service as any).formatRecurrenceRule(pattern);

      expect(rule).toBe('RRULE:FREQ=DAILY;INTERVAL=1');
    });

    it('should format weekly recurrence', () => {
      const pattern = { frequency: 'weekly', interval: 2 };
      const rule = (service as any).formatRecurrenceRule(pattern);

      expect(rule).toBe('RRULE:FREQ=WEEKLY;INTERVAL=2');
    });

    it('should include count if specified', () => {
      const pattern = { frequency: 'daily', interval: 1, count: 30 };
      const rule = (service as any).formatRecurrenceRule(pattern);

      expect(rule).toContain('COUNT=30');
    });

    it('should include until date if specified', () => {
      const until = new Date('2025-12-31T23:59:59Z');
      const pattern = { frequency: 'weekly', interval: 1, until };
      const rule = (service as any).formatRecurrenceRule(pattern);

      expect(rule).toContain('UNTIL=20251231T235959Z');
    });
  });

  describe('exportRemindersToCalendar', () => {
    it('should export filtered reminders', async () => {
      const mockReminders = [
        {
          id: 'reminder-1',
          message: 'Morning reminder',
          scheduled_for: new Date('2025-12-01T09:00:00Z'),
          status: ReminderStatus.PENDING,
        },
        {
          id: 'reminder-2',
          message: 'Afternoon reminder',
          scheduled_for: new Date('2025-12-01T14:00:00Z'),
          status: ReminderStatus.PENDING,
        },
      ];

      reminderRepository.find.mockResolvedValue(mockReminders as any);

      const ics = await service.exportRemindersToCalendar('user-123', {
        startDate: new Date('2025-12-01'),
        endDate: new Date('2025-12-02'),
        status: ReminderStatus.PENDING,
      });

      expect(ics).toContain('Morning reminder');
      expect(ics).toContain('Afternoon reminder');
    });
  });
});
