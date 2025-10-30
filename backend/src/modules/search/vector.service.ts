import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export interface EmbeddingGenerationRequest {
  text: string;
  model?: 'text-embedding-3-small' | 'text-embedding-3-large';
}

export interface EmbeddingGenerationResponse {
  embedding: number[];
  tokens: number;
  model: string;
}

@Injectable()
export class VectorService implements OnModuleInit {
  private readonly logger = new Logger(VectorService.name);
  private readonly openaiApiKey: string;
  private readonly defaultModel = 'text-embedding-3-small';
  private readonly embeddingDimension = 1536; // OpenAI text-embedding-3-small dimensions

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {
    this.openaiApiKey = this.configService.get<string>('OPENAI_API_KEY') || '';
    
    if (!this.openaiApiKey) {
      this.logger.warn('OpenAI API key not configured - vector search will not work');
    }
  }

  async onModuleInit() {
    await this.ensurePgVectorExtension();
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

      if (!extensionCheck[0]?.exists) {
        this.logger.log('Installing pgvector extension...');
        await this.dataSource.query('CREATE EXTENSION IF NOT EXISTS vector;');
        this.logger.log('pgvector extension installed successfully');
      } else {
        this.logger.log('pgvector extension already installed');
      }

      // Verify vector operations work
      await this.dataSource.query('SELECT \'[1,2,3]\'::vector;');
      this.logger.log('pgvector extension verification successful');

    } catch (error) {
      this.logger.error('Failed to setup pgvector extension:', error);
      throw new Error(`pgvector setup failed: ${error.message}`);
    }
  }

  /**
   * Generate embedding for text using OpenAI API
   */
  async generateEmbedding(request: EmbeddingGenerationRequest): Promise<EmbeddingGenerationResponse> {
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key not configured for embedding generation');
    }

    const model = request.model || this.defaultModel;

    this.logger.debug(`Generating embedding for text: ${request.text.substring(0, 100)}...`);

    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: request.text,
          model: model,
          encoding_format: 'float',
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${response.status} ${error}`);
      }

      const data = await response.json();
      
      if (!data.data || data.data.length === 0) {
        throw new Error('No embedding data returned from OpenAI API');
      }

      const embedding = data.data[0].embedding;
      const tokens = data.usage?.total_tokens || 0;

      this.logger.debug(`Generated embedding with ${embedding.length} dimensions, ${tokens} tokens used`);

      return {
        embedding,
        tokens,
        model,
      };
    } catch (error) {
      this.logger.error('Error generating embedding:', error);
      throw new Error(`Embedding generation failed: ${error.message}`);
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateEmbeddings(texts: string[], model?: string): Promise<EmbeddingGenerationResponse[]> {
    const embeddings: EmbeddingGenerationResponse[] = [];
    
    // Process in batches to avoid API limits
    const batchSize = 100; // OpenAI allows up to 2048 inputs per request
    
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      
      try {
        const response = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: batch,
            model: model || this.defaultModel,
            encoding_format: 'float',
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`OpenAI API error: ${response.status} ${error}`);
        }

        const data = await response.json();
        
        for (let j = 0; j < data.data.length; j++) {
          embeddings.push({
            embedding: data.data[j].embedding,
            tokens: Math.floor(data.usage.total_tokens / batch.length), // Approximate per text
            model: model || this.defaultModel,
          });
        }
        
      } catch (error) {
        this.logger.error(`Error processing embedding batch ${i}-${i + batch.length}:`, error);
        // Continue with other batches, add null entries for failed ones
        for (let k = 0; k < batch.length; k++) {
          embeddings.push({
            embedding: new Array(this.embeddingDimension).fill(0), // Zero vector as fallback
            tokens: 0,
            model: model || this.defaultModel,
          });
        }
      }
    }

    this.logger.log(`Generated ${embeddings.length} embeddings for batch processing`);
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
        [`[${embeddingResponse.embedding.join(',')}]`, dumpId]
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
  async batchUpdateDumpVectors(dumps: Array<{ id: string; text: string }>): Promise<void> {
    if (dumps.length === 0) return;

    this.logger.log(`Batch updating vectors for ${dumps.length} dumps`);

    try {
      const texts = dumps.map(d => d.text);
      const embeddings = await this.generateEmbeddings(texts);

      // Update in database transaction
      await this.dataSource.transaction(async (manager) => {
        for (let i = 0; i < dumps.length; i++) {
          const dump = dumps[i];
          const embedding = embeddings[i];
          
          if (embedding.embedding.length > 0) {
            await manager.query(
              'UPDATE dumps SET content_vector = $1 WHERE id = $2',
              [`[${embedding.embedding.join(',')}]`, dump.id]
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

    const totalDumps = parseInt(stats[0]?.total_dumps || '0');
    const dumpsWithVectors = parseInt(stats[0]?.dumps_with_vectors || '0');
    const vectorCoverage = totalDumps > 0 ? (dumpsWithVectors / totalDumps) * 100 : 0;

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
      const dumpsWithoutVectors = await this.dataSource.query(`
        SELECT id, raw_content, ai_summary 
        FROM dumps 
        WHERE content_vector IS NULL 
        AND processing_status = 'completed'
        ORDER BY created_at DESC
        LIMIT $1
      `, [batchSize]);

      if (dumpsWithoutVectors.length === 0) {
        this.logger.log('No dumps need vector migration');
        return;
      }

      const dumpsToProcess = dumpsWithoutVectors.map(dump => ({
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
    openaiConfigured: boolean;
    vectorStats: any;
  }> {
    try {
      // Test pgvector
      await this.dataSource.query('SELECT \'[1,2,3]\'::vector;');
      const pgvectorEnabled = true;

      // Check OpenAI configuration
      const openaiConfigured = !!this.openaiApiKey;

      // Get vector statistics
      const vectorStats = await this.getEmbeddingStats();

      return {
        pgvectorEnabled,
        openaiConfigured,
        vectorStats,
      };
    } catch (error) {
      this.logger.error('Health check failed:', error);
      return {
        pgvectorEnabled: false,
        openaiConfigured: !!this.openaiApiKey,
        vectorStats: null,
      };
    }
  }
}