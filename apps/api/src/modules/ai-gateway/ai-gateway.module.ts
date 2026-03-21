import { Module } from '@nestjs/common';
import { AiConfigModule } from '../ai-config/ai-config.module';
import { CryptoModule } from '../crypto/crypto.module';
import { PrismaModule } from '../prisma/prisma.module';
import { OpenAiCompatibleAdapter } from './adapters/openai-compatible.adapter';
import { AiGatewayService } from './ai-gateway.service';
import { AI_PROVIDER_ADAPTERS } from './ai-gateway.types';

@Module({
  imports: [PrismaModule, CryptoModule, AiConfigModule],
  providers: [
    OpenAiCompatibleAdapter,
    {
      provide: AI_PROVIDER_ADAPTERS,
      useFactory: (openAiCompatibleAdapter: OpenAiCompatibleAdapter) => [
        openAiCompatibleAdapter,
      ],
      inject: [OpenAiCompatibleAdapter],
    },
    AiGatewayService,
  ],
  exports: [AiGatewayService],
})
export class AiGatewayModule {}

