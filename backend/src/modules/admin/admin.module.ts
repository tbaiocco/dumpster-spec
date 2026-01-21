import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Dump } from '../../entities/dump.entity';
import { User } from '../../entities/user.entity';
import { Reminder } from '../../entities/reminder.entity';
import { Category } from '../../entities/category.entity';
import { SearchMetric } from '../../entities/search-metric.entity';
import { AIMetric } from '../../entities/ai-metric.entity';
import { FeatureUsage } from '../../entities/feature-usage.entity';
import { TrackableItem } from '../../entities/trackable-item.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Dump,
      User,
      Reminder,
      Category,
      SearchMetric,
      AIMetric,
      FeatureUsage,
      TrackableItem,
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    AuthModule, // Import AuthModule to use JwtAuthGuard and JwtStrategy
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
