import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { RequestUser } from './request-user.type';

type AuthenticatedRequest = Request & {
  user?: RequestUser;
};

@Injectable()
export class InternalAuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const internalSecret = request.headers['x-internal-auth'];
    const expectedSecret = this.configService.getOrThrow<string>(
      'INTERNAL_API_SHARED_SECRET',
    );

    if (internalSecret !== expectedSecret) {
      throw new UnauthorizedException('Invalid internal signature');
    }

    const userId = request.headers['x-user-id'];

    if (typeof userId !== 'string' || userId.length === 0) {
      throw new UnauthorizedException('Missing user context');
    }

    request.user = {
      id: userId,
      email:
        typeof request.headers['x-user-email'] === 'string'
          ? request.headers['x-user-email']
          : undefined,
      role:
        typeof request.headers['x-user-role'] === 'string'
          ? request.headers['x-user-role']
          : undefined,
    };

    return true;
  }
}
