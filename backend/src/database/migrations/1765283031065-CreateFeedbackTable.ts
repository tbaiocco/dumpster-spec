import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFeedbackTable1765283031065 implements MigrationInterface {
  name = 'CreateFeedbackTable1765283031065';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."feedback_type_enum" AS ENUM('bug_report', 'feature_request', 'ai_error', 'categorization_error', 'summary_error', 'entity_error', 'urgency_error', 'general_feedback', 'content_quality', 'performance_issue')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."feedback_priority_enum" AS ENUM('low', 'medium', 'high', 'critical')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."feedback_status_enum" AS ENUM('new', 'acknowledged', 'in_progress', 'resolved', 'closed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "feedback" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "type" "public"."feedback_type_enum" NOT NULL, "title" character varying(255) NOT NULL, "description" text NOT NULL, "priority" "public"."feedback_priority_enum" NOT NULL DEFAULT 'medium', "status" "public"."feedback_status_enum" NOT NULL DEFAULT 'new', "dump_id" uuid, "user_agent" character varying, "url" character varying, "reproduction_steps" jsonb, "expected_behavior" text, "actual_behavior" text, "additional_context" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "resolved_at" TIMESTAMP, "resolved_by" uuid, "resolution" text, "internal_notes" jsonb NOT NULL DEFAULT '[]', "upvotes" integer NOT NULL DEFAULT '0', "tags" jsonb NOT NULL DEFAULT '[]', CONSTRAINT "PK_8389f9e087a57689cd5be8b2b13" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "digest_time" SET DEFAULT '09:00'`,
    );
    await queryRunner.query(
      `ALTER TABLE "feedback" ADD CONSTRAINT "FK_121c67d42dd543cca0809f59901" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "feedback" ADD CONSTRAINT "FK_dbbd980d6121bad602ac9468f51" FOREIGN KEY ("dump_id") REFERENCES "dumps"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "feedback" ADD CONSTRAINT "FK_f03c707ffbeab766b829a374381" FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "feedback" DROP CONSTRAINT "FK_f03c707ffbeab766b829a374381"`,
    );
    await queryRunner.query(
      `ALTER TABLE "feedback" DROP CONSTRAINT "FK_dbbd980d6121bad602ac9468f51"`,
    );
    await queryRunner.query(
      `ALTER TABLE "feedback" DROP CONSTRAINT "FK_121c67d42dd543cca0809f59901"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "digest_time" SET DEFAULT '09:00:00'`,
    );
    await queryRunner.query(`DROP TABLE "feedback"`);
    await queryRunner.query(`DROP TYPE "public"."feedback_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."feedback_priority_enum"`);
    await queryRunner.query(`DROP TYPE "public"."feedback_type_enum"`);
  }
}
