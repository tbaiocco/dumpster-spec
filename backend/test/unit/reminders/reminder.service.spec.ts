import { Test, TestingModule } from '@nestjs/testing';
import { ReminderService } from '../../../src/modules/reminders/reminder.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Reminder, ReminderType, ReminderStatus } from '../../../src/entities/reminder.entity';
import { Repository } from 'typeorm';

describe('ReminderService', () => {
  let service: ReminderService;
  let reminderRepository: jest.Mocked<Repository<Reminder>>;

  const mockReminder: Partial<Reminder> = {
    id: 'reminder-123',
    user_id: 'user-123',
    message: 'Test reminder',
    reminder_type: ReminderType.FOLLOW_UP,
    scheduled_for: new Date('2025-12-01T10:00:00Z'),
    status: ReminderStatus.PENDING,
    created_at: new Date(),
  };

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
        getOne: jest.fn(),
      })),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReminderService,
        {
          provide: getRepositoryToken(Reminder),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ReminderService>(ReminderService);
    reminderRepository = module.get(getRepositoryToken(Reminder));
  });

  describe('createReminder', () => {
    it('should create a reminder successfully', async () => {
      const createRequest = {
        userId: 'user-123',
        message: 'Test reminder',
        reminderType: ReminderType.FOLLOW_UP,
        scheduledFor: new Date('2025-12-01T10:00:00Z'),
      };

      reminderRepository.create.mockReturnValue(mockReminder as Reminder);
      reminderRepository.save.mockResolvedValue(mockReminder as Reminder);

      const result = await service.createReminder(createRequest);

      expect(reminderRepository.create).toHaveBeenCalledWith({
        user_id: createRequest.userId,
        dump_id: undefined,
        message: createRequest.message,
        reminder_type: createRequest.reminderType,
        scheduled_for: createRequest.scheduledFor,
        status: ReminderStatus.PENDING,
        location_data: undefined,
        recurrence_pattern: undefined,
        ai_confidence: 100,
      });
      expect(reminderRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockReminder);
    });

    it('should handle recurrence pattern', async () => {
      const recurrencePattern = {
        frequency: 'daily',
        interval: 1,
      };

      const createRequest = {
        userId: 'user-123',
        message: 'Daily reminder',
        reminderType: ReminderType.RECURRING,
        scheduledFor: new Date(),
        recurrencePattern,
      };

      reminderRepository.create.mockReturnValue(mockReminder as Reminder);
      reminderRepository.save.mockResolvedValue(mockReminder as Reminder);

      await service.createReminder(createRequest);

      expect(reminderRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          recurrence_pattern: recurrencePattern,
        }),
      );
    });
  });

  describe('getReminderById', () => {
    it('should return reminder by id', async () => {
      reminderRepository.findOne.mockResolvedValue(mockReminder as Reminder);

      const result = await service.getReminderById('reminder-123');

      expect(reminderRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'reminder-123' },
        relations: ['user', 'dump'],
      });
      expect(result).toEqual(mockReminder);
    });

    it('should throw NotFoundException when reminder not found', async () => {
      reminderRepository.findOne.mockResolvedValue(null);

      await expect(service.getReminderById('nonexistent')).rejects.toThrow();
    });
  });

  describe('getPendingReminders', () => {
    it('should return pending reminders due now', async () => {
      const now = new Date();
      const pendingReminders = [
        { ...mockReminder, scheduled_for: new Date(now.getTime() - 1000) },
        { ...mockReminder, scheduled_for: new Date(now.getTime() - 2000) },
      ];

      reminderRepository.find.mockResolvedValue(pendingReminders as any);

      const result = await service.getPendingReminders(now);

      expect(result).toHaveLength(2);
      expect(reminderRepository.find).toHaveBeenCalledWith({
        where: {
          status: ReminderStatus.PENDING,
          scheduled_for: expect.any(Object), // LessThan matcher
        },
        relations: ['user', 'dump'],
        order: {
          scheduled_for: 'ASC',
        },
      });
    });
  });

  describe('snoozeReminder', () => {
    it('should snooze reminder by specified minutes', async () => {
      const originalTime = new Date('2025-12-01T10:00:00Z');
      const reminder = {
        ...mockReminder,
        scheduled_for: originalTime,
      } as Reminder;

      reminderRepository.findOne.mockResolvedValue(reminder);
      reminderRepository.save.mockResolvedValue(reminder);

      const result = await service.snoozeReminder('reminder-123', 30);

      const expectedTime = new Date(originalTime.getTime() + 30 * 60 * 1000);
      expect(result.scheduled_for.getTime()).toBeCloseTo(expectedTime.getTime(), -3);
      expect(result.status).toBe(ReminderStatus.SNOOZED);
    });
  });

  describe('dismissReminder', () => {
    it('should dismiss a reminder', async () => {
      const reminder = { ...mockReminder } as Reminder;
      reminderRepository.findOne.mockResolvedValue(reminder);
      reminderRepository.save.mockResolvedValue({
        ...reminder,
        status: ReminderStatus.DISMISSED,
      } as Reminder);

      const result = await service.dismissReminder('reminder-123');

      expect(result.status).toBe(ReminderStatus.DISMISSED);
      expect(reminderRepository.save).toHaveBeenCalled();
    });
  });

  describe('getUpcomingReminders', () => {
    it('should return reminders in the next 24 hours', async () => {
      const upcomingReminders = [mockReminder, mockReminder];

      reminderRepository.find.mockResolvedValue(upcomingReminders as any);

      const result = await service.getUpcomingReminders('user-123', 24);

      expect(result).toHaveLength(2);
      expect(reminderRepository.find).toHaveBeenCalledWith({
        where: {
          user_id: 'user-123',
          status: ReminderStatus.PENDING,
          scheduled_for: expect.any(Object), // Between matcher
        },
        relations: ['dump'],
        order: {
          scheduled_for: 'ASC',
        },
      });
    });
  });

  describe('calculateNextRecurrence', () => {
    it('should calculate next daily recurrence', () => {
      const currentDate = new Date('2025-12-01T10:00:00Z');
      const pattern = { frequency: 'daily', interval: 1 };

      const nextDate = (service as any).calculateNextRecurrence(currentDate, pattern);

      expect(nextDate.getDate()).toBe(2);
      expect(nextDate.getMonth()).toBe(11); // December (0-indexed)
    });

    it('should calculate next weekly recurrence', () => {
      const currentDate = new Date('2025-12-01T10:00:00Z');
      const pattern = { frequency: 'weekly', interval: 1 };

      const nextDate = (service as any).calculateNextRecurrence(currentDate, pattern);

      expect(nextDate.getDate()).toBe(8);
    });

    it('should handle interval > 1', () => {
      const currentDate = new Date('2025-12-01T10:00:00Z');
      const pattern = { frequency: 'daily', interval: 3 };

      const nextDate = (service as any).calculateNextRecurrence(currentDate, pattern);

      expect(nextDate.getDate()).toBe(4);
    });
  });

  describe('getReminderStats', () => {
    it('should return reminder statistics', async () => {
      const mockReminders = [
        { ...mockReminder, id: '1', status: ReminderStatus.PENDING },
        { ...mockReminder, id: '2', status: ReminderStatus.PENDING },
        { ...mockReminder, id: '3', status: ReminderStatus.PENDING },
        { ...mockReminder, id: '4', status: ReminderStatus.PENDING },
        { ...mockReminder, id: '5', status: ReminderStatus.PENDING },
        { ...mockReminder, id: '6', status: ReminderStatus.SENT },
        { ...mockReminder, id: '7', status: ReminderStatus.SENT },
        { ...mockReminder, id: '8', status: ReminderStatus.SENT },
        { ...mockReminder, id: '9', status: ReminderStatus.SENT },
        { ...mockReminder, id: '10', status: ReminderStatus.SENT },
        { ...mockReminder, id: '11', status: ReminderStatus.SENT },
        { ...mockReminder, id: '12', status: ReminderStatus.SENT },
        { ...mockReminder, id: '13', status: ReminderStatus.SENT },
        { ...mockReminder, id: '14', status: ReminderStatus.SENT },
        { ...mockReminder, id: '15', status: ReminderStatus.SENT },
        { ...mockReminder, id: '16', status: ReminderStatus.DISMISSED },
        { ...mockReminder, id: '17', status: ReminderStatus.DISMISSED },
        { ...mockReminder, id: '18', status: ReminderStatus.DISMISSED },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockReminders),
      };

      (reminderRepository.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);
      reminderRepository.find.mockResolvedValue(mockReminders.filter(r => r.status === ReminderStatus.PENDING) as any);

      const result = await service.getReminderStats('user-123');

      expect(result.total).toBe(18);
      expect(result.pending).toBe(5);
      expect(result.sent).toBe(10);
      expect(result.dismissed).toBe(3);
    });
  });
});
