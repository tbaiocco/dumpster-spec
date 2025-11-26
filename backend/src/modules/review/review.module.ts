import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewController } from './review.controller';
import { AdminModule } from '../admin/admin.module';
import { Dump } from '../../entities/dump.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Dump]), AdminModule],
  controllers: [ReviewController],
})
export class ReviewModule {}
