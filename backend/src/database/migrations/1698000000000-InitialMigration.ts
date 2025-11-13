import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialMigration1698000000000 implements MigrationInterface {
  name = 'InitialMigration1698000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable pgvector extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector`);

    // Create enums
    await queryRunner.query(`
      CREATE TYPE "public"."content_type_enum" AS ENUM('text', 'voice', 'image', 'email')
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."processing_status_enum" AS ENUM('received', 'processing', 'completed', 'failed')
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."reminder_type_enum" AS ENUM('follow_up', 'deadline', 'recurring', 'location_based')
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."reminder_status_enum" AS ENUM('pending', 'sent', 'dismissed', 'snoozed')
    `);

    // Create users table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "phone_number" character varying(20) NOT NULL,
        "verified_at" TIMESTAMP,
        "chat_id_telegram" character varying(50),
        "chat_id_whatsapp" character varying(50),
        "timezone" character varying(50) NOT NULL DEFAULT 'UTC',
        "language" character varying(10) NOT NULL DEFAULT 'en',
        "digest_time" TIME NOT NULL DEFAULT '09:00',
        "notification_preferences" jsonb NOT NULL DEFAULT '{}',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_phone_number" UNIQUE ("phone_number"),
        CONSTRAINT "UQ_users_chat_id_telegram" UNIQUE ("chat_id_telegram"),
        CONSTRAINT "UQ_users_chat_id_whatsapp" UNIQUE ("chat_id_whatsapp"),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )
    `);

    // Create categories table
    await queryRunner.query(`
      CREATE TABLE "categories" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(100) NOT NULL,
        "description" text,
        "color" character varying(20),
        "icon" character varying(50),
        "is_active" boolean NOT NULL DEFAULT true,
        "sort_order" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_categories_name" UNIQUE ("name"),
        CONSTRAINT "PK_categories" PRIMARY KEY ("id")
      )
    `);

    // Create dumps table
    await queryRunner.query(`
      CREATE TABLE "dumps" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "raw_content" text NOT NULL,
        "content_type" "public"."content_type_enum" NOT NULL,
        "media_url" character varying(500),
        "ai_summary" text,
        "ai_confidence" integer,
        "category_id" uuid,
        "urgency_level" integer,
        "processing_status" "public"."processing_status_enum" NOT NULL DEFAULT 'received',
        "extracted_entities" jsonb NOT NULL DEFAULT '{}',
        "content_vector" vector(384),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "processed_at" TIMESTAMP,
        CONSTRAINT "CHK_dumps_ai_confidence" CHECK (ai_confidence >= 1 AND ai_confidence <= 5),
        CONSTRAINT "CHK_dumps_urgency_level" CHECK (urgency_level >= 1 AND urgency_level <= 5),
        CONSTRAINT "PK_dumps" PRIMARY KEY ("id")
      )
    `);

    // Create reminders table
    await queryRunner.query(`
      CREATE TABLE "reminders" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "dump_id" uuid,
        "message" text NOT NULL,
        "reminder_type" "public"."reminder_type_enum" NOT NULL DEFAULT 'follow_up',
        "scheduled_for" TIMESTAMP NOT NULL,
        "status" "public"."reminder_status_enum" NOT NULL DEFAULT 'pending',
        "location_data" jsonb,
        "recurrence_pattern" jsonb,
        "ai_confidence" integer NOT NULL DEFAULT 1,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "sent_at" TIMESTAMP,
        CONSTRAINT "CHK_reminders_ai_confidence" CHECK (ai_confidence >= 1 AND ai_confidence <= 5),
        CONSTRAINT "PK_reminders" PRIMARY KEY ("id")
      )
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "dumps" ADD CONSTRAINT "FK_dumps_user_id" 
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "dumps" ADD CONSTRAINT "FK_dumps_category_id" 
      FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "reminders" ADD CONSTRAINT "FK_reminders_user_id" 
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "reminders" ADD CONSTRAINT "FK_reminders_dump_id" 
      FOREIGN KEY ("dump_id") REFERENCES "dumps"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // Create indexes
    await queryRunner.query(
      `CREATE INDEX "idx_users_phone" ON "users" ("phone_number")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_users_telegram" ON "users" ("chat_id_telegram")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_users_whatsapp" ON "users" ("chat_id_whatsapp")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_dumps_user_created" ON "dumps" ("user_id", "created_at" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_dumps_status" ON "dumps" ("processing_status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_dumps_category" ON "dumps" ("category_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_dumps_content_vector" ON "dumps" USING ivfflat ("content_vector" vector_cosine_ops)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX "public"."idx_dumps_content_vector"`);
    await queryRunner.query(`DROP INDEX "public"."idx_dumps_category"`);
    await queryRunner.query(`DROP INDEX "public"."idx_dumps_status"`);
    await queryRunner.query(`DROP INDEX "public"."idx_dumps_user_created"`);
    await queryRunner.query(`DROP INDEX "public"."idx_users_whatsapp"`);
    await queryRunner.query(`DROP INDEX "public"."idx_users_telegram"`);
    await queryRunner.query(`DROP INDEX "public"."idx_users_phone"`);

    // Drop foreign key constraints
    await queryRunner.query(
      `ALTER TABLE "reminders" DROP CONSTRAINT "FK_reminders_dump_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reminders" DROP CONSTRAINT "FK_reminders_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dumps" DROP CONSTRAINT "FK_dumps_category_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dumps" DROP CONSTRAINT "FK_dumps_user_id"`,
    );

    // Drop tables
    await queryRunner.query(`DROP TABLE "reminders"`);
    await queryRunner.query(`DROP TABLE "dumps"`);
    await queryRunner.query(`DROP TABLE "categories"`);
    await queryRunner.query(`DROP TABLE "users"`);

    // Drop enums
    await queryRunner.query(`DROP TYPE "public"."reminder_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."reminder_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."processing_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."content_type_enum"`);
  }
}
