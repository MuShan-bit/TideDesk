import { Module } from '@nestjs/common';
import { InternalAuthGuard } from '../../common/auth/internal-auth.guard';
import { IdentityController } from './identity.controller';

@Module({
  controllers: [IdentityController],
  providers: [InternalAuthGuard],
})
export class IdentityModule {}
