import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetricsService } from './metrics.service';
import { SearchMetric } from '../../entities/search-metric.entity';
import { AIMetric } from '../../entities/ai-metric.entity';
import { FeatureUsage } from '../../entities/feature-usage.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SearchMetric, AIMetric, FeatureUsage])],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}
