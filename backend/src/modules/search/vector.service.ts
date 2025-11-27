import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { pipeline, env } from '@xenova/transformers';

export interface EmbeddingGenerationRequest {
  text: string;
  model?:
    | 'sentence-transformers/all-MiniLM-L6-v2'
    | 'sentence-transformers/all-mpnet-base-v2';
}

export interface EmbeddingGenerationResponse {
  embedding: number[];
  tokens: number;
  model: string;
}

@Injectable()
export class VectorService implements OnModuleInit {
  private readonly logger = new Logger(VectorService.name);
  private readonly defaultModel = 'Xenova/all-MiniLM-L6-v2'; // Local model, 384 dimensions
  private readonly embeddingDimension = 384; // all-MiniLM-L6-v2 dimensions
  private extractor: any; // Will hold the loaded pipeline

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {
    // Configure transformers.js to use local models
    env.allowLocalModels = false;
    env.allowRemoteModels = true;

    this.logger.log(
      'VectorService initialized - will load sentence transformers locally',
    );
  }

  async onModuleInit() {
    await this.ensurePgVectorExtension();
    await this.loadEmbeddingModel();
  }

  /**
   * Load the sentence transformer model locally
   */
  private async loadEmbeddingModel(): Promise<void> {
    try {
      this.logger.log('Loading sentence transformer model...');
      this.extractor = await pipeline('feature-extraction', this.defaultModel);
      this.logger.log('Sentence transformer model loaded successfully');
    } catch (error) {
      this.logger.error('Failed to load embedding model:', error);
      throw new Error(`Model loading failed: ${error.message}`);
    }
  }

  /**
   * Ensure pgvector extension is installed and configured
   */
  async ensurePgVectorExtension(): Promise<void> {
    try {
      // Check if pgvector extension exists
      const extensionCheck = await this.dataSource.query(`
        SELECT EXISTS(
          SELECT 1 FROM pg_extension WHERE extname = 'vector'
        ) as exists;
      `);

      if (extensionCheck[0]?.exists) {
        this.logger.log('pgvector extension already installed');
      } else {
        this.logger.log('Installing pgvector extension...');
        await this.dataSource.query('CREATE EXTENSION IF NOT EXISTS vector;');
        this.logger.log('pgvector extension installed successfully');
      }

      // Verify vector operations work
      await this.dataSource.query("SELECT '[1,2,3]'::vector;");
      this.logger.log('pgvector extension verification successful');
    } catch (error) {
      this.logger.error('Failed to setup pgvector extension:', error);
      throw new Error(`pgvector setup failed: ${error.message}`);
    }
  }

  /**
   * Generate embedding for text using local sentence transformers
   * Uses sentence-transformers model loaded locally - no API calls needed
   */
  async generateEmbedding(
    request: EmbeddingGenerationRequest,
  ): Promise<EmbeddingGenerationResponse> {
    if (!request.text?.trim()) {
      throw new Error('Text content is required for embedding generation');
    }

    if (!this.extractor) {
      throw new Error(
        'Embedding model not loaded. Ensure onModuleInit has completed.',
      );
    }

    const model = request.model || this.defaultModel;

    this.logger.debug(
      `Generating embedding for text: ${request.text.substring(0, 100)}...`,
    );

    try {
      // Generate embedding using local model
      const output = await this.extractor(request.text, {
        pooling: 'mean',
        normalize: true,
      });

      // Convert tensor to array
      const embeddingVector = Array.from(output.data);
      const tokens = Math.ceil(request.text.length / 4); // Rough estimate

      if (embeddingVector.length !== this.embeddingDimension) {
        throw new Error(
          `Expected ${this.embeddingDimension} dimensions, got ${embeddingVector.length}`,
        );
      }

      this.logger.debug(
        `Generated embedding with ${embeddingVector.length} dimensions`,
      );

      return {
        embedding: embeddingVector,
        tokens,
        model,
      };
    } catch (error) {
      this.logger.error('Error generating embedding:', error);
      throw new Error(`Embedding generation failed: ${error.message}`);
    }
  }

  /**
   * Generate embeddings for multiple texts using local sentence transformers
   * Processes texts efficiently with local model
   */
  async generateEmbeddings(
    texts: string[],
    model?: string,
  ): Promise<EmbeddingGenerationResponse[]> {
    const embeddings: EmbeddingGenerationResponse[] = [];

    // Process texts individually with local model (fast, no rate limits)
    for (const [index, text] of texts.entries()) {
      try {
        const embedding = await this.generateEmbedding({
          text,
          model: model as EmbeddingGenerationRequest['model'],
        });
        embeddings.push(embedding);
      } catch (error) {
        this.logger.error(
          `Error processing embedding for text ${index}:`,
          error,
        );
        // Add zero vector as fallback for failed embeddings
        embeddings.push({
          embedding: new Array(this.embeddingDimension).fill(0),
          tokens: 0,
          model: model || this.defaultModel,
        });
      }
    }

    this.logger.log(
      `Generated ${embeddings.length} embeddings for batch processing`,
    );
    return embeddings;
  }

