import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseInitService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseInitService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    await this.ensureVectorExtension();
    await this.ensureVectorIndex();
  }

  private async ensureVectorExtension() {
    try {
      // Enable pgvector extension if not already enabled
      await this.dataSource.query('CREATE EXTENSION IF NOT EXISTS vector');
      this.logger.log('✅ pgvector extension enabled');
    } catch (error) {
      this.logger.error('❌ Failed to enable pgvector extension:', error);
      throw error;
    }
  }

  async ensureVectorIndex() {
    try {
      // First, ensure the content_vector column has proper dimensions
      await this.ensureVectorColumnDimensions();

      // Check if the vector index exists
      const indexExists = await this.dataSource.query(`
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'dumps' 
        AND indexname = 'idx_dumps_content_vector'
      `);

      if (indexExists.length === 0) {
        // Check if there are any rows with non-null vectors before creating index
        const vectorCount = await this.dataSource.query(`
          SELECT COUNT(*) as count FROM "dumps" WHERE "content_vector" IS NOT NULL
        `);

        if (vectorCount[0].count > 0) {
          this.logger.log('Creating vector index for dumps table...');
          
          // Create the IVFFLAT index for vector similarity search
          await this.dataSource.query(`
            CREATE INDEX "idx_dumps_content_vector" ON "dumps" 
            USING ivfflat ("content_vector" vector_cosine_ops) 
            WITH (lists = 100)
          `);
          
          this.logger.log('✅ Vector index created successfully');
        } else {
          this.logger.warn('⚠️ No vector data found - skipping index creation. Index will be created after vectors are generated.');
        }
      } else {
        this.logger.log('✅ Vector index already exists');
      }
    } catch (error) {
      this.logger.error('❌ Failed to create vector index:', error);
      // Don't throw the error to prevent app startup failure
      this.logger.warn('⚠️ Continuing without vector index - it can be created later via admin endpoint');
    }
  }

  private async ensureVectorColumnDimensions() {
    try {
      // Check if the column exists and has proper dimensions
      const columnInfo = await this.dataSource.query(`
        SELECT column_name, data_type, udt_name 
        FROM information_schema.columns 
        WHERE table_name = 'dumps' 
        AND column_name = 'content_vector'
      `);

      if (columnInfo.length === 0) {
        this.logger.log('Adding content_vector column to dumps table...');
        await this.dataSource.query(`
          ALTER TABLE "dumps" 
          ADD COLUMN "content_vector" vector(384)
        `);
        this.logger.log('✅ Vector column added successfully');
      } else {
        // Ensure the column has proper dimensions (384)
        const hasProperType = await this.dataSource.query(`
          SELECT 1 FROM pg_attribute a
          JOIN pg_type t ON a.atttypid = t.oid
          JOIN pg_class c ON a.attrelid = c.oid
          WHERE c.relname = 'dumps' 
          AND a.attname = 'content_vector'
          AND t.typname = 'vector'
          AND a.atttypmod = 388
        `);

        if (hasProperType.length === 0) {
          this.logger.log('Updating vector column dimensions...');
          await this.dataSource.query(`
            ALTER TABLE "dumps" 
            ALTER COLUMN "content_vector" TYPE vector(384)
          `);
          this.logger.log('✅ Vector column dimensions updated');
        }
      }
    } catch (error) {
      this.logger.error('❌ Failed to ensure vector column dimensions:', error);
      throw error;
    }
  }

  async recreateVectorIndex() {
    try {
      this.logger.log('Recreating vector index...');
      
      // Ensure vector column dimensions first
      await this.ensureVectorColumnDimensions();
      
      // Drop existing index if it exists
      await this.dataSource.query('DROP INDEX IF EXISTS "idx_dumps_content_vector"');
      
      // Check if there are vectors to index
      const vectorCount = await this.dataSource.query(`
        SELECT COUNT(*) as count FROM "dumps" WHERE "content_vector" IS NOT NULL
      `);

      if (vectorCount[0].count > 0) {
        // Recreate the index
        await this.dataSource.query(`
          CREATE INDEX "idx_dumps_content_vector" ON "dumps" 
          USING ivfflat ("content_vector" vector_cosine_ops) 
          WITH (lists = 100)
        `);
        
        this.logger.log(`✅ Vector index recreated successfully for ${vectorCount[0].count} records`);
      } else {
        this.logger.warn('⚠️ No vector data found - index will be created after vectors are generated');
      }
    } catch (error) {
      this.logger.error('❌ Failed to recreate vector index:', error);
      throw error;
    }
  }

  async getIndexInfo() {
    try {
      const result = await this.dataSource.query(`
        SELECT 
          indexname,
          tablename,
          indexdef
        FROM pg_indexes 
        WHERE tablename = 'dumps' 
        AND indexname LIKE '%vector%'
      `);
      
      return result;
    } catch (error) {
      this.logger.error('❌ Failed to get index info:', error);
      throw error;
    }
  }

  async getVectorHealthStatus() {
    try {
      // Check total dumps
      const totalDumps = await this.dataSource.query('SELECT COUNT(*) as count FROM dumps');
      
      // Check dumps with vectors
      const vectorDumps = await this.dataSource.query('SELECT COUNT(*) as count FROM dumps WHERE content_vector IS NOT NULL');
      
      // Check vector index existence and size
      const vectorIndex = await this.dataSource.query(`
        SELECT 
          indexname, 
          pg_size_pretty(pg_relation_size(indexname::regclass)) as size,
          pg_relation_size(indexname::regclass) as size_bytes
        FROM pg_indexes 
        WHERE tablename = 'dumps' 
        AND indexname = 'idx_dumps_content_vector'
      `);

      // Check pgvector extension
      const pgvectorExt = await this.dataSource.query("SELECT extname, extversion FROM pg_extension WHERE extname = 'vector'");

      // Check vector column info
      const vectorColumn = await this.dataSource.query(`
        SELECT 
          column_name, 
          data_type, 
          udt_name,
          CASE 
            WHEN atttypmod = 388 THEN '384 dimensions'
            WHEN atttypmod > 0 THEN (atttypmod - 4) || ' dimensions'
            ELSE 'unspecified dimensions'
          END as dimensions
        FROM information_schema.columns c
        LEFT JOIN pg_attribute a ON a.attname = c.column_name
        LEFT JOIN pg_class cl ON a.attrelid = cl.oid
        WHERE c.table_name = 'dumps' 
        AND c.column_name = 'content_vector'
        AND cl.relname = 'dumps'
      `);

      const totalCount = Number.parseInt(totalDumps[0].count);
      const vectorCount = Number.parseInt(vectorDumps[0].count);
      const coverage = totalCount > 0 ? (vectorCount / totalCount) * 100 : 0;

      return {
        summary: {
          status: this.determineHealthStatus(totalCount, vectorCount, vectorIndex.length > 0),
          totalDumps: totalCount,
          dumpsWithVectors: vectorCount,
          vectorCoverage: Number.parseFloat(coverage.toFixed(2)),
          indexExists: vectorIndex.length > 0,
        },
        details: {
          pgvectorExtension: pgvectorExt.length > 0 ? {
            installed: true,
            version: pgvectorExt[0].extversion
          } : { installed: false },
          vectorColumn: vectorColumn.length > 0 ? {
            exists: true,
            dataType: vectorColumn[0].data_type,
            dimensions: vectorColumn[0].dimensions
          } : { exists: false },
          vectorIndex: vectorIndex.length > 0 ? {
            exists: true,
            name: vectorIndex[0].indexname,
            sizeHuman: vectorIndex[0].size,
            sizeBytes: vectorIndex[0].size_bytes
          } : { exists: false },
        },
        recommendations: this.generateRecommendations(totalCount, vectorCount, vectorIndex.length > 0)
      };
    } catch (error) {
      this.logger.error('❌ Failed to get vector health status:', error);
      throw error;
    }
  }

  private determineHealthStatus(totalDumps: number, vectorDumps: number, hasIndex: boolean): string {
    if (totalDumps === 0) return 'empty';
    if (!hasIndex && vectorDumps > 0) return 'needs_index';
    if (vectorDumps === 0) return 'no_vectors';
    const coverage = (vectorDumps / totalDumps) * 100;
    if (coverage >= 80 && hasIndex) return 'healthy';
    if (coverage >= 50 && hasIndex) return 'good';
    if (coverage < 50 && hasIndex) return 'poor_coverage';
    return 'degraded';
  }

  private generateRecommendations(totalDumps: number, vectorDumps: number, hasIndex: boolean): string[] {
    const recommendations: string[] = [];
    
    if (totalDumps === 0) {
      recommendations.push('Database is empty - create some dumps first');
    } else if (vectorDumps === 0) {
      recommendations.push('No vector embeddings found - vectors will be generated automatically when creating dumps');
    } else {
      const coverage = (vectorDumps / totalDumps) * 100;
      
      if (coverage < 50) {
        recommendations.push('Low vector coverage - some dumps may be missing embeddings');
      }
      
      if (!hasIndex && vectorDumps > 0) {
        recommendations.push('Vector index missing - use POST /admin/ensure-vector-index to create it');
      }
      
      if (hasIndex && coverage >= 80) {
        recommendations.push('Vector search is ready for optimal performance');
      }
    }
    
    return recommendations;
  }
}