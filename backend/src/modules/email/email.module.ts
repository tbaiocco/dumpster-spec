import { Module } from '@nestjs/common';
import { EmailProcessorService } from './email-processor.service';
import { EmailController } from './email.controller';
import { DumpModule } from '../dumps/dump.module';
import { UserModule } from '../users/user.module';

@Module({
  imports: [DumpModule, UserModule], // Import UserModule to access UserService
  controllers: [EmailController],
  providers: [EmailProcessorService],
  exports: [EmailProcessorService],
})
export class EmailModule {}
