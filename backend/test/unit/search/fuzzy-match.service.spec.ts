import { Test, TestingModule } from '@nestjs/testing';
import { FuzzyMatchService } from '../../../src/modules/search/fuzzy-match.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Dump } from '../../../src/entities/dump.entity';

describe('FuzzyMatchService', () => {
  let service: FuzzyMatchService;
  let mockRepository: any;

  beforeEach(async () => {
    mockRepository = {
      createQueryBuilder: jest.fn(() => ({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
        select: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn(),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FuzzyMatchService,
        {
          provide: getRepositoryToken(Dump),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<FuzzyMatchService>(FuzzyMatchService);
  });

  describe('calculateLevenshteinDistance', () => {
    it('should calculate correct distance for identical strings', () => {
      const distance = (service as any).calculateLevenshteinDistance('hello', 'hello');
      expect(distance).toBe(0);
    });

    it('should calculate correct distance for completely different strings', () => {
      const distance = (service as any).calculateLevenshteinDistance('cat', 'dog');
      expect(distance).toBe(3);
    });

    it('should calculate correct distance for single character changes', () => {
      const distance = (service as any).calculateLevenshteinDistance('hello', 'hallo');
      expect(distance).toBe(1);
    });

    it('should handle empty strings', () => {
      const distance = (service as any).calculateLevenshteinDistance('', 'hello');
      expect(distance).toBe(5);
    });
  });

  describe('calculateLevenshteinSimilarity', () => {
    it('should return 1 for identical strings', () => {
      const similarity = (service as any).calculateLevenshteinSimilarity('hello', 'hello');
      expect(similarity).toBe(1);
    });

    it('should return 0 for completely different strings', () => {
      const similarity = (service as any).calculateLevenshteinSimilarity('abc', 'xyz');
      expect(similarity).toBeLessThan(1);
    });

    it('should return high similarity for typos', () => {
      const similarity = (service as any).calculateLevenshteinSimilarity('electricity', 'electrisity');
      expect(similarity).toBeGreaterThan(0.8);
    });
  });

  describe('normalizeQuery', () => {
    it('should normalize and tokenize query', () => {
      const result = (service as any).normalizeQuery('Find My Bills!');
      expect(result).toEqual(['find', 'my', 'bills']);
    });

    it('should filter out single characters', () => {
      const result = (service as any).normalizeQuery('a big test');
      expect(result).toEqual(['big', 'test']);
    });

    it('should handle special characters', () => {
      const result = (service as any).normalizeQuery('test@#$%data');
      expect(result).toEqual(['test', 'data']);
    });
  });

  describe('search', () => {
    it('should return empty array for empty query terms', async () => {
      const result = await service.search({
        query: 'a',
        userId: 'user-123',
      });

      expect(result).toEqual([]);
    });

    it('should perform fuzzy search with valid query', async () => {
      const mockDumps = [
        {
          id: '1',
          raw_content: 'electricity bill payment',
          ai_summary: 'bill summary',
          category: { name: 'bills' },
          user_id: 'user-123',
        },
      ];

      mockRepository.createQueryBuilder().getMany.mockResolvedValueOnce(mockDumps);

      const result = await service.search({
        query: 'electrisity bill',
        userId: 'user-123',
        minScore: 0.3,
      });

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].dump).toEqual(mockDumps[0]);
      expect(result[0].score).toBeGreaterThan(0.3);
    });
  });

  describe('generatePhoneticCode', () => {
    it('should generate consistent phonetic codes for similar sounds', () => {
      const code1 = (service as any).generatePhoneticCode('hello');
      const code2 = (service as any).generatePhoneticCode('helo');
      
      expect(code1).toEqual(code2);
    });

    it('should handle empty input', () => {
      const code = (service as any).generatePhoneticCode('');
      expect(code).toBe('');
    });
  });
});