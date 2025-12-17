import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Dump } from './dump.entity';

export enum FeedbackType {
  BUG_REPORT = 'bug_report',
  FEATURE_REQUEST = 'feature_request',
  AI_ERROR = 'ai_error',
  CATEGORIZATION_ERROR = 'categorization_error',
  SUMMARY_ERROR = 'summary_error',
  ENTITY_ERROR = 'entity_error',
  URGENCY_ERROR = 'urgency_error',
  GENERAL_FEEDBACK = 'general_feedback',
  CONTENT_QUALITY = 'content_quality',
  PERFORMANCE_ISSUE = 'performance_issue',
}

export enum FeedbackPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum FeedbackStatus {
  NEW = 'new',
  ACKNOWLEDGED = 'acknowledged',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

@Entity('feedback')
export class Feedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({
    type: 'enum',
    enum: FeedbackType,
  })
  type: FeedbackType;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: FeedbackPriority,
    default: FeedbackPriority.MEDIUM,
  })
  priority: FeedbackPriority;

  @Column({
    type: 'enum',
    enum: FeedbackStatus,
    default: FeedbackStatus.NEW,
  })
  status: FeedbackStatus;

  @Column({ type: 'uuid', nullable: true })
  dump_id: string;

  @Column({ type: 'varchar', nullable: true })
  user_agent: string;

  @Column({ type: 'varchar', nullable: true })
  url: string;

  @Column({ type: 'jsonb', nullable: true })
  reproduction_steps: string[];

  @Column({ type: 'text', nullable: true })
  expected_behavior: string;

  @Column({ type: 'text', nullable: true })
  actual_behavior: string;

  @Column({ type: 'jsonb', nullable: true })
  additional_context: Record<string, any>;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  resolved_at: Date;

  @Column({ type: 'uuid', nullable: true })
  resolved_by: string;

  @Column({ type: 'text', nullable: true })
  resolution: string;

  @Column({ type: 'jsonb', default: [] })
  internal_notes: string[];

  @Column({ type: 'integer', default: 0 })
  upvotes: number;

  @Column({ type: 'jsonb', default: [] })
  tags: string[];

  // Relations
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Dump, { nullable: true })
  @JoinColumn({ name: 'dump_id' })
  dump: Dump;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'resolved_by' })
  resolver: User;
}
