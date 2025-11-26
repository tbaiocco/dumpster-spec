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
import {
  FeedbackService,
  FeedbackType,
  FeedbackPriority,
  FeedbackStatus,
  FeedbackRequest,
} from './feedback.service';

export class SubmitFeedbackDto {
  type: FeedbackType;
  title: string;
  description: string;
  priority?: FeedbackPriority;
  dumpId?: string;
  userAgent?: string;
  url?: string;
  reproductionSteps?: string[];
  expectedBehavior?: string;
  actualBehavior?: string;
  additionalContext?: Record<string, any>;
}

export class UpdateFeedbackStatusDto {
  status: FeedbackStatus;
  resolution?: string;
}

export class AddNoteDto {
  note: string;
}

@Controller('feedback')
export class FeedbackController {
  private readonly logger = new Logger(FeedbackController.name);

  constructor(private readonly feedbackService: FeedbackService) {}

  @Post('submit')
  async submitFeedback(
    @Body() submitFeedbackDto: SubmitFeedbackDto,
    @Query('userId') userId?: string,
  ): Promise<{ feedbackId: string; message: string }> {
    try {
      if (!userId) {
        throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
      }

      this.logger.log(`Submitting feedback: ${submitFeedbackDto.type} from user ${userId}`);

      const feedbackRequest: FeedbackRequest = {
        ...submitFeedbackDto,
        userId,
      };

      const feedbackId = await this.feedbackService.submitFeedback(feedbackRequest);

      return {
        feedbackId,
        message: 'Feedback submitted successfully',
      };

    } catch (error) {
      this.logger.error('Error submitting feedback:', error);
      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':feedbackId')
  async getFeedback(@Param('feedbackId') feedbackId: string) {
    try {
      const feedback = await this.feedbackService.getFeedback(feedbackId);
      
      if (!feedback) {
        throw new HttpException('Feedback not found', HttpStatus.NOT_FOUND);
      }

      return { feedback };

    } catch (error) {
      this.logger.error('Error getting feedback:', error);
      
      if (error.status === HttpStatus.NOT_FOUND) {
        throw error;
      }
      
      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('user/:userId')
  async getUserFeedback(@Param('userId') userId: string) {
    try {
      this.logger.log(`Getting feedback for user ${userId}`);
      
      const feedback = await this.feedbackService.getUserFeedback(userId);
      
      return {
        feedback,
        total: feedback.length,
      };

    } catch (error) {
      this.logger.error('Error getting user feedback:', error);
      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  async getAllFeedback(@Query() query: any) {
    try {
      this.logger.log('Getting all feedback with filters');
      
      const filters = {
        type: query.type as FeedbackType,
        status: query.status as FeedbackStatus,
        priority: query.priority as FeedbackPriority,
        userId: query.userId as string,
        dumpId: query.dumpId as string,
        tags: query.tags ? (query.tags as string).split(',') : undefined,
        limit: query.limit ? Number.parseInt(query.limit as string, 10) : undefined,
        offset: query.offset ? Number.parseInt(query.offset as string, 10) : undefined,
      };

      const result = await this.feedbackService.getAllFeedback(filters);
      
      return result;

    } catch (error) {
      this.logger.error('Error getting all feedback:', error);
      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':feedbackId/status')
  async updateFeedbackStatus(
    @Param('feedbackId') feedbackId: string,
    @Body() updateStatusDto: UpdateFeedbackStatusDto,
    @Query('userId') userId?: string,
  ): Promise<{ message: string }> {
    try {
      this.logger.log(`Updating feedback ${feedbackId} status to ${updateStatusDto.status}`);

      const success = await this.feedbackService.updateFeedbackStatus(
        feedbackId,
        updateStatusDto.status,
        updateStatusDto.resolution,
        userId,
      );

      if (!success) {
        throw new HttpException('Feedback not found', HttpStatus.NOT_FOUND);
      }

      return {
        message: 'Feedback status updated successfully',
      };

    } catch (error) {
      this.logger.error('Error updating feedback status:', error);
      
      if (error.status === HttpStatus.NOT_FOUND) {
        throw error;
      }
      
      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':feedbackId/notes')
  async addInternalNote(
    @Param('feedbackId') feedbackId: string,
    @Body() addNoteDto: AddNoteDto,
  ): Promise<{ message: string }> {
    try {
      this.logger.log(`Adding internal note to feedback ${feedbackId}`);

      const success = await this.feedbackService.addInternalNote(
        feedbackId,
        addNoteDto.note,
      );

      if (!success) {
        throw new HttpException('Feedback not found', HttpStatus.NOT_FOUND);
      }

      return {
        message: 'Internal note added successfully',
      };

    } catch (error) {
      this.logger.error('Error adding internal note:', error);
      
      if (error.status === HttpStatus.NOT_FOUND) {
        throw error;
      }
      
      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':feedbackId/upvote')
  async upvoteFeedback(@Param('feedbackId') feedbackId: string): Promise<{ message: string }> {
    try {
      this.logger.log(`Upvoting feedback ${feedbackId}`);

      const success = await this.feedbackService.upvoteFeedback(feedbackId);

      if (!success) {
        throw new HttpException('Feedback not found', HttpStatus.NOT_FOUND);
      }

      return {
        message: 'Feedback upvoted successfully',
      };

    } catch (error) {
      this.logger.error('Error upvoting feedback:', error);
      
      if (error.status === HttpStatus.NOT_FOUND) {
        throw error;
      }
      
      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('stats/overview')
  async getFeedbackStats() {
    try {
      this.logger.log('Getting feedback statistics');
      
      const stats = await this.feedbackService.getFeedbackStats();
      
      return {
        stats,
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      this.logger.error('Error getting feedback stats:', error);
      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('options/metadata')
  getMetadata() {
    return {
      types: Object.values(FeedbackType),
      priorities: Object.values(FeedbackPriority),
      statuses: Object.values(FeedbackStatus),
      typeDescriptions: {
        [FeedbackType.BUG_REPORT]: 'Report a bug or error in the application',
        [FeedbackType.FEATURE_REQUEST]: 'Request a new feature or enhancement',
        [FeedbackType.AI_ERROR]: 'Report incorrect AI processing results',
        [FeedbackType.CATEGORIZATION_ERROR]: 'Report incorrect content categorization',
        [FeedbackType.SUMMARY_ERROR]: 'Report incorrect AI summary',
        [FeedbackType.ENTITY_ERROR]: 'Report missing or incorrect entity extraction',
        [FeedbackType.URGENCY_ERROR]: 'Report incorrect urgency level detection',
        [FeedbackType.GENERAL_FEEDBACK]: 'General feedback or suggestions',
        [FeedbackType.CONTENT_QUALITY]: 'Report content quality issues',
        [FeedbackType.PERFORMANCE_ISSUE]: 'Report performance or speed issues',
      },
    };
  }
}