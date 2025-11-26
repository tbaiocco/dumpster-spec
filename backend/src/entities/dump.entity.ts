import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Category } from './category.entity';
import { Reminder } from './reminder.entity';

export enum ContentType {
  TEXT = 'text',
  VOICE = 'voice',
  IMAGE = 'image',
  EMAIL = 'email',
}

export enum ProcessingStatus {
  RECEIVED = 'received',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface ExtractedEntitiesData {
  // Entity extraction data from EntityExtractionService
  entities?: {
    dates: string[];
    times: string[];
    locations: string[];
    people: string[];
    organizations: string[];
    amounts: string[];
    contacts: {
      phones: string[];
      emails: string[];
      urls: string[];
    };
  };
  entityDetails?: Array<{
    type: string;
    value: string;
    confidence: number;
    context: string;
    position?: { start: number; end: number };
  }>;
  entitySummary?: {
    totalEntities: number;
    entitiesByType: Record<string, number>;
    averageConfidence: number;
  };
  // AI analysis data from Claude
  actionItems?: string[];
  sentiment?: string;
  urgency?: string;
  // Categorization data from CategorizationService
  categoryConfidence?: number;
  categoryReasoning?: string;
  alternativeCategories?: string[];
  autoApplied?: boolean;
  // Metadata
  metadata?: Record<string, any>;
}

@Entity('dumps')
export class Dump {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'text' })
  raw_content: string;

  @Column({
    type: 'enum',
    enum: ContentType,
  })
  content_type: ContentType;

  @Column({ type: 'varchar', length: 500, nullable: true })
  media_url: string;

  @Column({ type: 'text', nullable: true })
  ai_summary: string;

  @Column({ type: 'integer', nullable: true })
  ai_confidence: number;

  @Column({ type: 'uuid', nullable: true })
  category_id: string;

  @Column({ type: 'integer', nullable: true })
  urgency_level: number;

  @Column({
    type: 'enum',
    enum: ProcessingStatus,
    default: ProcessingStatus.RECEIVED,
  })
  processing_status: ProcessingStatus;

  @Column({ type: 'jsonb', default: '{}' })
  extracted_entities: ExtractedEntitiesData;

  @Column({ type: 'vector', nullable: true })
  content_vector: number[];

  @CreateDateColumn()
  created_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  processed_at: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.dumps)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Category, (category) => category.dumps)
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @OneToMany(() => Reminder, (reminder) => reminder.dump)
  reminders: Reminder[];
}
