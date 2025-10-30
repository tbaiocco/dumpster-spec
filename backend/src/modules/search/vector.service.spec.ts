import { Test, TestingModule } from '@nestjs/testing';
import { VectorService } from './vector.service';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

// Mock OpenAI
const mockOpenAI = {
  embeddings: {
    create: jest.fn(),
  },
};

describe('VectorService', () => {
  let service: VectorService;
  let configService: ConfigService;
  let dataSource: DataSource;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VectorService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              switch (key) {
                case 'OPENAI_API_KEY':
                  return 'test-key';
                case 'OPENAI_EMBEDDING_MODEL':
                  return 'text-embedding-3-small';
                default:
                  return null;
              }
            }),
          },
        },
        {
          provide: DataSource,
          useValue: {
            query: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<VectorService>(VectorService);
    configService = module.get<ConfigService>(ConfigService);
    dataSource = module.get<DataSource>(DataSource);

    // Mock the private openai property
    (service as any).openai = mockOpenAI;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateEmbedding', () => {
    it('should generate embedding for text input', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      mockOpenAI.embeddings.create.mockResolvedValueOnce({
        data: [{ embedding: mockEmbedding }],
        usage: { total_tokens: 10 },
        model: 'text-embedding-3-small',
      });

      const result = await service.generateEmbedding({
        text: 'test content',
      });

      expect(result).toEqual({
        embedding: mockEmbedding,
        tokens: 10,
        model: 'text-embedding-3-small',
      });

      expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: 'test content',
        encoding_format: 'float',
      });
    });

    it('should handle OpenAI API errors', async () => {
      mockOpenAI.embeddings.create.mockRejectedValueOnce(
        new Error('OpenAI API error')
      );

      await expect(
        service.generateEmbedding({ text: 'test content' })
      ).rejects.toThrow('Embedding generation failed');
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
    it('should process dumps without embeddings', async () => {
      const mockDumps = [
        { id: '1', raw_content: 'test content 1', ai_summary: 'summary 1' },
        { id: '2', raw_content: 'test content 2', ai_summary: 'summary 2' },
      ];

      (dataSource.query as jest.Mock)
        .mockResolvedValueOnce(mockDumps) // SELECT query
        .mockResolvedValue([]); // UPDATE queries

      mockOpenAI.embeddings.create.mockResolvedValue({
        data: [
          { embedding: [0.1, 0.2, 0.3] },
          { embedding: [0.4, 0.5, 0.6] },
        ],
        usage: { total_tokens: 20 },
        model: 'text-embedding-3-small',
      });

      const result = await service.migrateExistingDumps(10);

      expect(result.processed).toBe(2);
      expect(result.errors).toHaveLength(0);
      expect(mockOpenAI.embeddings.create).toHaveBeenCalled();
    });
  });

  describe('getHealthStatus', () => {
    it('should return health status', async () => {
      (dataSource.query as jest.Mock).mockResolvedValueOnce([{ count: '100' }]);

      const health = await service.getHealthStatus();

      expect(health).toEqual({
        service: 'VectorService',
        status: 'healthy',
        timestamp: expect.any(Date),
        details: {
          openaiConfigured: true,
          pgvectorEnabled: true,
          totalVectors: 100,
        },
      });
    });
  });
});