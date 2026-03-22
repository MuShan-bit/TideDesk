import { PublishPlatformType } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { BasePublishingChannelAdapter } from './base-publishing-channel.adapter';

@Injectable()
export class WechatPublishingChannelAdapter extends BasePublishingChannelAdapter {
  readonly platformType = PublishPlatformType.WECHAT;

  protected readonly validationRule = {
    label: '微信公众号',
    identifierKeys: [
      'accountIdentifier',
      'biz',
      'appId',
      'accountId',
      'username',
    ],
    requiredAnyKeys: ['appId', 'biz', 'cookie', 'accessToken'],
  };
}
