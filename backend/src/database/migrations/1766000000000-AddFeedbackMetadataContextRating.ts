import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFeedbackMetadataContextRating1766000000000 implements MigrationInterface {
  name = 'AddFeedbackMetadataContextRating1766000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "feedback" ADD COLUMN "metadata" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "feedback" ADD COLUMN "context" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "feedback" ADD COLUMN "rating" integer`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "feedback" DROP COLUMN "rating"`);
    await queryRunner.query(`ALTER TABLE "feedback" DROP COLUMN "context"`);
    await queryRunner.query(`ALTER TABLE "feedback" DROP COLUMN "metadata"`);
  }
}
