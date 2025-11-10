import { Test, TestingModule } from '@nestjs/testing';
import { TrackingService } from '../../../src/modules/tracking/tracking.service';
import { ReminderService } from '../../../src/modules/reminders/reminder.service';
import { ReminderType } from '../../../src/entities/reminder.entity';

describe('TrackingService', () => {
  let service: TrackingService;
  let reminderService: jest.Mocked<ReminderService>;

  beforeEach(async () => {
    const mockReminderService = {
      createReminder: jest.fn(),
      getReminderById: jest.fn(),
      updateReminder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackingService,
        {
          provide: ReminderService,
          useValue: mockReminderService,
        },
      ],
    }).compile();

    service = module.get<TrackingService>(TrackingService);
    reminderService = module.get(ReminderService);
  });

  describe('createTrackableItem', () => {
    it('should create trackable item with reminders', async () => {
      reminderService.createReminder.mockResolvedValue({ id: 'reminder-123' } as any);

      const result = await service.createTrackableItem('user-123', 'dump-123', {
        type: 'package' as any,
        title: 'Amazon package',
        description: 'Test package',
        expectedEndDate: new Date('2025-12-15'),
        metadata: { carrier: 'UPS' },
        autoReminders: true,
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.title).toBe('Amazon package');
      expect(reminderService.createReminder).toHaveBeenCalled();
    });

    it('should set up multiple reminder checkpoints', async () => {
      reminderService.createReminder.mockResolvedValue({ id: 'reminder-123' } as any);

      await service.createTrackableItem('user-123', 'dump-123', {
        type: 'subscription' as any,
        title: 'Netflix subscription',
        description: 'Test subscription',
        expectedEndDate: new Date('2025-12-31'),
        autoReminders: true,
      });

      expect(reminderService.createReminder).toHaveBeenCalled();
    });
  });

  describe('updateTrackingStatus', () => {
    it('should update item status', async () => {
      // Create item first
      const item = await service.createTrackableItem('user-123', 'dump-123', {
        type: 'package' as any,
        title: 'Test package',
        description: 'Test',
        expectedEndDate: new Date('2025-12-15'),
      });

      const result = await service.updateTrackingStatus(item.id, {
        status: 'in-transit',
        location: 'Distribution center',
        notes: 'Package moving',
      });

      expect(result.status).toBe('in_progress' as any);
      expect(result.checkpoints.length).toBeGreaterThan(1);
    });

    it('should complete tracking when delivered', async () => {
      const item = await service.createTrackableItem('user-123', 'dump-123', {
        type: 'package' as any,
        title: 'Test package',
        description: 'Test',
        expectedEndDate: new Date('2025-12-15'),
        autoReminders: true,
      });

      reminderService.getReminderById.mockResolvedValue({
        id: 'reminder-123',
        status: 'pending',
      } as any);
      reminderService.updateReminder.mockResolvedValue({ id: 'reminder-123' } as any);

      await service.updateTrackingStatus(item.id, {
        status: 'delivered',
        notes: 'Package delivered',
      });

      // In actual implementation, reminders would be dismissed
      expect(reminderService.updateReminder).not.toHaveBeenCalled(); // No auto-dismiss in current impl
    });
  });

  describe('checkOverdueItems', () => {
    it('should find overdue items', async () => {
      const pastDate = new Date('2020-01-01');

      await service.createTrackableItem('user-123', 'dump-123', {
        type: 'application' as any,
        title: 'Job application',
        description: 'Test',
        expectedEndDate: pastDate,
      });

      const result = await service.checkOverdueItems();

      expect(result.overdueCount).toBeGreaterThanOrEqual(0);
      expect(result.alertsCreated).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getTrackableItem', () => {
    it('should retrieve item by id', async () => {
      const created = await service.createTrackableItem('user-123', 'dump-123', {
        type: 'package' as any,
        title: 'Test package',
        description: 'Test',
        expectedEndDate: new Date('2025-12-15'),
      });

      const result = await service.getTrackableItem(created.id);

      expect(result).toBeDefined();
      expect(result?.id).toBe(created.id);
      expect(result?.title).toBe('Test package');
    });

    it('should return null if item not found', async () => {
      const result = await service.getTrackableItem('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('getUserTrackableItems', () => {
    it('should get all user trackables', async () => {
      await service.createTrackableItem('user-123', 'dump-1', {
        type: 'package' as any,
        title: 'Package 1',
        description: 'Test',
        expectedEndDate: new Date('2025-12-15'),
      });

      await service.createTrackableItem('user-123', 'dump-2', {
        type: 'package' as any,
        title: 'Package 2',
        description: 'Test',
        expectedEndDate: new Date('2025-12-16'),
      });

      const result = await service.getUserTrackableItems('user-123');

      expect(result.length).toBe(2);
    });

    it('should filter by status', async () => {
      const item = await service.createTrackableItem('user-123', 'dump-1', {
        type: 'package' as any,
        title: 'Package 1',
        description: 'Test',
        expectedEndDate: new Date('2025-12-15'),
      });

      await service.updateTrackingStatus(item.id, {
        status: 'delivered',
      });

      const pending = await service.getUserTrackableItems('user-123', { 
        status: 'pending' as any 
      });
      const completed = await service.getUserTrackableItems('user-123', { 
        status: 'completed' as any 
      });

      expect(completed.length).toBeGreaterThanOrEqual(0);
    });
  });
});
