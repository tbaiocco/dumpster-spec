import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DumpService } from './services/dump.service';
import { DumpController } from './controllers/dump.controller';
import { Dump } from '../../entities/dump.entity';
import { Category } from '../../entities/category.entity';
import { Reminder } from '../../entities/reminder.entity';
import { User } from '../../entities/user.entity';

// Import all AI services
import { ClaudeService } from '../ai/claude.service';
import { GoogleAuthService } from '../ai/google-auth.service';
import { SpeechService } from '../ai/speech.service';
import { VisionService } from '../ai/vision.service';
import { EntityExtractionService } from '../ai/extraction.service';
import { ResponseFormatterService } from '../ai/formatter.service';
import { TranslationService } from '../ai/translation.service';
import { MediaProcessorService } from '../ai/media-processor.service';
import { ReviewService } from './services/review.service';
import { ReviewController } from './controllers/review.controller';
import { SpeechTestController } from '../ai/speech-test.controller';
import { SpeechAdvancedTestController } from '../ai/speech-advanced-test.controller';
import { ConfidenceService } from '../ai/confidence.service';
import { FallbackHandlerService } from '../ai/fallback-handler.service';
import { DocumentProcessorService } from '../ai/document-processor.service';
import { ScreenshotProcessorService } from '../ai/screenshot-processor.service';
import { ContentRouterService } from './content-router.service';
import { HandwritingService } from '../ai/handwriting.service';
import { CategorizationService } from './services/categorization.service';

// Import other modules
import { UserModule } from '../users/user.module';
import { VectorService } from '../search/vector.service';
import { DatabaseInitService } from '../../database/database-init.service';
import { BotsModule } from '../bots/bots.module';
import { MetricsModule } from '../metrics/metrics.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Dump, Category, Reminder, User]),
    UserModule, // Import UserModule to make UserService available
    forwardRef(() => BotsModule), // Use forwardRef to resolve circular dependency
    MetricsModule,
  ],
  controllers: [DumpController, ReviewController, SpeechTestController, SpeechAdvancedTestController],
  providers: [
    DumpService,
    // AI Services
    GoogleAuthService, // Shared authentication service
    ClaudeService,
    SpeechService,
    VisionService,
    EntityExtractionService,
    ResponseFormatterService,
    TranslationService,
    MediaProcessorService,
    FallbackHandlerService,
    DocumentProcessorService,
    ScreenshotProcessorService,
    ContentRouterService,
    HandwritingService,
    CategorizationService,
    // Vector Service for embedding generation
    VectorService,
    // Database initialization service
    DatabaseInitService,
    // Review service for error recovery
    ReviewService,
    // Confidence service for AI result validation
    ConfidenceService,
  ],
  exports: [
    DumpService,
    ReviewService,
    ConfidenceService,
    DocumentProcessorService,
  ],
})
export class DumpModule {}
