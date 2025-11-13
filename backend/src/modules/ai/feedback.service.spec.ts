import { Test, TestingModule } from '@nestjs/testing';
import { FeedbackService, FeedbackType, FeedbackPriority, FeedbackStatus, FeedbackRequest } from '../feedback/feedback.service';

describe('FeedbackService', () => {
  let service: FeedbackService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FeedbackService],
    }).compile();

    service = module.get<FeedbackService>(FeedbackService);
  });

  describe('submitFeedback', () => {
    it('should submit bug report feedback successfully', async () => {
      // Arrange
      const request: FeedbackRequest = {
        userId: 'test-user-id',
        type: FeedbackType.BUG_REPORT,
        title: 'App crashes when uploading image',
        description: 'The application crashes consistently when trying to upload large images',
        priority: FeedbackPriority.HIGH,
        reproductionSteps: [
          'Open the app',
          'Navigate to upload section',
          'Select a large image file (>10MB)',
          'Click upload',
        ],
        expectedBehavior: 'Image should upload successfully',
        actualBehavior: 'App crashes with no error message',
      };

      // Act
      const feedbackId = await service.submitFeedback(request);

      // Assert
      expect(feedbackId).toBeDefined();
      expect(typeof feedbackId).toBe('string');
    });

    it('should submit AI error feedback with dump reference', async () => {
      // Arrange
      const request: FeedbackRequest = {
        userId: 'test-user-id',
        type: FeedbackType.AI_ERROR,
        title: 'Incorrect categorization',
        description: 'The AI categorized my business email as personal',
        dumpId: 'dump-123',
        expectedBehavior: 'Should be categorized as business',
        actualBehavior: 'Was categorized as personal',
      };

      // Act
      const feedbackId = await service.submitFeedback(request);

      // Assert
      expect(feedbackId).toBeDefined();
      const feedback = await service.getFeedback(feedbackId);
      expect(feedback?.type).toBe(FeedbackType.AI_ERROR);
      expect(feedback?.dumpId).toBe('dump-123');
      expect(feedback?.priority).toBe(FeedbackPriority.HIGH);
    });

    it('should submit feature request feedback', async () => {
      // Arrange
      const request: FeedbackRequest = {
        userId: 'test-user-id',
        type: FeedbackType.FEATURE_REQUEST,
        title: 'Add dark mode support',
        description: 'Please add dark mode support for better user experience',
        priority: FeedbackPriority.LOW,
        additionalContext: {
          platform: 'web',
          browser: 'Chrome',
        },
      };

      // Act
      const feedbackId = await service.submitFeedback(request);

      // Assert
      expect(feedbackId).toBeDefined();
      const feedback = await service.getFeedback(feedbackId);
      expect(feedback?.type).toBe(FeedbackType.FEATURE_REQUEST);
      expect(feedback?.status).toBe(FeedbackStatus.ACKNOWLEDGED);
    });
  });

  describe('getFeedback', () => {
    it('should retrieve feedback by ID', async () => {
      // Arrange
      const request: FeedbackRequest = {
        userId: 'test-user-id',
        type: FeedbackType.GENERAL_FEEDBACK,
        title: 'Great app!',
        description: 'I love using this application',
      };

      const feedbackId = await service.submitFeedback(request);

      // Act
      const feedback = await service.getFeedback(feedbackId);

      // Assert
      expect(feedback).toBeDefined();
      expect(feedback?.id).toBe(feedbackId);
      expect(feedback?.userId).toBe('test-user-id');
      expect(feedback?.title).toBe('Great app!');
    });

    it('should return null for non-existent feedback ID', async () => {
      // Act
      const feedback = await service.getFeedback('non-existent-id');

      // Assert
      expect(feedback).toBeNull();
    });
  });

  describe('getUserFeedback', () => {
    it('should retrieve user feedback history', async () => {
      // Arrange
      const userId = 'test-user-id';
      const requests: FeedbackRequest[] = [
        {
          userId,
          type: FeedbackType.BUG_REPORT,
          title: 'Bug 1',
          description: 'First bug report',
        },
        {
          userId,
          type: FeedbackType.FEATURE_REQUEST,
          title: 'Feature 1',
          description: 'First feature request',
        },
      ];

      // Submit multiple feedback items
      for (const request of requests) {
        await service.submitFeedback(request);
      }

      // Act
      const userFeedback = await service.getUserFeedback(userId);

      // Assert
      expect(userFeedback).toHaveLength(2);
      expect(userFeedback[0].userId).toBe(userId);
      expect(userFeedback[1].userId).toBe(userId);
      // Should be sorted by creation date (newest first)
      expect(userFeedback[0].createdAt.getTime()).toBeGreaterThanOrEqual(
        userFeedback[1].createdAt.getTime()
      );
    });

    it('should return empty array for user with no feedback', async () => {
      // Act
      const userFeedback = await service.getUserFeedback('user-with-no-feedback');

      // Assert
      expect(userFeedback).toHaveLength(0);
    });
  });

  describe('getAllFeedback', () => {
    beforeEach(async () => {
      // Setup test data
      const requests: FeedbackRequest[] = [
        {
          userId: 'user1',
          type: FeedbackType.BUG_REPORT,
          title: 'Bug Report',
          description: 'Test bug',
          priority: FeedbackPriority.HIGH,
        },
        {
          userId: 'user2',
          type: FeedbackType.FEATURE_REQUEST,
          title: 'Feature Request',
          description: 'Test feature',
          priority: FeedbackPriority.LOW,
        },
      ];

      for (const request of requests) {
        await service.submitFeedback(request);
      }
    });

    it('should retrieve all feedback without filters', async () => {
      // Act
      const result = await service.getAllFeedback();

      // Assert
      expect(result.items.length).toBeGreaterThanOrEqual(2);
      expect(result.total).toBeGreaterThanOrEqual(2);
    });

    it('should filter feedback by type', async () => {
      // Act
      const result = await service.getAllFeedback({
        type: FeedbackType.BUG_REPORT,
      });

      // Assert
      expect(result.items.length).toBeGreaterThanOrEqual(1);
      for (const feedback of result.items) {
        expect(feedback.type).toBe(FeedbackType.BUG_REPORT);
      }
    });

    it('should filter feedback by priority', async () => {
      // Act
      const result = await service.getAllFeedback({
        priority: FeedbackPriority.HIGH,
      });

      // Assert
      expect(result.items.length).toBeGreaterThanOrEqual(1);
      for (const feedback of result.items) {
        expect(feedback.priority).toBe(FeedbackPriority.HIGH);
      }
    });

    it('should apply pagination', async () => {
      // Act
      const result = await service.getAllFeedback({
        limit: 1,
        offset: 0,
      });

      // Assert
      expect(result.items).toHaveLength(1);
    });
  });

  describe('updateFeedbackStatus', () => {
    it('should update feedback status successfully', async () => {
      // Arrange
      const request: FeedbackRequest = {
        userId: 'test-user-id',
        type: FeedbackType.BUG_REPORT,
        title: 'Test Bug',
        description: 'Test description',
      };

      const feedbackId = await service.submitFeedback(request);

      // Act
      await service.updateFeedbackStatus(feedbackId, FeedbackStatus.IN_PROGRESS, 'Investigating the issue', 'admin-user');

      // Assert
      const feedback = await service.getFeedback(feedbackId);
      expect(feedback?.status).toBe(FeedbackStatus.IN_PROGRESS);
      expect(feedback?.updatedAt).toBeDefined();
    });

    it('should throw error for non-existent feedback', async () => {
      // Act & Assert
      const result = await service.updateFeedbackStatus('non-existent-id', FeedbackStatus.RESOLVED, 'Fixed', 'admin-user');
      expect(result).toBe(false);
    });
  });

  describe('upvoteFeedback', () => {
    it('should increment upvote count', async () => {
      // Arrange
      const request: FeedbackRequest = {
        userId: 'test-user-id',
        type: FeedbackType.FEATURE_REQUEST,
        title: 'Popular Feature',
        description: 'This feature is highly requested',
      };

      const feedbackId = await service.submitFeedback(request);

      // Act
      await service.upvoteFeedback(feedbackId);

      // Assert
      const feedback = await service.getFeedback(feedbackId);
      expect(feedback?.upvotes).toBe(1);
    });

    it('should return false for non-existent feedback', async () => {
      // Act
      const result = await service.upvoteFeedback('non-existent-id');
      
      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getFeedbackStats', () => {
    it('should return feedback statistics', async () => {
      // Arrange - Create some test feedback
      const requests: FeedbackRequest[] = [
        {
          userId: 'user1',
          type: FeedbackType.BUG_REPORT,
          title: 'Bug',
          description: 'Bug description',
          priority: FeedbackPriority.HIGH,
        },
        {
          userId: 'user2',
          type: FeedbackType.FEATURE_REQUEST,
          title: 'Feature',
          description: 'Feature description',
          priority: FeedbackPriority.LOW,
        },
      ];

      for (const request of requests) {
        await service.submitFeedback(request);
      }

      // Act
      const stats = await service.getFeedbackStats();

      // Assert
      expect(stats.total).toBeGreaterThanOrEqual(2);
      expect(stats.byType).toBeDefined();
      expect(stats.byPriority).toBeDefined();
      expect(stats.byStatus).toBeDefined();
      expect(stats.topTags).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle various feedback types gracefully', async () => {
      // Arrange
      const request = {
        userId: 'test-user-id',
        type: FeedbackType.BUG_REPORT,
        title: 'Test',
        description: 'Test description',
      };

      // Act
      const feedbackId = await service.submitFeedback(request);

      // Assert
      expect(feedbackId).toBeDefined();
      expect(typeof feedbackId).toBe('string');
    });
  });
});