import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JWT Authentication Guard
 * Uses the JWT strategy to validate JWT tokens from the Authorization header
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
