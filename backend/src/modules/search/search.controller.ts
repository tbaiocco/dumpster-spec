import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  HttpStatus,
  HttpCode,
  ValidationPipe,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../../entities/user.entity';
import { SearchService, SearchRequest, SearchResponse } from './search.service';
import { VectorService } from './vector.service';
import {
  IsString,
  IsOptional,
  IsArray,
  IsDateString,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import type { ApiResponse } from '../../common/interfaces/api-response.interface';

export class SearchQueryDto {
  @IsString()
  query: string;

  @IsString()
  userId: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contentTypes?: ('text' | 'voice' | 'image' | 'email')[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  minConfidence?: number;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Type(() => Number)
  urgencyLevels?: number[];

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  includeProcessing?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  offset?: number;
}

export class QuickSearchDto {
  @IsString()
  q: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  @Type(() => Number)
  limit?: number;
}

@Controller('api/search')
// @UseGuards(JwtAuthGuard) // Temporarily disabled for testing
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly vectorService: VectorService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async search(
    @Body(ValidationPipe) searchDto: SearchQueryDto,
  ): Promise<ApiResponse<SearchResponse>> {
    const request: SearchRequest = {
      query: searchDto.query,
      userId: searchDto.userId,
      filters: {
        contentTypes: searchDto.contentTypes,
        categories: searchDto.categories,
        dateFrom: searchDto.dateFrom ? new Date(searchDto.dateFrom) : undefined,
        dateTo: searchDto.dateTo ? new Date(searchDto.dateTo) : undefined,
        minConfidence: searchDto.minConfidence,
        urgencyLevels: searchDto.urgencyLevels,
        includeProcessing: searchDto.includeProcessing,
      },
      limit: searchDto.limit || 20,
      offset: searchDto.offset || 0,
    };

    const results = await this.searchService.search(request);

    return {
      success: true,
      data: results,
      message: `Found ${results.total} results for "${searchDto.query}"`,
    };
  }

  @Get('quick')
  async quickSearch(
    @Query(ValidationPipe) quickSearchDto: QuickSearchDto,
    @GetUser() user: User,
  ): Promise<ApiResponse<any[]>> {
    const results = await this.searchService.quickSearch(
      quickSearchDto.q,
      user.id,
      quickSearchDto.limit || 5,
    );

    return {
      success: true,
      data: results,
      message: `Quick search results for "${quickSearchDto.q}"`,
    };
  }

  @Get('suggestions')
  async getSearchSuggestions(
    @GetUser() user: User,
    @Query('limit') limit?: number,
  ): Promise<ApiResponse<string[]>> {
    const suggestions = await this.searchService.getSearchSuggestions(
      user.id,
      limit ? Number(limit) : 10,
    );

    return {
      success: true,
      data: suggestions,
      message: 'Search suggestions retrieved successfully',
    };
  }

  @Get('analytics')
  async getSearchAnalytics(@GetUser() user: User): Promise<ApiResponse<any>> {
    const analytics = await this.searchService.getSearchAnalytics(user.id);

    return {
      success: true,
      data: analytics,
      message: 'Search analytics retrieved successfully',
    };
  }

  @Post('reindex')
  @HttpCode(HttpStatus.OK)
  async reindexUserContent(@GetUser() user: User): Promise<ApiResponse<any>> {
    // This would typically be an admin-only operation
    // but for MVP, users can trigger their own reindexing

    try {
      // Get user's dumps that need vector indexing
      const stats = await this.vectorService.getEmbeddingStats();

      // Trigger migration for existing dumps without vectors
      await this.vectorService.migrateExistingDumps(50);

      const updatedStats = await this.vectorService.getEmbeddingStats();

      return {
        success: true,
        data: {
          before: stats,
          after: updatedStats,
          processed: updatedStats.dumpsWithVectors - stats.dumpsWithVectors,
        },
        message: 'Content reindexing completed successfully',
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        message: `Reindexing failed: ${error.message}`,
      };
    }
  }

  @Get('health')
  async getSearchHealth(): Promise<ApiResponse<any>> {
    const health = await this.vectorService.getHealthStatus();

    return {
      success: true,
      data: health,
      message: 'Search service health status',
    };
  }

  @Get('categories/:categoryId')
  async searchByCategory(
    @Param('categoryId') categoryId: string,
    @GetUser() user: User,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<ApiResponse<any[]>> {
    const request: SearchRequest = {
      query: '', // Empty query for category browsing
      userId: user.id,
      filters: {
        categories: [categoryId],
      },
      limit: limit ? Number(limit) : 20,
      offset: offset ? Number(offset) : 0,
    };

    const results = await this.searchService.search(request);

    return {
      success: true,
      data: results.results,
      message: `Found ${results.total} items in category`,
    };
  }

  @Get('content-types/:contentType')
  async searchByContentType(
    @Param('contentType') contentType: 'text' | 'voice' | 'image' | 'email',
    @GetUser() user: User,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<ApiResponse<any[]>> {
    const request: SearchRequest = {
      query: '', // Empty query for content type browsing
      userId: user.id,
      filters: {
        contentTypes: [contentType],
      },
      limit: limit ? Number(limit) : 20,
      offset: offset ? Number(offset) : 0,
    };

    const results = await this.searchService.search(request);

    return {
      success: true,
      data: results.results,
      message: `Found ${results.total} ${contentType} items`,
    };
  }

  @Post('feedback')
  @HttpCode(HttpStatus.OK)
  async submitSearchFeedback(
    @Body()
    feedback: {
      query: string;
      resultId?: string;
      rating: 1 | 2 | 3 | 4 | 5;
      comment?: string;
    },
    @GetUser() user: User,
  ): Promise<ApiResponse<any>> {
    // Log search feedback for improving search quality
    // This would typically go to a search_feedback table

    return {
      success: true,
      data: { received: true },
      message: 'Search feedback submitted successfully',
    };
  }
}
