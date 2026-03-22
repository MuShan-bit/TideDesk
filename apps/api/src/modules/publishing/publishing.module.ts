import { Module } from '@nestjs/common';
import { CryptoModule } from '../crypto/crypto.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CsdnPublishingChannelAdapter } from './adapters/csdn-publishing-channel.adapter';
import { PublishingChannelAdapterRegistry } from './adapters/publishing-channel-adapter.registry';
import { WechatPublishingChannelAdapter } from './adapters/wechat-publishing-channel.adapter';
import { ZhihuPublishingChannelAdapter } from './adapters/zhihu-publishing-channel.adapter';
import { PublishingDraftsController } from './publishing-drafts.controller';
import { PublishingDraftsService } from './publishing-drafts.service';
import { PUBLISHING_CHANNEL_ADAPTERS } from './publishing-channel-adapter.types';
import { PublishingController } from './publishing.controller';
import { PublishingService } from './publishing.service';

@Module({
  imports: [PrismaModule, CryptoModule],
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
  ],
  exports: [
    PublishingChannelAdapterRegistry,
    PublishingService,
    PublishingDraftsService,
  ],
})
export class PublishingModule {}
