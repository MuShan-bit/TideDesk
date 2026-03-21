import { Module } from '@nestjs/common';
import { AiConfigModule } from '../ai-config/ai-config.module';
import { CryptoModule } from '../crypto/crypto.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AnthropicAdapter } from './adapters/anthropic.adapter';
import { AiUsageService } from './ai-usage.service';
import { GeminiAdapter } from './adapters/gemini.adapter';
import { AiGatewayController } from './ai-gateway.controller';
import { OpenAiCompatibleAdapter } from './adapters/openai-compatible.adapter';
import { AiGatewayService } from './ai-gateway.service';
import { AI_PROVIDER_ADAPTERS } from './ai-gateway.types';

@Module({
  imports: [PrismaModule, CryptoModule, AiConfigModule],
  controllers: [AiGatewayController],
  providers: [
    AnthropicAdapter,
    GeminiAdapter,
    OpenAiCompatibleAdapter,
    {
      provide: AI_PROVIDER_ADAPTERS,
      useFactory: (
        anthropicAdapter: AnthropicAdapter,
        geminiAdapter: GeminiAdapter,
        openAiCompatibleAdapter: OpenAiCompatibleAdapter,
      ) => [anthropicAdapter, geminiAdapter, openAiCompatibleAdapter],
      inject: [AnthropicAdapter, GeminiAdapter, OpenAiCompatibleAdapter],
    },
    AiUsageService,
    AiGatewayService,
  ],
  exports: [AiGatewayService, AiUsageService],
})
export class AiGatewayModule {}
