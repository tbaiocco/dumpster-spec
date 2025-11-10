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
      const request = {
        userId: 'user-123',
        itemType: 'package-delivery' as const,
        identifier: 'TRACK123',
        description: 'Amazon package',
        expectedDate: new Date('2025-12-15'),
        metadata: { carrier: 'UPS' },
      };

      reminderService.createReminder.mockResolvedValue({ id: 'reminder-123' } as any);

      const result = await service.createTrackableItem(request);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.identifier).toBe('TRACK123');
      expect(reminderService.createReminder).toHaveBeenCalled();
    });

    it('should set up multiple reminder checkpoints', async () => {
      const request = {
        userId: 'user-123',
        itemType: 'subscription-renewal' as const,
        identifier: 'Netflix-2025',
        description: 'Netflix subscription',
        expectedDate: new Date('2025-12-31'),
      };

      reminderService.createReminder.mockResolvedValue({ id: 'reminder-123' } as any);

      await service.createTrackableItem(request);

      expect(reminderService.createReminder).toHaveBeenCalledTimes(3); // 7 days, 3 days, day of
    });
  });

  describe('updateTrackingStatus', () => {
    it('should update item status', async () => {
      const trackingId = 'track-123';

      // Create item first
      const item = await service.createTrackableItem({
        userId: 'user-123',
        itemType: 'package-delivery' as const,
        identifier: 'TRACK123',
        description: 'Test package',
        expectedDate: new Date('2025-12-15'),
      });

      reminderService.getReminderById.mockResolvedValue({ id: 'reminder-123' } as any);
      reminderService.updateReminder.mockResolvedValue({ id: 'reminder-123' } as any);

      const result = await service.updateTrackingStatus(item.id, {
        status: 'in-transit',
        location: 'Distribution center',
        timestamp: new Date(),
      });

      expect(result.status).toBe('in-transit');
      expect(result.statusHistory).toHaveLength(1);
    });

    it('should dismiss reminders when delivered', async () => {
      const item = await service.createTrackableItem({
        userId: 'user-123',
        itemType: 'package-delivery' as const,
        identifier: 'TRACK123',
        description: 'Test package',
        expectedDate: new Date('2025-12-15'),
      });

      reminderService.getReminderById.mockResolvedValue({
        id: 'reminder-123',
        status: 'pending',
      } as any);
      reminderService.updateReminder.mockResolvedValue({ id: 'reminder-123' } as any);

      await service.updateTrackingStatus(item.id, {
        status: 'delivered',
        timestamp: new Date(),
      });

      expect(reminderService.updateReminder).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ status: 'dismissed' }),
      );
    });
  });

  describe('checkOverdueItems', () => {
    it('should find overdue items', async () => {
      const pastDate = new Date('2020-01-01');

      await service.createTrackableItem({
        userId: 'user-123',
        itemType: 'application-status' as const,
        identifier: 'APP-456',
        description: 'Job application',
        expectedDate: pastDate,
      });

      const overdueItems = await service.checkOverdueItems();

      expect(overdueItems.length).toBeGreaterThan(0);
      expect(overdueItems[0].isOverdue).toBe(true);
    });
  });

  describe('getTrackableItem', () => {
    it('should retrieve item by id', async () => {
      const created = await service.createTrackableItem({
        userId: 'user-123',
        itemType: 'package-delivery' as const,
        identifier: 'TRACK123',
        description: 'Test package',
        expectedDate: new Date('2025-12-15'),
      });

      const result = await service.getTrackableItem(created.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(created.id);
      expect(result.identifier).toBe('TRACK123');
    });

    it('should throw if item not found', async () => {
      await expect(service.getTrackableItem('nonexistent')).rejects.toThrow();
    });
  });

  describe('getUserTrackables', () => {
    it('should get all user trackables', async () => {
      await service.createTrackableItem({
        userId: 'user-123',
        itemType: 'package-delivery' as const,
        identifier: 'TRACK1',
        description: 'Package 1',
        expectedDate: new Date('2025-12-15'),
      });

      await service.createTrackableItem({
        userId: 'user-123',
        itemType: 'package-delivery' as const,
        identifier: 'TRACK2',
        description: 'Package 2',
        expectedDate: new Date('2025-12-16'),
      });

      const result = await service.getUserTrackables('user-123');

      expect(result.length).toBe(2);
    });

    it('should filter by status', async () => {
      const item = await service.createTrackableItem({
        userId: 'user-123',
        itemType: 'package-delivery' as const,
        identifier: 'TRACK1',
        description: 'Package 1',
        expectedDate: new Date('2025-12-15'),
      });

      await service.updateTrackingStatus(item.id, {
        status: 'delivered',
        timestamp: new Date(),
      });

      const pending = await service.getUserTrackables('user-123', { status: 'pending' });
      const delivered = await service.getUserTrackables('user-123', { status: 'delivered' });

      expect(delivered.length).toBe(1);
    });
  });
});
