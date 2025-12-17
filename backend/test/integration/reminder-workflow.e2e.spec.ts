// Mock @xenova/transformers before any imports
jest.mock('@xenova/transformers', () => ({
  pipeline: jest.fn(() =>
    Promise.resolve({
      predict: jest.fn(() => Promise.resolve([1, 2, 3, 4, 5])),
    }),
  ),
  env: {
    backends: {
      onnx: {
        wasm: {
          wasmPaths: '/mock/path/',
        },
      },
    },
  },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReminderModule } from '../../src/modules/reminders/reminder.module';
import {
  Reminder,
  ReminderStatus,
  ReminderType,
} from '../../src/entities/reminder.entity';
import { User } from '../../src/entities/user.entity';
import { Dump, ContentType } from '../../src/entities/dump.entity';
import { Category } from '../../src/entities/category.entity';
import { ReminderService } from '../../src/modules/reminders/reminder.service';
import { DeliveryService } from '../../src/modules/notifications/delivery.service';
import { testDatabaseConfig } from '../setup';

/**
 * Integration test for complete reminder workflow
 * Tests: Create → Schedule → Trigger → Deliver → Complete
 */
describe.skip('Reminder Workflow Integration (e2e)', () => {
  let app: INestApplication;
  let reminderService: ReminderService;
  let reminderRepository: Repository<Reminder>;
  let userRepository: Repository<User>;
  let dumpRepository: Repository<Dump>;
  let categoryRepository: Repository<Category>;

  let testUser: User;
  let testCategory: Category;
  let testDump: Dump;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TypeOrmModule.forRoot(testDatabaseConfig), ReminderModule],
    })
      .overrideProvider(DeliveryService)
      .useValue({
        sendReminder: jest
          .fn()
          .mockResolvedValue({ success: true, platform: 'telegram' }),
        sendDigest: jest.fn().mockResolvedValue({ success: true }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    reminderService = moduleFixture.get<ReminderService>(ReminderService);
    reminderRepository = moduleFixture.get(getRepositoryToken(Reminder));
    userRepository = moduleFixture.get(getRepositoryToken(User));
    dumpRepository = moduleFixture.get(getRepositoryToken(Dump));
    categoryRepository = moduleFixture.get(getRepositoryToken(Category));

    // Create test data
    testCategory = categoryRepository.create({
      name: 'Work',
      icon: '💼',
      color: '#1976d2',
    });
    await categoryRepository.save(testCategory);

    testUser = userRepository.create({
      phone_number: '+1234567890',
      verified_at: new Date(),
      timezone: 'America/New_York',
      chat_id_telegram: 'test-telegram-123',
      chat_id_whatsapp: 'test-whatsapp-123',
    });
    await userRepository.save(testUser);

    testDump = dumpRepository.create({
      user_id: testUser.id,
      category_id: testCategory.id,
      raw_content: 'Important meeting notes',
      ai_summary: 'Meeting scheduled for next week',
      content_type: ContentType.TEXT,
    });
    await dumpRepository.save(testDump);
  });

  afterAll(async () => {
    // Cleanup
    await reminderRepository.delete({});
    await dumpRepository.delete({});
    await userRepository.delete({});
    await categoryRepository.delete({});
    await app.close();
  });

  afterEach(async () => {
    // Clear reminders between tests
    await reminderRepository.delete({});
    jest.clearAllMocks();
  });

  describe('Complete Reminder Lifecycle', () => {
    it('should create a reminder with all required fields', async () => {
      const scheduledFor = new Date(Date.now() + 3600000); // 1 hour from now

      const reminder = await reminderService.createReminder({
        userId: testUser.id,
        message:
          "Follow up on meeting - Review action items from today's meeting",
        scheduledFor: scheduledFor,
        reminderType: ReminderType.FOLLOW_UP,
        dumpId: testDump.id,
      });

      expect(reminder).toBeDefined();
      expect(reminder.id).toBeDefined();
      expect(reminder.message).toContain('Follow up on meeting');
      expect(reminder.status).toBe(ReminderStatus.PENDING);
      expect(reminder.reminder_type).toBe(ReminderType.FOLLOW_UP);
      expect(reminder.user_id).toBe(testUser.id);
      expect(reminder.dump_id).toBe(testDump.id);
    });

    it('should handle recurring reminders', async () => {
      const firstOccurrence = new Date(Date.now() + 3600000);

      const reminder = await reminderService.createReminder({
        userId: testUser.id,
        message: 'Daily standup reminder',
        scheduledFor: firstOccurrence,
        reminderType: ReminderType.RECURRING,
        recurrencePattern: { frequency: 'daily', interval: 1 },
      });

      expect(reminder.reminder_type).toBe(ReminderType.RECURRING);
      expect(reminder.recurrence_pattern).toEqual({
        frequency: 'daily',
        interval: 1,
      });
      expect(reminder.status).toBe(ReminderStatus.PENDING);
    });

    it('should schedule and trigger reminder delivery', async () => {
      const scheduledFor = new Date(Date.now() + 3600000);

      const reminder = await reminderService.createReminder({
        userId: testUser.id,
        message: 'Immediate reminder',
        scheduledFor: scheduledFor,
        reminderType: ReminderType.FOLLOW_UP,
      });

      // Manually mark as sent (simulating delivery)
      await reminderService.updateReminder(reminder.id, {
        status: ReminderStatus.SENT,
      });

      const updated = await reminderRepository.findOne({
        where: { id: reminder.id },
      });

      expect(updated?.status).toBe(ReminderStatus.SENT);
      expect(updated?.sent_at).toBeDefined();
    });

    it('should handle snoozing reminders', async () => {
      const scheduledFor = new Date(Date.now() + 3600000);

      const reminder = await reminderService.createReminder({
        userId: testUser.id,
        message: 'Snoozable reminder',
        scheduledFor: scheduledFor,
        reminderType: ReminderType.FOLLOW_UP,
      });

      // Snooze for 15 minutes
      const snoozedReminder = await reminderService.snoozeReminder(
        reminder.id,
        15,
      );

      expect(snoozedReminder.status).toBe(ReminderStatus.SNOOZED);
      expect(snoozedReminder.scheduled_for.getTime()).toBeGreaterThan(
        Date.now(),
      );
    });

    it('should dismiss reminders', async () => {
      const scheduledFor = new Date(Date.now() + 3600000);

      const reminder = await reminderService.createReminder({
        userId: testUser.id,
        message: 'Dismissable reminder',
        scheduledFor: scheduledFor,
        reminderType: ReminderType.FOLLOW_UP,
      });

      await reminderService.dismissReminder(reminder.id);

      const dismissed = await reminderRepository.findOne({
        where: { id: reminder.id },
      });

      expect(dismissed?.status).toBe(ReminderStatus.DISMISSED);
    });

    it('should retrieve upcoming reminders', async () => {
      // Create multiple reminders at different times
      const now = Date.now();
      await reminderService.createReminder({
        userId: testUser.id,
        message: 'Soon 1',
        scheduledFor: new Date(now + 1800000), // 30 min
        reminderType: ReminderType.FOLLOW_UP,
      });

      await reminderService.createReminder({
        userId: testUser.id,
        message: 'Soon 2',
        scheduledFor: new Date(now + 3600000), // 1 hour
        reminderType: ReminderType.FOLLOW_UP,
      });

      await reminderService.createReminder({
        userId: testUser.id,
        message: 'Later',
        scheduledFor: new Date(now + 86400000), // 24 hours
        reminderType: ReminderType.FOLLOW_UP,
      });

      const upcoming = await reminderService.getUpcomingReminders(
        testUser.id,
        2, // Next 2 hours
      );

      expect(upcoming).toHaveLength(2);
      expect(upcoming[0].message).toBe('Soon 1');
      expect(upcoming[1].message).toBe('Soon 2');
    });

    it('should get user reminders by status', async () => {
      // Create reminders in various states
      const now = Date.now();

      await reminderService.createReminder({
        userId: testUser.id,
        message: 'Pending 1',
        scheduledFor: new Date(now + 3600000),
        reminderType: ReminderType.FOLLOW_UP,
      });

      await reminderService.createReminder({
        userId: testUser.id,
        message: 'Pending 2',
        scheduledFor: new Date(now + 7200000),
        reminderType: ReminderType.FOLLOW_UP,
      });

      const sent = await reminderService.createReminder({
        userId: testUser.id,
        message: 'Sent',
        scheduledFor: new Date(now + 10000),
        reminderType: ReminderType.FOLLOW_UP,
      });
      await reminderService.updateReminder(sent.id, {
        status: ReminderStatus.SENT,
      });

      const pending = await reminderService.getUserReminders(testUser.id, {
        status: ReminderStatus.PENDING,
      });

      const sentReminders = await reminderService.getUserReminders(
        testUser.id,
        {
          status: ReminderStatus.SENT,
        },
      );

      expect(pending.length).toBe(2);
      expect(sentReminders.length).toBe(1);
    });

    it('should update reminder details', async () => {
      const scheduledFor = new Date(Date.now() + 3600000);

      const reminder = await reminderService.createReminder({
        userId: testUser.id,
        message: 'Original message',
        scheduledFor: scheduledFor,
        reminderType: ReminderType.FOLLOW_UP,
      });

      const newScheduledFor = new Date(Date.now() + 7200000);
      const updated = await reminderService.updateReminder(reminder.id, {
        message: 'Updated message',
        scheduledFor: newScheduledFor,
      });

      expect(updated.message).toBe('Updated message');
      expect(updated.scheduled_for.getTime()).toBe(newScheduledFor.getTime());
    });

    it('should delete reminders', async () => {
      const reminder = await reminderService.createReminder({
        userId: testUser.id,
        message: 'To be deleted',
        scheduledFor: new Date(Date.now() + 3600000),
        reminderType: ReminderType.FOLLOW_UP,
      });

      await reminderService.deleteReminder(reminder.id);

      const deleted = await reminderRepository.findOne({
        where: { id: reminder.id },
      });

      expect(deleted).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle reminders scheduled in near past', async () => {
      // Should allow slightly past times (for processing delays)
      const slightlyPast = new Date(Date.now() - 1000);

      const reminder = await reminderService.createReminder({
        userId: testUser.id,
        message: 'Just past reminder',
        scheduledFor: slightlyPast,
        reminderType: ReminderType.FOLLOW_UP,
      });

      expect(reminder).toBeDefined();
      expect(reminder.status).toBe(ReminderStatus.PENDING);
    });

    it('should handle non-existent reminder operations', async () => {
      await expect(
        reminderService.updateReminder('non-existent-id', { message: 'New' }),
      ).rejects.toThrow();

      await expect(
        reminderService.snoozeReminder('non-existent-id', 15),
      ).rejects.toThrow();

      await expect(
        reminderService.dismissReminder('non-existent-id'),
      ).rejects.toThrow();
    });
  });
});
