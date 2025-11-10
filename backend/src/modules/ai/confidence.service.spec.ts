import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfidenceService } from './confidence.service';
import { Dump } from '../../entities/dump.entity';

describe('ConfidenceService', () => {
  let service: ConfidenceService;

  const mockDumpRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfidenceService,
        {
          provide: getRepositoryToken(Dump),
          useValue: mockDumpRepository,
        },
      ],
    }).compile();

    service = module.get<ConfidenceService>(ConfidenceService);
    jest.clearAllMocks();
  });

  describe('analyzeConfidence', () => {
    it('should analyze confidence for a high-quality dump', async () => {
      // Arrange
      const dumpId = 'test-dump-id';
      const mockDump = {
        id: dumpId,
        ai_summary: 'Meeting with client about project requirements',
        raw_content: 'This is a detailed meeting about project requirements and business objectives for the upcoming quarter.',
        category_id: 'business',
        ai_confidence: 0.92,
        content_type: 'text',
        extracted_entities: { count: 5 },
        category: { name: 'Business' },
      } as unknown as Dump;

      mockDumpRepository.findOne.mockResolvedValue(mockDump);

      // Act
      const result = await service.analyzeConfidence(dumpId);

      // Assert
      expect(result.dumpId).toBe(dumpId);
      expect(result.overallScore).toBeGreaterThan(0.8);
      expect(result.confidence).toBe('high');
      expect(result.needsReview).toBe(false);
      expect(result.recommendation).toBe('accept');
    });

    it('should identify low confidence dumps that need review', async () => {
      // Arrange
      const dumpId = 'low-confidence-dump';
      const mockDump = {
        id: dumpId,
        ai_summary: 'unclear',
        raw_content: 'Some unclear content that is difficult to understand or categorize properly.',
        category_id: 'unknown',
        ai_confidence: 0.35,
        content_type: 'text',
        extracted_entities: { count: 1 },
        category: { name: 'Unknown' },
      } as unknown as Dump;

      mockDumpRepository.findOne.mockResolvedValue(mockDump);

      // Act
      const result = await service.analyzeConfidence(dumpId);

      // Assert
      expect(result.overallScore).toBeLessThan(0.5);
      expect(result.confidence).toBe('low');
      expect(result.needsReview).toBe(true);
      expect(result.recommendation).toBe('reject');
      expect(result.reasons).toContain('Low confidence - manual review required');
    });

    it('should throw error for non-existent dump', async () => {
      // Arrange
      const dumpId = 'non-existent-dump';
      mockDumpRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.analyzeConfidence(dumpId)).rejects.toThrow('Dump not found');
    });
  });

  describe('isConfidentResult', () => {
    it('should return true for high confidence scores', () => {
      // Act & Assert
      expect(service.isConfidentResult(0.85)).toBe(true);
      expect(service.isConfidentResult(0.9)).toBe(true);
      expect(service.isConfidentResult(1)).toBe(true);
    });

    it('should return false for low confidence scores', () => {
      // Act & Assert
      expect(service.isConfidentResult(0.5)).toBe(false);
      expect(service.isConfidentResult(0.3)).toBe(false);
      expect(service.isConfidentResult(0)).toBe(false);
    });

    it('should use custom thresholds when provided', () => {
      // Arrange
      const customThresholds = { good: 0.9 };

      // Act & Assert
      expect(service.isConfidentResult(0.85, customThresholds)).toBe(false);
      expect(service.isConfidentResult(0.95, customThresholds)).toBe(true);
    });
  });

  describe('needsReview', () => {
    it('should return true for scores below minimum threshold', () => {
      // Act & Assert
      expect(service.needsReview(0.3)).toBe(true);
      expect(service.needsReview(0.1)).toBe(true);
      expect(service.needsReview(0)).toBe(true);
    });

    it('should return false for scores above minimum threshold', () => {
      // Act & Assert
      expect(service.needsReview(0.5)).toBe(false);
      expect(service.needsReview(0.8)).toBe(false);
      expect(service.needsReview(1)).toBe(false);
    });

    it('should use custom thresholds when provided', () => {
      // Arrange
      const customThresholds = { minimum: 0.6 };

      // Act & Assert
      expect(service.needsReview(0.5, customThresholds)).toBe(true);
      expect(service.needsReview(0.7, customThresholds)).toBe(false);
    });
  });

  describe('batchAnalyzeConfidence', () => {
    it('should analyze multiple dumps successfully', async () => {
      // Arrange
      const dumpIds = ['dump1', 'dump2'];
      const mockDump1 = {
        id: 'dump1',
        ai_summary: 'First dump',
        raw_content: 'First dump content for testing purposes',
        ai_confidence: 0.8,
        category: { name: 'Test' },
      } as unknown as Dump;
      const mockDump2 = {
        id: 'dump2',
        ai_summary: 'Second dump',
        raw_content: 'Second dump content for testing purposes',
        ai_confidence: 0.6,
        category: { name: 'Test' },
      } as unknown as Dump;

      mockDumpRepository.findOne
        .mockResolvedValueOnce(mockDump1)
        .mockResolvedValueOnce(mockDump2);

      // Act
      const results = await service.batchAnalyzeConfidence(dumpIds);

      // Assert
      expect(results).toHaveLength(2);
      expect(results[0].dumpId).toBe('dump1');
      expect(results[1].dumpId).toBe('dump2');
    });

    it('should handle errors gracefully and continue processing', async () => {
      // Arrange
      const dumpIds = ['dump1', 'invalid-dump', 'dump3'];
      const mockDump1 = {
        id: 'dump1',
        ai_summary: 'First dump',
        raw_content: 'First dump content for testing purposes',
        ai_confidence: 0.8,
        category: { name: 'Test' },
      } as unknown as Dump;
      const mockDump3 = {
        id: 'dump3',
        ai_summary: 'Third dump',
        raw_content: 'Third dump content for testing purposes',
        ai_confidence: 0.7,
        category: { name: 'Test' },
      } as unknown as Dump;

      mockDumpRepository.findOne
        .mockResolvedValueOnce(mockDump1)
        .mockResolvedValueOnce(null) // This will cause an error
        .mockResolvedValueOnce(mockDump3);

      // Act
      const results = await service.batchAnalyzeConfidence(dumpIds);

      // Assert
      expect(results).toHaveLength(2); // Should skip the failed one
      expect(results[0].dumpId).toBe('dump1');
      expect(results[1].dumpId).toBe('dump3');
    });
  });

  describe('getUserConfidenceStats', () => {
    it('should calculate user confidence statistics', async () => {
      // Arrange
      const userId = 'test-user';
      const mockDumps = [
        { id: '1', ai_confidence: 0.9, processing_status: 'completed' },
        { id: '2', ai_confidence: 0.6, processing_status: 'completed' },
        { id: '3', ai_confidence: 0.3, processing_status: 'completed' },
        { id: '4', ai_confidence: null, processing_status: 'pending' },
      ] as unknown as Dump[];

      mockDumpRepository.find.mockResolvedValue(mockDumps);

      // Act
      const stats = await service.getUserConfidenceStats(userId);

      // Assert
      expect(stats.totalDumps).toBe(4);
      expect(stats.highConfidence).toBe(1); // 0.9
      expect(stats.mediumConfidence).toBe(1); // 0.6
      expect(stats.lowConfidence).toBe(1); // 0.3
      expect(stats.needsReview).toBe(1); // 0.3 is below 0.4 threshold
      expect(stats.averageScore).toBe(0.6); // (0.9 + 0.6 + 0.3) / 3
    });

    it('should handle empty user dumps', async () => {
      // Arrange
      const userId = 'empty-user';
      mockDumpRepository.find.mockResolvedValue([]);

      // Act
      const stats = await service.getUserConfidenceStats(userId);

      // Assert
      expect(stats.totalDumps).toBe(0);
      expect(stats.highConfidence).toBe(0);
      expect(stats.mediumConfidence).toBe(0);
      expect(stats.lowConfidence).toBe(0);
      expect(stats.needsReview).toBe(0);
      expect(stats.averageScore).toBe(0);
    });
  });
});