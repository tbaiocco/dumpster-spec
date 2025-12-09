import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TrackingService } from './tracking.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dump } from '../../entities/dump.entity';

/**
 * Event payload for dump creation
 */
export interface DumpCreatedEvent {
  dumpId: string;
  userId: string;
  content: string;
  contentType: string;
}

/**
 * Service to handle tracking-related events
 * Listens for dump creation events and triggers async tracking detection
 */
@Injectable()
export class TrackingEventsService {
  private readonly logger = new Logger(TrackingEventsService.name);

  constructor(
    private readonly trackingService: TrackingService,
    @InjectRepository(Dump)
    private readonly dumpRepository: Repository<Dump>,
  ) {}

  /**
   * Handle dump creation event - detect tracking opportunities asynchronously
   * This runs after the dump response is sent to the user (non-blocking)
   * !SHOULD be integrated to proactive.service and manage reminders and tracking,
   *   then we can remove the proactive running via cron in the early mornings.
   *   It, then, makes more sense to be moved to proactive.service!
   */
  @OnEvent('dump.created', { async: true })
  async handleDumpCreated(event: DumpCreatedEvent): Promise<void> {
    this.logger.log(
      `Received dump.created event for dump ${event.dumpId}, starting async tracking detection`,
    );

    try {
      // Use the existing detectTrackableItems method from TrackingService
      const detectionResult =
        await this.trackingService.detectTrackableItems(
          event.userId,
          event.dumpId,
        );

      if (detectionResult.detected && detectionResult.suggestions.length > 0) {
        this.logger.log(
          `Found ${detectionResult.suggestions.length} tracking opportunities for user ${event.userId}`,
        );

        // For now, just log the suggestions
        // In the future, we can send bot notifications here
        for (const suggestion of detectionResult.suggestions) {
          this.logger.log(
            `  - ${suggestion.type}: ${suggestion.title} (confidence: ${suggestion.confidence})`,
          );
        }

        // TODO: Send bot notification to user about tracking opportunities
        // await this.notifyUser(event.userId, detectionResult.suggestions);
      } else {
        this.logger.debug(
          `No tracking opportunities found for dump ${event.dumpId}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to detect tracking opportunities for dump ${event.dumpId}: ${error.message}`,
        error.stack,
      );
      // Don't throw - we don't want to block the event system
    }
  }

  /**
   * Send notification to user about detected tracking opportunities
   * TODO: Implement this when bot notification system is ready
   */
  private async notifyUser(
    userId: string,
    suggestions: Array<{
      type: string;
      title: string;
      description: string;
      confidence: string;
    }>,
  ): Promise<void> {
    // Placeholder for future implementation
    this.logger.debug(
      `Would notify user ${userId} about ${suggestions.length} tracking opportunities`,
    );

    // Future implementation:
    // 1. Get user's preferred notification channel (Telegram/WhatsApp)
    // 2. Format suggestions as message
    // 3. Send via bot service
    // 4. Allow user to approve/reject suggestions with inline buttons
  }
}
