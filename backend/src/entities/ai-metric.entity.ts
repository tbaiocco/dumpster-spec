import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum AIOperationType {
  CATEGORIZATION = 'categorization',
  EXTRACTION = 'extraction',
  REMINDER = 'reminder',
  TRACKING = 'tracking',
  CONTENT_ANALYSIS = 'content_analysis',
  VISION = 'vision',
  SPEECH = 'speech',
}

/**
 * AIMetric Entity
 * Tracks all AI operations for performance monitoring and analytics
 */
@Entity('ai_metrics')
@Index(['timestamp'])
@Index(['user_id'])
@Index(['dump_id'])
@Index(['operation_type'])
export class AIMetric {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  timestamp: Date;

  @Column({
    type: 'enum',
    enum: AIOperationType,
  })
  operation_type: AIOperationType;

  @Column({ type: 'integer' })
  latency_ms: number;

  @Column({ type: 'boolean' })
  success: boolean;

  @Column({ type: 'uuid', nullable: true })
  user_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  dump_id: string | null;

  @Column({ type: 'integer', nullable: true })
  confidence_score: number | null; // 0-100

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    model?: string;
    error?: string;
    tokensUsed?: number;
    categoryAssigned?: string;
  } | null;
}
