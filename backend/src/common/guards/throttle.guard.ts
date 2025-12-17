import { Injectable } from '@nestjs/common';
import { ThrottlerGuard as NestThrottlerGuard } from '@nestjs/throttler';

/**
 * Throttle Guard (T091)
 * Rate limiting for API endpoints
 *
 * Default configuration:
 * - 10 requests per 60 seconds for standard endpoints
 * - Configurable per endpoint using @Throttle() decorator
 *
 * Usage:
 * ```typescript
 * @UseGuards(ThrottleGuard)
 * @Controller('api')
 * export class MyController {
 *   @Throttle({ default: { limit: 3, ttl: 60000 } }) // Override: 3 requests per minute
 *   @Get('limited')
 *   limitedEndpoint() {}
 * }
 * ```
 */
@Injectable()
export class ThrottleGuard extends NestThrottlerGuard {}
