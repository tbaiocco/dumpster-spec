import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../../entities/user.entity';

/**
 * GetUser Decorator
 * Extracts the authenticated user from the request object
 * Used in conjunction with JWT guards to get the current user
 */
export const GetUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);