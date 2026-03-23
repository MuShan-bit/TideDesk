import { Module } from '@nestjs/common';
import { AiGatewayModule } from '../ai-gateway/ai-gateway.module';
import { CryptoModule } from '../crypto/crypto.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CsdnPublishingChannelAdapter } from './adapters/csdn-publishing-channel.adapter';
import { PublishingChannelAdapterRegistry } from './adapters/publishing-channel-adapter.registry';
import { WechatPublishingChannelAdapter } from './adapters/wechat-publishing-channel.adapter';
import { ZhihuPublishingChannelAdapter } from './adapters/zhihu-publishing-channel.adapter';
import { PublishingDraftsController } from './publishing-drafts.controller';
import { PublishingDraftRewriteService } from './publishing-draft-rewrite.service';
import { PublishingDraftsService } from './publishing-drafts.service';
import { PublishingJobsService } from './publishing-jobs.service';
import { PUBLISHING_CHANNEL_ADAPTERS } from './publishing-channel-adapter.types';
import { PublishingController } from './publishing.controller';
import { PublishingService } from './publishing.service';

@Module({
  imports: [PrismaModule, CryptoModule, AiGatewayModule],
  controllers: [PublishingController, PublishingDraftsController],
  providers: [
    WechatPublishingChannelAdapter,
    ZhihuPublishingChannelAdapter,
    CsdnPublishingChannelAdapter,
    {
      provide: PUBLISHING_CHANNEL_ADAPTERS,
      useFactory: (
        wechatAdapter: WechatPublishingChannelAdapter,
        zhihuAdapter: ZhihuPublishingChannelAdapter,
        csdnAdapter: CsdnPublishingChannelAdapter,
      ) => [wechatAdapter, zhihuAdapter, csdnAdapter],
      inject: [
        WechatPublishingChannelAdapter,
        ZhihuPublishingChannelAdapter,
        CsdnPublishingChannelAdapter,
      ],
    },
    PublishingChannelAdapterRegistry,
    PublishingService,
    PublishingDraftsService,
    PublishingJobsService,
    PublishingDraftRewriteService,
  ],
  exports: [
    PublishingChannelAdapterRegistry,
    PublishingService,
    PublishingDraftsService,
    PublishingJobsService,
    PublishingDraftRewriteService,
  ],
})
export class PublishingModule {}
