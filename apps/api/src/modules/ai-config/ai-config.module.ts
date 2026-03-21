import { Module } from '@nestjs/common';
import { CryptoModule } from '../crypto/crypto.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AiConfigController } from './ai-config.controller';
import { AiConfigService } from './ai-config.service';

@Module({
  imports: [PrismaModule, CryptoModule],
  controllers: [AiConfigController],
  providers: [AiConfigService],
  exports: [AiConfigService],
})
export class AiConfigModule {}

