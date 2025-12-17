import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum FeatureType {
  BOT_COMMAND = 'bot_command',
  EMAIL_PROCESSED = 'email_processed',
  REMINDER_SENT = 'reminder_sent',
  DUMP_CREATED = 'dump_created',
  SEARCH_PERFORMED = 'search_performed',
  TRACKING_CREATED = 'tracking_created',
  CALENDAR_SYNCED = 'calendar_synced',
}

/**
 * FeatureUsage Entity
 * Tracks feature usage across the platform for analytics
 */
@Entity('feature_usage')
@Index(['timestamp'])
@Index(['user_id'])
@Index(['feature_type'])
export class FeatureUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  timestamp: Date;

  @Column({
    type: 'enum',
    enum: FeatureType,
  })
  feature_type: FeatureType;

  @Column({ type: 'varchar', length: 200, nullable: true })
  detail: string | null; // Specific command, email type, etc.

  @Column({ type: 'uuid', nullable: true })
  user_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  dump_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  reminder_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  trackable_item_id: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
