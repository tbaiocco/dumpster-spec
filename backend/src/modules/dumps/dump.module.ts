import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DumpService } from './dump.service';
import { DumpController } from './controllers/dump.controller';
import { TelegramWebhookController } from './controllers/telegram-webhook.controller';
import { WhatsAppWebhookController } from './controllers/whatsapp-webhook.controller';
import { Dump } from '../../entities/dump.entity';
import { Category } from '../../entities/category.entity';
import { Reminder } from '../../entities/reminder.entity';
import { User } from '../../entities/user.entity';

// Import all AI services
import { ClaudeService } from '../ai/claude.service';
import { SpeechService } from '../ai/speech.service';
import { VisionService } from '../ai/vision.service';
import { EntityExtractionService } from '../ai/extraction.service';
import { ResponseFormatterService } from '../ai/formatter.service';
import { MediaProcessorService } from '../ai/media-processor.service';
import { VoiceProcessorService } from '../ai/voice-processor.service';
import { ImageProcessorService } from '../ai/image-processor.service';
import { FallbackHandlerService } from '../ai/fallback-handler.service';

// Import bot services
import { TelegramService } from '../bots/telegram.service';
import { WhatsAppService } from '../bots/whatsapp.service';

// Import other modules
import { UserModule } from '../users/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Dump, Category, Reminder, User]),
    UserModule, // Import UserModule to make UserService available
  ],
  controllers: [
    DumpController,
    TelegramWebhookController,
    WhatsAppWebhookController,
  ],
  providers: [
    DumpService,
    // AI Services
    ClaudeService,
    SpeechService,
    VisionService,
    EntityExtractionService,
    ResponseFormatterService,
    MediaProcessorService,
    VoiceProcessorService,
    ImageProcessorService,
    FallbackHandlerService,
    // Bot Services
    TelegramService,
    WhatsAppService,
  ],
  exports: [DumpService],
})
export class DumpModule {}