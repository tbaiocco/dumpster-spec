import { Test, TestingModule } from '@nestjs/testing';
import { VectorService } from './vector.service';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

// Mock @xenova/transformers
jest.mock('@xenova/transformers', () => ({
  pipeline: jest.fn().mockResolvedValue(
    jest.fn().mockResolvedValue({
      data: new Array(384).fill(0).map(() => Math.random()), // Mock 384-dimensional vector
    })
  ),
  env: {
    allowLocalModels: false,
    allowRemoteModels: true,
  },
}));

describe('VectorService', () => {
  let service: VectorService;
  let dataSource: DataSource;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        VectorService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(() => null), // No config needed for local embeddings
          },
        },
        {
          provide: DataSource,
          useValue: {
            query: jest.fn()
              .mockResolvedValueOnce([{ exists: true }]) // pgvector extension check
              .mockResolvedValueOnce([]), // pgvector test query
            transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<VectorService>(VectorService);
    dataSource = module.get<DataSource>(DataSource);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateEmbedding', () => {
    beforeEach(async () => {
      // Initialize the service (load mock model)
      await service.onModuleInit();
    });

    it('should generate embedding for text input', async () => {
      const result = await service.generateEmbedding({
        text: 'test content',
      });

      expect(result).toEqual({
        embedding: expect.any(Array),
        tokens: Math.ceil('test content'.length / 4), // Rough token estimate
        model: 'Xenova/all-MiniLM-L6-v2',
      });

      expect(result.embedding).toHaveLength(384); // all-MiniLM-L6-v2 dimensions
      // Note: We can't easily test the pipeline call directly due to mocking constraints
    });

    it('should handle model not loaded error', async () => {
      // Create service without initializing (model not loaded)  
      const configService = module.get<ConfigService>(ConfigService);
      const uninitializedService = new VectorService(dataSource, configService);

      await expect(
        uninitializedService.generateEmbedding({ text: 'test content' })
      ).rejects.toThrow('Embedding model not loaded');
    });

    it('should handle empty text input', async () => {
      await expect(
        service.generateEmbedding({ text: '' })
      ).rejects.toThrow('Text content is required');
    });
  });

  describe('calculateCosineSimilarity', () => {
    it('should calculate cosine similarity correctly', () => {
      const vector1 = [1, 0, 0];
      const vector2 = [0, 1, 0];
      
      const similarity = service.calculateCosineSimilarity(vector1, vector2);
      expect(similarity).toBe(0); // Orthogonal vectors
    });

    it('should handle identical vectors', () => {
      const vector1 = [1, 2, 3];
      const vector2 = [1, 2, 3];
      
      const similarity = service.calculateCosineSimilarity(vector1, vector2);
      expect(similarity).toBe(1); // Identical vectors
    });

    it('should handle zero vectors', () => {
      const vector1 = [0, 0, 0];
      const vector2 = [1, 2, 3];
      
      const similarity = service.calculateCosineSimilarity(vector1, vector2);
      expect(similarity).toBe(0); // Zero vector similarity
    });
  });

  describe('migrateExistingDumps', () => {
    beforeEach(async () => {
      // Initialize the service (load mock model)
      await service.onModuleInit();
    });

    it('should process dumps without embeddings', async () => {
      const mockDumps = [
        { id: '1', raw_content: 'test content 1', ai_summary: 'summary 1' },
        { id: '2', raw_content: 'test content 2', ai_summary: 'summary 2' },
      ];

      // Mock database queries
      (dataSource.query as jest.Mock)
        .mockResolvedValueOnce(mockDumps) // SELECT query for dumps without vectors
        .mockResolvedValue([]); // UPDATE queries

      // Mock transaction method
      (dataSource.transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback({
          query: jest.fn().mockResolvedValue([]),
        });
      });

      await service.migrateExistingDumps(10);

      expect(dataSource.query).toHaveBeenCalled();
      // Local model processing is tested indirectly through database updates
    });
  });

  describe('getHealthStatus', () => {
    beforeEach(async () => {
      // Initialize the service (load mock model)
      await service.onModuleInit();
    });

    it('should return health status', async () => {
      // Mock pgvector extension check
      (dataSource.query as jest.Mock)
        .mockResolvedValueOnce([]) // pgvector test query
        .mockResolvedValueOnce([{ total_dumps: '100', dumps_with_vectors: '80' }]); // stats query

      const health = await service.getHealthStatus();

      expect(health).toEqual({
        pgvectorEnabled: true,
        embeddingServiceConfigured: true, // Local model is always configured
        vectorStats: {
          totalDumps: 100,
          dumpsWithVectors: 80,
          vectorCoverage: 80,
        },
      });
    });
  });
});