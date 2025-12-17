import { Module } from '@nestjs/common';
import { EmailProcessorService } from './email-processor.service';
import { EmailController } from './email.controller';
import { DumpModule } from '../dumps/dump.module';
import { UserModule } from '../users/user.module';
import { MetricsModule } from '../metrics/metrics.module';

@Module({
  imports: [DumpModule, UserModule, MetricsModule],
  controllers: [EmailController],
  providers: [EmailProcessorService],
  exports: [EmailProcessorService],
})
export class EmailModule {}
