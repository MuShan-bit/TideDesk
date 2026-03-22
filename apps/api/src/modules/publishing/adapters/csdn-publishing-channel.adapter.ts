import { PublishPlatformType } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { BasePublishingChannelAdapter } from './base-publishing-channel.adapter';

@Injectable()
export class CsdnPublishingChannelAdapter extends BasePublishingChannelAdapter {
  readonly platformType = PublishPlatformType.CSDN;

  protected readonly validationRule = {
    label: 'CSDN',
    identifierKeys: [
      'accountIdentifier',
      'username',
      'blog',
      'account',
      'userToken',
    ],
    requiredAnyKeys: ['cookie', 'userToken', 'csrfToken', 'account'],
  };
}
