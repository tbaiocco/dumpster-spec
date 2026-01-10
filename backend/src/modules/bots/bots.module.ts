import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegramService } from './telegram.service';
import { WhatsAppService } from './whatsapp.service';
import { TelegramWebhookController } from './telegram-webhook.controller';
import { WhatsAppWebhookController } from './whatsapp-webhook.controller';
import { HelpCommand } from './commands/help.command';
import { RecentCommand } from './commands/recent.command';
import { UpcomingCommand } from './commands/upcoming.command';
import { TrackCommand } from './commands/track.command';
import { ReportCommand } from './commands/report.command';
import { SearchCommand } from './commands/search.command';
import { MoreCommand } from './commands/more.command';
import { SearchResultFormatter } from './formatters/search-result.formatter';
import { UserModule } from '../users/user.module';
import { DumpModule } from '../dumps/dump.module';
import { SearchModule } from '../search/search.module';
import { FeedbackModule } from '../feedback/feedback.module';
import { ReminderModule } from '../reminders/reminder.module';
import { TrackingModule } from '../tracking/tracking.module';
import { MetricsModule } from '../metrics/metrics.module';
import { ResponseFormatterService } from '../ai/formatter.service';
import { TranslationService } from '../ai/translation.service';
import { ClaudeService } from '../ai/claude.service';
import { User } from '../../entities/user.entity';
import { TemplateService } from './template.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    UserModule,
    forwardRef(() => DumpModule),
    SearchModule,
    FeedbackModule,
    ReminderModule,
    TrackingModule,
    MetricsModule,
  ],
  controllers: [TelegramWebhookController, WhatsAppWebhookController],
  providers: [
    TelegramService,
    WhatsAppService,
    TemplateService,
    HelpCommand,
    RecentCommand,
    UpcomingCommand,
    TrackCommand,
    ReportCommand,
    SearchCommand,
    MoreCommand,
    SearchResultFormatter,
    ResponseFormatterService,
    TranslationService,
    ClaudeService,
  ],
  exports: [TelegramService, WhatsAppService, TemplateService],
})
export class BotsModule {}
