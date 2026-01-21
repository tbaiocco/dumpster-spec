import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Dump } from './dump.entity';

export enum ReminderType {
  FOLLOW_UP = 'follow_up',
  DEADLINE = 'deadline',
  RECURRING = 'recurring',
  LOCATION_BASED = 'location_based',
}

export enum ReminderStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DISMISSED = 'dismissed',
  SNOOZED = 'snoozed',
}

@Entity('reminders')
export class Reminder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'uuid', nullable: true })
  dump_id: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'text', nullable: true })
  message_details: string;

  @Column({
    type: 'enum',
    enum: ReminderType,
    default: ReminderType.FOLLOW_UP,
  })
  reminder_type: ReminderType;

  @Column({ type: 'timestamp' })
  scheduled_for: Date;

  @Column({
    type: 'enum',
    enum: ReminderStatus,
    default: ReminderStatus.PENDING,
  })
  status: ReminderStatus;

  @Column({ type: 'jsonb', nullable: true })
  location_data: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  recurrence_pattern: Record<string, any>;

  @Column({ type: 'integer', default: 1 })
  ai_confidence: number;

  @CreateDateColumn()
  created_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  sent_at: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.reminders)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Dump, (dump) => dump.reminders, { nullable: true })
  @JoinColumn({ name: 'dump_id' })
  dump: Dump;
}
