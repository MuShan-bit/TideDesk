import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { InternalAuthGuard } from '../../common/auth/internal-auth.guard';
import type { RequestUser } from '../../common/auth/request-user.type';

@Controller('internal')
@UseGuards(InternalAuthGuard)
export class IdentityController {
  @Get('me')
  getCurrentUser(@CurrentUser() user: RequestUser | undefined) {
    return {
      user,
    };
  }
}
