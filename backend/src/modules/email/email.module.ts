import { Module } from '@nestjs/common';
import { EmailProcessorService } from './email-processor.service';
import { EmailController } from './email.controller';
import { DumpModule } from '../dumps/dump.module';

@Module({
  imports: [DumpModule], // Import DumpModule to access DocumentProcessorService and DumpService
  controllers: [EmailController],
  providers: [EmailProcessorService],
  exports: [EmailProcessorService],
})
export class EmailModule {}