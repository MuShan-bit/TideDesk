import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { RequestUser } from '../auth/request-user.type';

type AuthenticatedRequest = Request & {
  user?: RequestUser;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    return request.user;
  },
);
