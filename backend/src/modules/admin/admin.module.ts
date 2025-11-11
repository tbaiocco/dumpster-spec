import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Dump } from '../../entities/dump.entity';
import { User } from '../../entities/user.entity';
import { Reminder } from '../../entities/reminder.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Dump, User, Reminder])],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
