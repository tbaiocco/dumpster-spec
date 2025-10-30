import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { SearchController } from '../../../src/modules/search/search.controller';
import { SearchService } from '../../../src/modules/search/search.service';
import { VectorService } from '../../../src/modules/search/vector.service';

describe('Search Integration (e2e)', () => {
  let app: INestApplication;
  let searchService: SearchService;

  const mockSearchService = {
    search: jest.fn(),
    quickSearch: jest.fn(),
    getSearchSuggestions: jest.fn(),
    getSearchAnalytics: jest.fn(),
  };

  const mockVectorService = {
    getEmbeddingStats: jest.fn(),
    migrateExistingDumps: jest.fn(),
    getHealthStatus: jest.fn(),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [
        {
          provide: SearchService,
          useValue: mockSearchService,
        },
        {
          provide: VectorService,
          useValue: mockVectorService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    searchService = moduleFixture.get<SearchService>(SearchService);
    
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  describe('POST /api/search', () => {
    it('should perform search with valid query', async () => {
      const mockSearchResponse = {
        results: [
          {
            dump: {
              id: '1',
              raw_content: 'electricity bill payment',
              ai_summary: 'Monthly electricity bill',
              urgency_level: 3,
            },
            relevanceScore: 0.95,
            matchType: 'semantic',
            matchedFields: ['content', 'summary'],
          },
        ],
        total: 1,
        query: 'find my bills',
        strategies: ['semantic', 'fuzzy', 'exact'],
        processingTime: 150,
        confidence: 0.9,
      };

      mockSearchService.search.mockResolvedValueOnce(mockSearchResponse);

      const response = await request(app.getHttpServer())
        .post('/api/search')
        .send({
          query: 'find my bills',
          contentTypes: ['text'],
          limit: 20,
          offset: 0,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockSearchResponse);
      expect(response.body.message).toContain('Found 1 results');
      
      expect(mockSearchService.search).toHaveBeenCalledWith({
        query: 'find my bills',
        userId: expect.any(String),
        filters: {
          contentTypes: ['text'],
        },
        limit: 20,
        offset: 0,
      });
    });

    it('should validate query parameters', async () => {
      await request(app.getHttpServer())
        .post('/api/search')
        .send({
          // Missing required query field
          contentTypes: ['text'],
        })
        .expect(400);
    });

    it('should handle invalid content types', async () => {
      await request(app.getHttpServer())
        .post('/api/search')
        .send({
          query: 'test',
          contentTypes: ['invalid-type'],
        })
        .expect(400);
    });
  });

  describe('GET /api/search/quick', () => {
    it('should perform quick search', async () => {
      const mockQuickResults = [
        { id: '1', title: 'Electricity Bill', snippet: 'Due next week' },
        { id: '2', title: 'Water Bill', snippet: 'Paid last month' },
      ];

      mockSearchService.quickSearch.mockResolvedValueOnce(mockQuickResults);

      const response = await request(app.getHttpServer())
        .get('/api/search/quick')
        .query({ q: 'bill', limit: 5 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockQuickResults);
      
      expect(mockSearchService.quickSearch).toHaveBeenCalledWith(
        'bill',
        expect.any(String),
        5
      );
    });

    it('should use default limit when not provided', async () => {
      mockSearchService.quickSearch.mockResolvedValueOnce([]);

      await request(app.getHttpServer())
        .get('/api/search/quick')
        .query({ q: 'test' })
        .expect(200);

      expect(mockSearchService.quickSearch).toHaveBeenCalledWith(
        'test',
        expect.any(String),
        5
      );
    });
  });

  describe('GET /api/search/health', () => {
    it('should return search service health', async () => {
      const mockHealth = {
        service: 'VectorService',
        status: 'healthy',
        timestamp: new Date(),
        details: {
          openaiConfigured: true,
          pgvectorEnabled: true,
          totalVectors: 1000,
        },
      };

      mockVectorService.getHealthStatus.mockResolvedValueOnce(mockHealth);

      const response = await request(app.getHttpServer())
        .get('/api/search/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockHealth);
    });
  });

  describe('POST /api/search/reindex', () => {
    it('should trigger content reindexing', async () => {
      const mockStats = {
        dumpsTotal: 1000,
        dumpsWithVectors: 800,
        avgProcessingTime: 250,
      };

      const mockUpdatedStats = {
        dumpsTotal: 1000,
        dumpsWithVectors: 1000,
        avgProcessingTime: 245,
      };

      mockVectorService.getEmbeddingStats
        .mockResolvedValueOnce(mockStats)
        .mockResolvedValueOnce(mockUpdatedStats);
      
      mockVectorService.migrateExistingDumps.mockResolvedValueOnce({
        processed: 200,
        errors: [],
      });

      const response = await request(app.getHttpServer())
        .post('/api/search/reindex')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.processed).toBe(200);
      expect(response.body.message).toContain('reindexing completed successfully');
    });

    it('should handle reindexing errors', async () => {
      mockVectorService.getEmbeddingStats.mockRejectedValueOnce(
        new Error('Database connection failed')
      );

      const response = await request(app.getHttpServer())
        .post('/api/search/reindex')
        .expect(200);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Reindexing failed');
    });
  });

  describe('GET /api/search/categories/:categoryId', () => {
    it('should search by category', async () => {
      const mockCategoryResults = {
        results: [
          {
            dump: {
              id: '1',
              raw_content: 'Monthly electricity bill',
              category: { name: 'bills' },
            },
            relevanceScore: 1.0,
            matchType: 'exact',
          },
        ],
        total: 1,
      };

      mockSearchService.search.mockResolvedValueOnce(mockCategoryResults);

      const response = await request(app.getHttpServer())
        .get('/api/search/categories/bills')
        .query({ limit: 10, offset: 0 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockCategoryResults.results);
      
      expect(mockSearchService.search).toHaveBeenCalledWith({
        query: '',
        userId: expect.any(String),
        filters: {
          categories: ['bills'],
        },
        limit: 10,
        offset: 0,
      });
    });
  });

  describe('POST /api/search/feedback', () => {
    it('should submit search feedback', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/search/feedback')
        .send({
          query: 'find my bills',
          resultId: 'dump-123',
          rating: 5,
          comment: 'Perfect results!',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.received).toBe(true);
      expect(response.body.message).toContain('feedback submitted successfully');
    });

    it('should validate rating values', async () => {
      await request(app.getHttpServer())
        .post('/api/search/feedback')
        .send({
          query: 'test',
          rating: 6, // Invalid rating > 5
        })
        .expect(400);
    });
  });
});