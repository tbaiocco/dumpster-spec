import { Test, TestingModule } from '@nestjs/testing';
import { DigestService } from '../../../src/modules/notifications/digest.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  Dump,
  ContentType,
  ProcessingStatus,
} from '../../../src/entities/dump.entity';
import { User } from '../../../src/entities/user.entity';
import { ReminderService } from '../../../src/modules/reminders/reminder.service';
import { ReminderStatus } from '../../../src/entities/reminder.entity';
import { Repository } from 'typeorm';
import { TranslationService } from '../../../src/modules/ai/translation.service';

describe('DigestService', () => {
  let service: DigestService;
  let dumpRepository: jest.Mocked<Repository<Dump>>;
  let reminderService: jest.Mocked<ReminderService>;

  const mockDump: Partial<Dump> = {
    id: 'dump-123',
    user_id: 'user-123',
    raw_content: 'Test content',
    content_type: ContentType.TEXT,
    ai_summary: 'Test summary',
    processing_status: ProcessingStatus.COMPLETED,
    created_at: new Date(),
    category: {
      id: 'cat-1',
      name: 'Work',
      icon: '💼',
      created_at: new Date(),
    },
  };

  const mockReminder = {
    id: 'reminder-123',
    user_id: 'user-123',
    message: 'Test reminder',
    scheduled_for: new Date(),
    status: ReminderStatus.PENDING,
  };

  beforeEach(async () => {
    const mockDumpRepo = {
      find: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
      })),
    };

    const mockReminderService = {
      getUpcomingReminders: jest.fn(),
      getPendingReminders: jest.fn(),
      getUserReminders: jest.fn(),
    };

    const mockUserRepo = {
      findOne: jest.fn(),
    };

    const mockTranslationService = {
      translate: jest.fn().mockResolvedValue({
        translatedText: 'Translated text',
        detectedSourceLanguage: 'en',
      }),
      translateBatch: jest.fn().mockResolvedValue(['Translated text']),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DigestService,
        {
          provide: getRepositoryToken(Dump),
          useValue: mockDumpRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
        {
          provide: ReminderService,
          useValue: mockReminderService,
        },
        {
          provide: TranslationService,
          useValue: mockTranslationService,
        },
      ],
    }).compile();

    service = module.get<DigestService>(DigestService);
    dumpRepository = module.get(getRepositoryToken(Dump));
    reminderService = module.get(ReminderService);
  });

  describe('generateDailyDigest', () => {
    it('should generate digest with dumps and reminders', async () => {
      const userId = 'user-123';

      dumpRepository.find.mockResolvedValue([mockDump] as any);
      reminderService.getUserReminders.mockResolvedValue([mockReminder] as any);
      reminderService.getUpcomingReminders.mockResolvedValue([
        mockReminder,
      ] as any);

      const result = await service.generateDailyDigest(userId);

      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.sections.length).toBeGreaterThan(0);
    });

    it('should include category breakdown', async () => {
      const dumps = [
        { ...mockDump, category: { name: 'Work' } },
        { ...mockDump, category: { name: 'Work' } },
        { ...mockDump, category: { name: 'Personal' } },
      ];

      dumpRepository.find.mockResolvedValue(dumps as any);
      reminderService.getUserReminders.mockResolvedValue([]);
      reminderService.getUpcomingReminders.mockResolvedValue([]);

      const result = await service.generateDailyDigest('user-123');

      expect(result.summary.categoriesBreakdown).toBeDefined();
      expect(result.summary.categoriesBreakdown['Work']).toBe(2);
      expect(result.summary.categoriesBreakdown['Personal']).toBe(1);
    });

    it('should handle empty results', async () => {
      dumpRepository.find.mockResolvedValue([]);
      reminderService.getUserReminders.mockResolvedValue([]);
      reminderService.getUpcomingReminders.mockResolvedValue([]);

      const result = await service.generateDailyDigest('user-123');

      expect(result.sections).toHaveLength(0);
      expect(result.summary.totalItems).toBe(0);
    });
  });

  describe('generateMorningDigest', () => {
    it('should generate morning-focused digest', async () => {
      dumpRepository.find.mockResolvedValue([mockDump] as any);
      reminderService.getUserReminders.mockResolvedValue([mockReminder] as any);
      reminderService.getUpcomingReminders.mockResolvedValue([
        mockReminder,
      ] as any);

      const result = await service.generateMorningDigest('user-123');

      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
    });

    it("should prioritize today's tasks", async () => {
      const todayReminder = {
        ...mockReminder,
        scheduled_for: new Date(),
      };
      const laterReminder = {
        ...mockReminder,
        id: 'reminder-456',
        scheduled_for: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      dumpRepository.find.mockResolvedValue([]);
      reminderService.getUserReminders.mockResolvedValue([
        todayReminder,
        laterReminder,
      ] as any);
      reminderService.getUpcomingReminders.mockResolvedValue([
        todayReminder,
        laterReminder,
      ] as any);

      const result = await service.generateMorningDigest('user-123');

      expect(result.sections).toBeDefined();
      expect(result.summary.pendingReminders).toBeGreaterThan(0);
    });
  });

  describe('generateEveningDigest', () => {
    it('should generate evening-focused digest', async () => {
      dumpRepository.find.mockResolvedValue([mockDump] as any);
      reminderService.getUserReminders.mockResolvedValue([mockReminder] as any);
      reminderService.getUpcomingReminders.mockResolvedValue([
        mockReminder,
      ] as any);

      const result = await service.generateEveningDigest('user-123');

      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
    });

    it("should include tomorrow's preview", async () => {
      const tomorrowReminder = {
        ...mockReminder,
        scheduled_for: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      dumpRepository.find.mockResolvedValue([mockDump] as any);
      reminderService.getUserReminders.mockResolvedValue([
        tomorrowReminder,
      ] as any);
      reminderService.getUpcomingReminders.mockResolvedValue([
        tomorrowReminder,
      ] as any);

      const result = await service.generateEveningDigest('user-123');

      expect(result.sections).toBeDefined();
    });
  });

  describe('formatDigestAsHTML', () => {
    it('should format digest as HTML', async () => {
      dumpRepository.find.mockResolvedValue([mockDump] as any);
      reminderService.getUserReminders.mockResolvedValue([mockReminder] as any);
      reminderService.getUpcomingReminders.mockResolvedValue([
        mockReminder,
      ] as any);

      const digest = await service.generateDailyDigest('user-123');
      const html = service.formatDigestAsHTML(digest);

      expect(html).toContain('<strong>');
      expect(html).toContain('</strong>');
      expect(html).toContain('<div style=');
    });

    it('should escape HTML in content', async () => {
      const maliciousDump = {
        ...mockDump,
        ai_summary: '<script>alert("xss")</script>',
      };

      dumpRepository.find.mockResolvedValue([maliciousDump] as any);
      reminderService.getUserReminders.mockResolvedValue([]);
      reminderService.getUpcomingReminders.mockResolvedValue([]);

      const digest = await service.generateDailyDigest('user-123');
      const html = service.formatDigestAsHTML(digest);

      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });
  });

  describe('formatDigestAsText', () => {
    it('should format digest as plain text', async () => {
      dumpRepository.find.mockResolvedValue([mockDump] as any);
      reminderService.getUserReminders.mockResolvedValue([mockReminder] as any);
      reminderService.getUpcomingReminders.mockResolvedValue([
        mockReminder,
      ] as any);

      const digest = await service.generateDailyDigest('user-123');
      const text = await service.formatDigestAsText(digest);

      expect(text).toBeDefined();
      expect(text).not.toContain('<b>');
    });
  });
});
