import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Dump } from './dump.entity';

export enum TrackingStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export enum TrackingType {
  PACKAGE = 'package',
  APPLICATION = 'application',
  SUBSCRIPTION = 'subscription',
  WARRANTY = 'warranty',
  LOAN = 'loan',
  INSURANCE = 'insurance',
  OTHER = 'other',
}

export interface TrackingCheckpoint {
  timestamp: Date;
  status: string;
  location?: string;
  notes?: string;
  source?: string;
}

@Entity('trackable_items')
@Index(['user_id', 'status'])
@Index(['user_id', 'type'])
export class TrackableItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  @Index()
  user_id: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'dump_id', nullable: true })
  dump_id?: string;

  @ManyToOne(() => Dump, { nullable: true })
  @JoinColumn({ name: 'dump_id' })
  dump?: Dump;

  @Column({
    type: 'enum',
    enum: TrackingType,
    default: TrackingType.OTHER,
  })
  type: TrackingType;

  @Column({ type: 'varchar', length: 500 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: TrackingStatus,
    default: TrackingStatus.PENDING,
  })
  @Index()
  status: TrackingStatus;

  @Column({ name: 'start_date', type: 'timestamp' })
  start_date: Date;

  @Column({ name: 'expected_end_date', type: 'timestamp', nullable: true })
  expected_end_date?: Date;

  @Column({ name: 'actual_end_date', type: 'timestamp', nullable: true })
  actual_end_date?: Date;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @Column({ type: 'jsonb', default: [] })
  checkpoints: TrackingCheckpoint[];

  @Column({ type: 'simple-array', default: '' })
  reminder_ids: string[];

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