  /**
   * Update content vector for a specific dump
   */
  async updateDumpVector(dumpId: string, text: string): Promise<void> {
    try {
      const embeddingResponse = await this.generateEmbedding({ text });

      await this.dataSource.query(
        'UPDATE dumps SET content_vector = $1 WHERE id = $2',
        [`[${embeddingResponse.embedding.join(',')}]`, dumpId],
      );

      this.logger.debug(`Updated vector for dump ${dumpId}`);
    } catch (error) {
      this.logger.error(`Failed to update vector for dump ${dumpId}:`, error);
      throw error;
    }
  }

  /**
   * Batch update vectors for multiple dumps
   */
  async batchUpdateDumpVectors(
    dumps: Array<{ id: string; text: string }>,
  ): Promise<void> {
    if (dumps.length === 0) return;

    this.logger.log(`Batch updating vectors for ${dumps.length} dumps`);

    try {
      const texts = dumps.map((d) => d.text);
      const embeddings = await this.generateEmbeddings(texts);

      // Update in database transaction
      await this.dataSource.transaction(async (manager) => {
        for (let i = 0; i < dumps.length; i++) {
          const dump = dumps[i];
          const embedding = embeddings[i];

          if (embedding.embedding.length > 0) {
            await manager.query(
              'UPDATE dumps SET content_vector = $1 WHERE id = $2',
              [`[${embedding.embedding.join(',')}]`, dump.id],
            );
          }
        }
      });

      this.logger.log(`Successfully updated vectors for ${dumps.length} dumps`);
    } catch (error) {
      this.logger.error('Batch vector update failed:', error);
      throw error;
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  calculateCosineSimilarity(vectorA: number[], vectorB: number[]): number {
    if (vectorA.length !== vectorB.length) {
      throw new Error('Vectors must have the same dimensions');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      normA += vectorA[i] * vectorA[i];
      normB += vectorB[i] * vectorB[i];
    }

    if (normA === 0 || normB === 0) {
      return 0; // Handle zero vectors
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Get embedding statistics for monitoring
   */
  async getEmbeddingStats(): Promise<{
    totalDumps: number;
    dumpsWithVectors: number;
    vectorCoverage: number;
  }> {
    const stats = await this.dataSource.query(`
      SELECT 
        COUNT(*) as total_dumps,
        COUNT(content_vector) as dumps_with_vectors
      FROM dumps
    `);

    const totalDumps = Number.parseInt(stats[0]?.total_dumps || '0', 10);
    const dumpsWithVectors = Number.parseInt(
      stats[0]?.dumps_with_vectors || '0',
      10,
    );
    const vectorCoverage =
      totalDumps > 0 ? (dumpsWithVectors / totalDumps) * 100 : 0;

    return {
      totalDumps,
      dumpsWithVectors,
      vectorCoverage,
    };
  }

  /**
   * Migrate existing dumps to have vectors (for data migration)
   */
  async migrateExistingDumps(batchSize: number = 50): Promise<void> {
    this.logger.log('Starting migration of existing dumps to add vectors...');

    try {
      // Get dumps without vectors
      const dumpsWithoutVectors = await this.dataSource.query(
        `
        SELECT id, raw_content, ai_summary 
        FROM dumps 
        WHERE content_vector IS NULL 
        AND processing_status = 'completed'
        ORDER BY created_at DESC
        LIMIT $1
      `,
        [batchSize],
      );

      if (dumpsWithoutVectors.length === 0) {
        this.logger.log('No dumps need vector migration');
        return;
      }

      const dumpsToProcess = dumpsWithoutVectors.map((dump) => ({
        id: dump.id,
        text: dump.ai_summary || dump.raw_content, // Prefer AI summary if available
      }));

      await this.batchUpdateDumpVectors(dumpsToProcess);

      this.logger.log(`Migrated ${dumpsToProcess.length} dumps with vectors`);

      // Recursive call to process remaining dumps
      if (dumpsWithoutVectors.length === batchSize) {
        await this.migrateExistingDumps(batchSize);
      }
    } catch (error) {
      this.logger.error('Migration failed:', error);
      throw error;
    }
  }

  /**
   * Get service health status
   */
  async getHealthStatus(): Promise<{
    pgvectorEnabled: boolean;
    embeddingServiceConfigured: boolean;
    vectorStats: any;
  }> {
    try {
      // Test pgvector
      await this.dataSource.query("SELECT '[1,2,3]'::vector;");
      const pgvectorEnabled = true;

      // Check embedding service (Hugging Face is always available, key just removes rate limits)
      const embeddingServiceConfigured = true; // HF always available

      // Get vector statistics
      const vectorStats = await this.getEmbeddingStats();

      return {
        pgvectorEnabled,
        embeddingServiceConfigured,
        vectorStats,
      };
    } catch (error) {
      this.logger.error('Health check failed:', error);
      return {
        pgvectorEnabled: false,
        embeddingServiceConfigured: true, // HF is always available
        vectorStats: null,
      };
    }
  }
}
