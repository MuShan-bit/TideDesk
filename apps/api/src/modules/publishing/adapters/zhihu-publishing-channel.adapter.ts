import { PublishPlatformType } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { BasePublishingChannelAdapter } from './base-publishing-channel.adapter';

@Injectable()
export class ZhihuPublishingChannelAdapter extends BasePublishingChannelAdapter {
  readonly platformType = PublishPlatformType.ZHIHU;

  protected readonly validationRule = {
    label: '知乎',
    identifierKeys: [
      'accountIdentifier',
      'username',
      'account',
      'accountId',
      'handle',
    ],
    requiredAnyKeys: ['cookie', 'session', 'authorization', 'account'],
  };
}
