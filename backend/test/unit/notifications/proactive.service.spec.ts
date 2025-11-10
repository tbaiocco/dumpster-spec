import { Test, TestingModule } from '@nestjs/testing';
import { ProactiveService } from '../../../src/modules/notifications/proactive.service';
import { ReminderService } from '../../../src/modules/reminders/reminder.service';
import { ClaudeService } from '../../../src/modules/ai/claude.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Dump, ContentType, ProcessingStatus } from '../../../src/entities/dump.entity';
import { Repository } from 'typeorm';

describe('ProactiveService', () => {
  let service: ProactiveService;
  let reminderService: jest.Mocked<ReminderService>;
  let claudeService: jest.Mocked<ClaudeService>;
  let dumpRepository: jest.Mocked<Repository<Dump>>;

  const mockDump: Partial<Dump> = {
    id: 'dump-123',
    user_id: 'user-123',
    raw_content: 'Meeting with client on Friday at 2pm',
    content_type: ContentType.TEXT,
    ai_summary: 'Meeting scheduled',
    processing_status: ProcessingStatus.COMPLETED,
    created_at: new Date(),
  };

  beforeEach(async () => {
    const mockReminderService = {
      createReminder: jest.fn(),
      getRemindersByDumpId: jest.fn(),
    };

    const mockClaudeService = {
      analyzeContent: jest.fn(),
    };

    const mockDumpRepo = {
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
      })),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProactiveService,
        {
          provide: ReminderService,
          useValue: mockReminderService,
        },
        {
          provide: ClaudeService,
          useValue: mockClaudeService,
        },
        {
          provide: getRepositoryToken(Dump),
          useValue: mockDumpRepo,
        },
      ],
    }).compile();

    service = module.get<ProactiveService>(ProactiveService);
    reminderService = module.get(ReminderService);
    claudeService = module.get(ClaudeService);
    dumpRepository = module.get(getRepositoryToken(Dump));
  });

  describe('analyzeUserContent', () => {
    it('should analyze recent content and suggest reminders', async () => {
      const userId = 'user-123';
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockDump]),
      };

      dumpRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const aiInsights = {
        suggestedReminders: [
          {
            message: 'Follow up on client meeting',
            scheduledFor: new Date('2025-12-01T14:00:00Z'),
            confidence: 0.85,
            reasoning: 'Meeting mentioned in recent content',
          },
        ],
        patterns: ['Frequent meetings'],
        recommendations: ['Set pre-meeting reminders'],
      };

      claudeService.analyzeContent.mockResolvedValue(aiInsights as any);
      reminderService.createReminder.mockResolvedValue({ id: 'reminder-123' } as any);

      const result = await service.analyzeUserContent(userId);

      expect(result).toBeDefined();
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(claudeService.analyzeContent).toHaveBeenCalled();
    });

    it('should skip analysis if no recent content', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      dumpRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.analyzeUserContent('user-123');

      expect(result.suggestions).toHaveLength(0);
      expect(claudeService.analyzeContent).not.toHaveBeenCalled();
    });

    it('should filter low confidence suggestions', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockDump]),
      };

      dumpRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const aiInsights = {
        suggestedReminders: [
          {
            message: 'Low confidence reminder',
            scheduledFor: new Date(),
            confidence: 0.3, // Below threshold
            reasoning: 'Uncertain',
          },
          {
            message: 'High confidence reminder',
            scheduledFor: new Date(),
            confidence: 0.9, // Above threshold
            reasoning: 'Clear intent',
          },
        ],
        patterns: [],
        recommendations: [],
      };

      claudeService.analyzeContent.mockResolvedValue(aiInsights as any);
      reminderService.createReminder.mockResolvedValue({ id: 'reminder-123' } as any);

      const result = await service.analyzeUserContent('user-123', { minConfidence: 0.7 });

      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].confidence).toBeGreaterThanOrEqual(0.7);
    });
  });

  describe('generateRemindersFromInsights', () => {
    it('should create reminders from AI insights', async () => {
      const userId = 'user-123';
      const insights = [
        {
          message: 'Follow up on proposal',
          scheduledFor: new Date('2025-12-01T10:00:00Z'),
          confidence: 0.85,
          reasoning: 'Proposal deadline approaching',
          dumpId: 'dump-123',
        },
      ];

      reminderService.createReminder.mockResolvedValue({
        id: 'reminder-123',
        message: 'Follow up on proposal',
      } as any);

      const result = await service.generateRemindersFromInsights(userId, insights);

      expect(result).toHaveLength(1);
      expect(reminderService.createReminder).toHaveBeenCalledWith({
        userId,
        message: insights[0].message,
        scheduledFor: insights[0].scheduledFor,
        dumpId: insights[0].dumpId,
        aiConfidence: 85,
        reminderType: expect.any(String),
      });
    });

    it('should handle errors gracefully', async () => {
      const insights = [
        {
          message: 'Test reminder',
          scheduledFor: new Date(),
          confidence: 0.8,
          reasoning: 'Test',
        },
      ];

      reminderService.createReminder.mockRejectedValue(new Error('Database error'));

      const result = await service.generateRemindersFromInsights('user-123', insights);

      expect(result).toHaveLength(0); // Should return empty array on error
    });
  });

  describe('extractInsightsWithAI', () => {
    it('should call Claude API with proper context', async () => {
      const dumps = [mockDump];
      const aiResponse = {
        suggestedReminders: [],
        patterns: ['Work meetings'],
        recommendations: ['Set recurring reminders'],
      };

      claudeService.analyzeContent.mockResolvedValue(aiResponse as any);

      await (service as any).extractInsightsWithAI(dumps);

      expect(claudeService.analyzeContent).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('Meeting with client'),
            }),
          ]),
        }),
      );
    });

    it('should handle Claude API errors', async () => {
      const dumps = [mockDump];
      claudeService.analyzeContent.mockRejectedValue(new Error('API error'));

      const result = await (service as any).extractInsightsWithAI(dumps);

      expect(result.suggestedReminders).toHaveLength(0);
      expect(result.patterns).toHaveLength(0);
    });
  });

  describe('shouldCreateProactiveReminder', () => {
    it('should create reminder if none exist for dump', async () => {
      dumpRepository.findOne.mockResolvedValue(mockDump as Dump);
      reminderService.getRemindersByDumpId.mockResolvedValue([]);

      const shouldCreate = await service.shouldCreateProactiveReminder('dump-123');

      expect(shouldCreate).toBe(true);
    });

    it('should not create if reminders already exist', async () => {
      dumpRepository.findOne.mockResolvedValue(mockDump as Dump);
      reminderService.getRemindersByDumpId.mockResolvedValue([
        { id: 'reminder-123' },
      ] as any);

      const shouldCreate = await service.shouldCreateProactiveReminder('dump-123');

      expect(shouldCreate).toBe(false);
    });

    it('should not create for old dumps', async () => {
      const oldDump = {
        ...mockDump,
        created_at: new Date('2020-01-01'),
      };

      dumpRepository.findOne.mockResolvedValue(oldDump as Dump);
      reminderService.getRemindersByDumpId.mockResolvedValue([]);

      const shouldCreate = await service.shouldCreateProactiveReminder('dump-123');

      expect(shouldCreate).toBe(false);
    });
  });
});
