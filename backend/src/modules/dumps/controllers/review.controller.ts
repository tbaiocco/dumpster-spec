import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ReviewService, ReviewFlag, ReviewPriority, ReviewRequest } from '../services/review.service';

export class FlagReviewDto {
  dumpId: string;
  flag: ReviewFlag;
  priority?: ReviewPriority;
  description?: string;
  suggestedCategory?: string;
  suggestedSummary?: string;
}

export class ResolveReviewDto {
  resolution: string;
}

@Controller('reviews')
export class ReviewController {
  private readonly logger = new Logger(ReviewController.name);

  constructor(private readonly reviewService: ReviewService) {}

  @Post('flag')
  async flagForReview(
    @Body() flagReviewDto: FlagReviewDto,
    @Query('userId') userId?: string,
  ): Promise<{ reviewId: string; message: string }> {
    try {
      if (!userId) {
        throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
      }

      this.logger.log(`Flagging dump ${flagReviewDto.dumpId} for review by user ${userId}`);

      const reviewRequest: ReviewRequest = {
        ...flagReviewDto,
        userId,
        reportedBy: 'user',
      };

      const reviewId = await this.reviewService.flagForReview(reviewRequest);

      return {
        reviewId,
        message: 'Dump flagged for review successfully',
      };

    } catch (error) {
      this.logger.error('Error flagging dump for review:', error);
      
      if (error.message === 'Dump not found or access denied') {
        throw new HttpException(
          'Dump not found or access denied',
          HttpStatus.NOT_FOUND,
        );
      }
      
      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('user/:userId')
  async getUserReviews(@Param('userId') userId: string) {
    try {
      this.logger.log(`Getting reviews for user ${userId}`);
      
      const reviews = await this.reviewService.getUserReviews(userId);
      
      return {
        reviews,
        total: reviews.length,
      };

    } catch (error) {
      this.logger.error('Error getting user reviews:', error);
      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('pending')
  async getPendingReviews(
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0',
  ) {
    try {
      this.logger.log('Getting pending reviews');
      
      const reviews = await this.reviewService.getPendingReviews();
      const limitNum = Number.parseInt(limit, 10);
      const offsetNum = Number.parseInt(offset, 10);
      
      const paginatedReviews = reviews.slice(offsetNum, offsetNum + limitNum);
      
      return {
        reviews: paginatedReviews,
        total: reviews.length,
        limit: limitNum,
        offset: offsetNum,
      };

    } catch (error) {
      this.logger.error('Error getting pending reviews:', error);
      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':reviewId/resolve')
  async resolveReview(
    @Param('reviewId') reviewId: string,
    @Body() resolveReviewDto: ResolveReviewDto,
    @Query('userId') userId?: string,
  ): Promise<{ message: string }> {
    try {
      if (!userId) {
        throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
      }

      this.logger.log(`Resolving review ${reviewId} by user ${userId}`);

      const success = await this.reviewService.resolveReview(
        reviewId,
        resolveReviewDto.resolution,
        userId,
      );

      if (!success) {
        throw new HttpException(
          'Review not found',
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        message: 'Review resolved successfully',
      };

    } catch (error) {
      this.logger.error('Error resolving review:', error);
      
      if (error.message === 'Review item not found') {
        throw new HttpException(
          'Review not found',
          HttpStatus.NOT_FOUND,
        );
      }
      
      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('stats')
  async getReviewStats() {
    try {
      this.logger.log('Getting review statistics');
      
      const stats = await this.reviewService.getReviewStats();
      
      return {
        stats,
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      this.logger.error('Error getting review stats:', error);
      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':dumpId/auto-check')
  async triggerConfidenceCheck(
    @Param('dumpId') dumpId: string,
  ): Promise<{ reviewId?: string; message: string }> {
    try {
      this.logger.log(`Triggering confidence check for dump ${dumpId}`);

      const reviewId = await this.reviewService.checkConfidenceThreshold(dumpId);

      if (reviewId) {
        return {
          reviewId,
          message: 'Dump flagged for review due to low confidence',
        };
      } else {
        return {
          message: 'Confidence check passed, no review needed',
        };
      }

    } catch (error) {
      this.logger.error('Error in confidence check:', error);
      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('flags')
  getReviewOptions() {
    return {
      flags: Object.values(ReviewFlag),
      priorities: Object.values(ReviewPriority),
      flagDescriptions: {
        [ReviewFlag.INCORRECT_CATEGORY]: 'Content was categorized incorrectly',
        [ReviewFlag.INCORRECT_SUMMARY]: 'AI summary is inaccurate or incomplete',
        [ReviewFlag.MISSING_ENTITIES]: 'Important entities were not extracted',
        [ReviewFlag.WRONG_URGENCY]: 'Urgency level was set incorrectly',
        [ReviewFlag.CONTENT_QUALITY]: 'Overall content processing quality issues',
        [ReviewFlag.PROCESSING_ERROR]: 'Technical error during processing',
        [ReviewFlag.FALSE_POSITIVE]: 'Content was incorrectly flagged as important',
        [ReviewFlag.SPAM]: 'Content appears to be spam or unwanted',
        [ReviewFlag.OTHER]: 'Other issues not covered by specific flags',
      },
    };
  }
}