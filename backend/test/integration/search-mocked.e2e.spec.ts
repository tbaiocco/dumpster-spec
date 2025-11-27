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
import request from 'supertest';
import { SearchController } from '../../src/modules/search/search.controller';
import { SearchService } from '../../src/modules/search/search.service';
import { VectorService } from '../../src/modules/search/vector.service';
import { JwtAuthGuard } from '../../src/modules/auth/guards/jwt-auth.guard';
import { User } from '../../src/entities/user.entity';

describe('Search Integration (e2e) - With Mocked VectorService', () => {
  let app: INestApplication;

  const mockSearchService = {
    search: jest.fn(),
    quickSearch: jest.fn(),
    getSearchSuggestions: jest.fn(),
    getSearchAnalytics: jest.fn(),
  };

  const mockVectorService = {
    generateEmbedding: jest.fn(),
    getEmbeddingStats: jest.fn(),
    migrateExistingDumps: jest.fn(),
    getHealthStatus: jest.fn(),
  };

  const mockUser: Partial<User> = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    phone_number: '+1234567890',
    verified_at: new Date(),
    timezone: 'UTC',
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
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: jest.fn(() => true),
      })
      .compile();

    app = moduleFixture.createNestApplication();

    // Mock user context in requests
    app.use((req, res, next) => {
      req.user = mockUser;
      next();
    });

    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  describe('POST /search', () => {
    it('should perform search with valid query and auth', async () => {
      const mockSearchResponse = {
        results: [
          {
            dump: {
              id: '1',
              raw_content: 'electricity bill payment',
              title: 'Bill Payment',
              tags: ['bills', 'utilities'],
              created_at: expect.any(String),
            },
            relevanceScore: 0.95,
          },
        ],
        totalCount: 1,
        searchMetadata: {
          query: 'electricity bill',
          processingTime: 150,
          embeddingGenerationTime: 50,
          searchTime: 100,
        },
      };

      mockSearchService.search.mockResolvedValueOnce(mockSearchResponse);

      const response = await request(app.getHttpServer())
        .post('/api/search')
        .send({
          query: 'electricity bill',
          limit: 10,
          offset: 0,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        results: expect.arrayContaining([
          expect.objectContaining({
            dump: expect.objectContaining({
              id: '1',
              raw_content: 'electricity bill payment',
              title: 'Bill Payment',
              tags: ['bills', 'utilities'],
            }),
            relevanceScore: 0.95,
          }),
        ]),
        totalCount: 1,
        searchMetadata: expect.objectContaining({
          query: 'electricity bill',
          processingTime: 150,
        }),
      });
      expect(mockSearchService.search).toHaveBeenCalledWith({
        query: 'electricity bill',
        limit: 10,
        offset: 0,
        userId: mockUser.id,
        filters: expect.objectContaining({
          contentTypes: undefined,
          categories: undefined,
          dateFrom: undefined,
          dateTo: undefined,
        }),
      });
    });

    it('should return 500 for invalid query (service error)', async () => {
      // Empty query passes validation but fails in service layer
      await request(app.getHttpServer())
        .post('/api/search')
        .send({
          query: '',
        })
        .expect(500);
    });
  });

  describe('GET /search/quick', () => {
    it('should perform quick search with auth', async () => {
      const mockQuickSearchResponse = {
        results: ['electricity', 'bill', 'payment'],
      };

      mockSearchService.quickSearch.mockResolvedValueOnce(
        mockQuickSearchResponse,
      );

      const response = await request(app.getHttpServer())
        .get('/api/search/quick')
        .query({ q: 'elect' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockQuickSearchResponse);
      expect(mockSearchService.quickSearch).toHaveBeenCalledWith(
        'elect',
        mockUser.id,
        5,
      );
    });
  });

  describe('Authentication', () => {
    it('should pass user context to controller methods', async () => {
      mockSearchService.getSearchSuggestions.mockResolvedValueOnce({
        suggestions: ['test'],
        popularSearches: ['test'],
      });

      await request(app.getHttpServer())
        .get('/api/search/suggestions')
        .expect(200);

      expect(mockSearchService.getSearchSuggestions).toHaveBeenCalledWith(
        mockUser.id,
        10,
      );
    });
  });
});
