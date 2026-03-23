import {
  PublishBindingStatus,
  PublishPlatformType,
} from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import { CsdnPublishingChannelAdapter } from './csdn-publishing-channel.adapter';
import { PublishingChannelAdapterRegistry } from './publishing-channel-adapter.registry';
import { WechatPublishingChannelAdapter } from './wechat-publishing-channel.adapter';
import { ZhihuPublishingChannelAdapter } from './zhihu-publishing-channel.adapter';

describe('PublishingChannelAdapterRegistry', () => {
  const wechatAdapter = new WechatPublishingChannelAdapter();
  const zhihuAdapter = new ZhihuPublishingChannelAdapter();
  const csdnAdapter = new CsdnPublishingChannelAdapter();
  const registry = new PublishingChannelAdapterRegistry([
    wechatAdapter,
    zhihuAdapter,
    csdnAdapter,
  ]);

  it('resolves platform adapters and validates credentials with a shared contract', async () => {
    const adapter = registry.getAdapter(PublishPlatformType.WECHAT);
    const result = await adapter.validateCredential({
      credentialPayload: JSON.stringify({
        appId: 'wx-app-001',
        cookie: 'wx_cookie=value',
      }),
    });

    expect(adapter).toBe(wechatAdapter);
    expect(result.status).toBe(PublishBindingStatus.ACTIVE);
    expect(result.inferredAccountIdentifier).toBe('wx-app-001');
    expect(result.normalizedPayload).toEqual({
      appId: 'wx-app-001',
      cookie: 'wx_cookie=value',
    });
  });

  it('returns invalid validation results when required credential fields are missing', async () => {
    const result = await registry
      .getAdapter(PublishPlatformType.CSDN)
      .validateCredential({
        credentialPayload: JSON.stringify({
          note: 'missing credential fields',
        }),
      });

    expect(result.status).toBe(PublishBindingStatus.INVALID);
    expect(result.validationError).toContain('CSDN凭证缺少关键字段');
  });

  it('resolves all implemented platform adapters', () => {
    expect(registry.getAdapter(PublishPlatformType.WECHAT)).toBe(wechatAdapter);
    expect(registry.getAdapter(PublishPlatformType.ZHIHU)).toBe(zhihuAdapter);
    expect(registry.getAdapter(PublishPlatformType.CSDN)).toBe(csdnAdapter);
  });

  it('rejects malformed credential payload JSON', async () => {
    await expect(
      registry.getAdapter(PublishPlatformType.WECHAT).validateCredential({
        credentialPayload: 'not-json',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
