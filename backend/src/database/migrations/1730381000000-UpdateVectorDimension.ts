import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateVectorDimension1730381000000 implements MigrationInterface {
  name = 'UpdateVectorDimension1730381000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the existing index first
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_dumps_content_vector"`);
    
    // Update vector column from 1536 to 384 dimensions to match local embeddings
    await queryRunner.query(`
      ALTER TABLE "dumps" 
      ALTER COLUMN "content_vector" TYPE vector(384)
    `);
    
    // Recreate the index with new vector dimension
    await queryRunner.query(`
      CREATE INDEX "idx_dumps_content_vector" ON "dumps" 
      USING ivfflat ("content_vector" vector_cosine_ops) 
      WITH (lists = 100)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the current index
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_dumps_content_vector"`);
    
    // Revert vector column back to 1536 dimensions
    await queryRunner.query(`
      ALTER TABLE "dumps" 
      ALTER COLUMN "content_vector" TYPE vector(1536)
    `);
    
    // Recreate the original index
    await queryRunner.query(`
      CREATE INDEX "idx_dumps_content_vector" ON "dumps" 
      USING ivfflat ("content_vector" vector_cosine_ops) 
      WITH (lists = 100)
    `);
  }
}