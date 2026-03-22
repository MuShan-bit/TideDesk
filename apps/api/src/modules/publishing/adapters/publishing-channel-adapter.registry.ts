import { Inject, Injectable } from '@nestjs/common';
import { PublishPlatformType } from '@prisma/client';
import {
  PUBLISHING_CHANNEL_ADAPTERS,
  type PublishingChannelAdapter,
} from '../publishing-channel-adapter.types';

@Injectable()
export class PublishingChannelAdapterRegistry {
  constructor(
    @Inject(PUBLISHING_CHANNEL_ADAPTERS)
    private readonly adapters: PublishingChannelAdapter[],
  ) {}

  getAdapter(platformType: PublishPlatformType) {
    const adapter = this.adapters.find((item) => item.supports(platformType));

    if (!adapter) {
      throw new Error(
        `Publishing channel adapter is not registered for ${platformType}`,
      );
    }

    return adapter;
  }
}
