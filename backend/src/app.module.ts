import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/users/user.module';
import { DumpModule } from './modules/dumps/dump.module';
import { SearchModule } from './modules/search/search.module';
import { BotsModule } from './modules/bots/bots.module';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { EmailModule } from './modules/email/email.module';
import { ReminderModule } from './modules/reminders/reminder.module';
import { NotificationModule } from './modules/notifications/notification.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { TrackingModule } from './modules/tracking/tracking.module';
import { HealthModule } from './health/health.module';
import { AdminModule } from './modules/admin/admin.module';
import { ReviewModule } from './modules/review/review.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { DatabaseInitService } from './database/database-init.service';

@Module({
  imports: [
    // Global event emitter for async operations
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: true,
      ignoreErrors: false,
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        `config/environments/.env.${process.env.NODE_ENV}`,
        'config/environments/.env.development', // fallback for development
        'config/environments/.env', // base configuration
      ],
      ignoreEnvFile: process.env.NODE_ENV === 'production', // In production, rely on system env vars
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST || 'localhost',
      port: Number.parseInt(process.env.DATABASE_PORT || '5432', 10),
      username: process.env.DATABASE_USERNAME || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'password',
      database: process.env.DATABASE_NAME || 'clutter_ai_dev',
      url: process.env.DATABASE_URL,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: process.env.NODE_ENV === 'development',
      logging: process.env.NODE_ENV === 'development',
      ssl:
        process.env.NODE_ENV === 'production'
          ? { rejectUnauthorized: false }
          : false,
    }),
    AuthModule,
    UserModule,
    DumpModule,
    SearchModule,
    BotsModule,
    FeedbackModule,
    EmailModule,
    MetricsModule, // Production Analytics System
    // Phase 7 modules
    ReminderModule,
    NotificationModule,
    CalendarModule,
    TrackingModule,
    // Phase 8 modules
    AdminModule,
    ReviewModule,
    // Phase 9 modules
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 second
        limit: 10, // 10 requests per second
      },
      {
        name: 'medium',
        ttl: 10000, // 10 seconds
        limit: 50, // 50 requests per 10 seconds
      },
      {
        name: 'long',
        ttl: 60000, // 60 seconds
        limit: 100, // 100 requests per minute
      },
    ]),
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    DatabaseInitService,
    // Global rate limiting guard (T091)
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
