import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * SearchMetric Entity
 * Tracks all search operations for performance monitoring and analytics
 */
@Entity('search_metrics')
@Index(['timestamp']) // Fast time-based queries
@Index(['user_id']) // Fast user-specific queries
export class SearchMetric {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  timestamp: Date;

  @Column({ type: 'varchar', length: 500 })
  query_text: string;

  @Column({ type: 'integer' })
  query_length: number;

  @Column({ type: 'integer' })
  results_count: number;

  @Column({ type: 'integer' })
  latency_ms: number;

  @Column({ type: 'varchar', length: 50 })
  search_type: 'vector' | 'fuzzy' | 'exact' | 'hybrid';

  @Column({ type: 'uuid', nullable: true })
  user_id: string | null;

  @Column({ type: 'boolean', default: true })
  success: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    filters?: Record<string, any>;
    error?: string;
  } | null;
}
