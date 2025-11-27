import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

// Entities
import { Dump } from '../../entities/dump.entity';
import { Category } from '../../entities/category.entity';
import { User } from '../../entities/user.entity';

// Search Services
import { SearchService } from './search.service';
import { VectorService } from './vector.service';
import { QueryEnhancementService } from './query-enhancement.service';
import { SemanticSearchService } from './semantic-search.service';
import { RankingService } from './ranking.service';
import { FuzzyMatchService } from './fuzzy-match.service';
import { FiltersService } from './filters.service';

// Search Controller
import { SearchController } from './search.controller';

// AI Services (dependencies)
import { ClaudeService } from '../ai/claude.service';

@Module({
  imports: [TypeOrmModule.forFeature([Dump, Category, User]), ConfigModule],
  controllers: [SearchController],
  providers: [
    // Core search services
    SearchService,
    VectorService,
    QueryEnhancementService,
    SemanticSearchService,
    RankingService,
    FuzzyMatchService,
    FiltersService,

    // AI dependencies
    ClaudeService,
  ],
  exports: [
    SearchService,
    VectorService,
    SemanticSearchService,
    QueryEnhancementService,
  ],
})
export class SearchModule {}
