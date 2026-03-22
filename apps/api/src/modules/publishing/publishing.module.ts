import { Module } from '@nestjs/common';
import { CryptoModule } from '../crypto/crypto.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PublishingDraftsController } from './publishing-drafts.controller';
import { PublishingDraftsService } from './publishing-drafts.service';
import { PublishingController } from './publishing.controller';
import { PublishingService } from './publishing.service';

@Module({
  imports: [PrismaModule, CryptoModule],
  controllers: [PublishingController, PublishingDraftsController],
  providers: [PublishingService, PublishingDraftsService],
  exports: [PublishingService, PublishingDraftsService],
})
export class PublishingModule {}
