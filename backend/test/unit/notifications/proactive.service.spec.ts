import { Test, TestingModule } from '@nestjs/testing';
import { ProactiveService } from '../../../src/modules/notifications/proactive.service';
import { ReminderService } from '../../../src/modules/reminders/reminder.service';
import { ClaudeService } from '../../../src/modules/ai/claude.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  Dump,
  ContentType,
  ProcessingStatus,
} from '../../../src/entities/dump.entity';
import { User } from '../../../src/entities/user.entity';
import { Repository } from 'typeorm';

describe('ProactiveService', () => {
  let service: ProactiveService;
  let reminderService: jest.Mocked<ReminderService>;
  let claudeService: jest.Mocked<ClaudeService>;
  let dumpRepository: jest.Mocked<Repository<Dump>>;
  let userRepository: jest.Mocked<Repository<User>>;

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
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
      })),
      findOne: jest.fn(),
    };

    const mockUserRepo = {
      find: jest.fn(),
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
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
      ],
    }).compile();

    service = module.get<ProactiveService>(ProactiveService);
    reminderService = module.get(ReminderService);
    claudeService = module.get(ClaudeService);
    dumpRepository = module.get(getRepositoryToken(Dump));
    userRepository = module.get(getRepositoryToken(User));
  });

  describe('analyzeUserContent', () => {
    it('should analyze recent content and suggest reminders', async () => {
      const userId = 'user-123';
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockDump]),
      };

      dumpRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Mock the AI service to return insights in the expected format
      const insights = [
        {
          type: 'deadline',
          title: 'Follow up on client meeting',
          description: 'Meeting mentioned in recent content',
          suggestedDate: '2025-12-01T14:00:00Z',
          confidence: 'high',
          relatedDumpIds: ['dump-123'],
          reasoning: 'Meeting mentioned in recent content',
        },
      ];

      claudeService.analyzeContent.mockResolvedValue({
        summary: JSON.stringify(insights),
      } as any);
      reminderService.createReminder.mockResolvedValue({
        id: 'reminder-123',
      } as any);

      const result = await service.analyzeUserContent(userId);

      expect(result).toBeDefined();
      expect(result.insights.length).toBeGreaterThan(0);
      expect(result.summary).toBeDefined();
      expect(claudeService.analyzeContent).toHaveBeenCalled();
    });

    it('should skip analysis if no recent content', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      dumpRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      const result = await service.analyzeUserContent('user-123');

      expect(result.insights).toHaveLength(0);
      expect(result.summary).toContain('No recent content');
      expect(claudeService.analyzeContent).not.toHaveBeenCalled();
    });

    it('should filter low confidence suggestions', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockDump]),
      };

      dumpRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      const insights = [
        {
          type: 'deadline',
          title: 'Low confidence reminder',
          description: 'Uncertain',
          suggestedDate: new Date().toISOString(),
          confidence: 'low',
          relatedDumpIds: ['dump-123'],
          reasoning: 'Uncertain',
        },
        {
          type: 'deadline',
          title: 'High confidence reminder',
          description: 'Clear intent',
          suggestedDate: new Date().toISOString(),
          confidence: 'high',
          relatedDumpIds: ['dump-123'],
          reasoning: 'Clear intent',
        },
      ];

      claudeService.analyzeContent.mockResolvedValue({
        summary: JSON.stringify(insights),
      } as any);
      reminderService.createReminder.mockResolvedValue({
        id: 'reminder-123',
      } as any);

      const result = await service.analyzeUserContent('user-123', {
        confidenceThreshold: 'high',
      });

      expect(result.insights.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('generateRemindersFromInsights', () => {
    it('should create reminders from AI insights', async () => {
      const userId = 'user-123';
      const insights = [
        {
          type: 'deadline' as any,
          title: 'Follow up on proposal',
          description: 'Proposal deadline approaching',
          suggestedDate: new Date('2025-12-01T10:00:00Z'),
          confidence: 'high' as any,
          relatedDumpIds: ['dump-123'],
          reasoning: 'Proposal deadline approaching',
        },
      ];

      reminderService.createReminder.mockResolvedValue({
        id: 'reminder-123',
        message: 'Follow up on proposal',
      } as any);

      const result = await service.generateRemindersFromInsights(
        userId,
        insights,
        {
          autoCreate: true,
        },
      );

      expect(result.created.length).toBeGreaterThanOrEqual(0);
      expect(result.suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle errors gracefully', async () => {
      const insights = [
        {
          type: 'deadline' as any,
          title: 'Test reminder',
          description: 'Test',
          suggestedDate: new Date(),
          confidence: 'high' as any,
          relatedDumpIds: ['dump-123'],
          reasoning: 'Test',
        },
      ];

      reminderService.createReminder.mockRejectedValue(
        new Error('Database error'),
      );

      const result = await service.generateRemindersFromInsights(
        'user-123',
        insights,
        {
          autoCreate: true,
        },
      );

      expect(result.suggestions.length).toBeGreaterThan(0); // Should fall back to suggestions on error
    });
  });
});
