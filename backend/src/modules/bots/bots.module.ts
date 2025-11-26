import { Module, forwardRef } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { WhatsAppService } from './whatsapp.service';
import { HelpCommand } from './commands/help.command';
import { RecentCommand } from './commands/recent.command';
import { ReportCommand } from './commands/report.command';
import { SearchCommand } from './commands/search.command';
import { MoreCommand } from './commands/more.command';
import { SearchResultFormatter } from './formatters/search-result.formatter';
import { UserModule } from '../users/user.module';
import { DumpModule } from '../dumps/dump.module';
import { SearchModule } from '../search/search.module';
import { FeedbackModule } from '../feedback/feedback.module';

@Module({
  imports: [UserModule, forwardRef(() => DumpModule), SearchModule, FeedbackModule],
  providers: [
    TelegramService,
    WhatsAppService,
    HelpCommand,
    RecentCommand,
    ReportCommand,
    SearchCommand,
    MoreCommand,
    SearchResultFormatter,
  ],
  exports: [TelegramService, WhatsAppService],
})
export class BotsModule {}