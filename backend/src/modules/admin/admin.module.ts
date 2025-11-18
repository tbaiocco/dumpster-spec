import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Dump } from '../../entities/dump.entity';
import { User } from '../../entities/user.entity';
import { Reminder } from '../../entities/reminder.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Dump, User, Reminder]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    AuthModule, // Import AuthModule to use JwtAuthGuard and JwtStrategy
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
