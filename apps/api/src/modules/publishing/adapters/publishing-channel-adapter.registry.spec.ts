import {
  PublishBindingStatus,
  PublishDraftSourceType,
  PublishDraftStatus,
  PublishPlatformType,
} from '@prisma/client';
import {
  BadRequestException,
  NotImplementedException,
} from '@nestjs/common';
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

  it('exposes placeholder publish and sync methods before platform implementations land', async () => {
    const adapter = registry.getAdapter(PublishPlatformType.CSDN);

    await expect(
      adapter.publishDraft({
        binding: {
          id: 'binding-001',
          platformType: PublishPlatformType.CSDN,
          displayName: 'CSDN 博客',
          accountIdentifier: 'csdn-demo',
          status: PublishBindingStatus.ACTIVE,
          credentialPayload: {
            cookie: 'cookie=value',
          },
        },
        draft: {
          id: 'draft-001',
          title: '发布草稿',
          summary: '摘要',
          richTextJson: { version: 1, blocks: [] },
          renderedHtml: '<p>内容</p>',
          sourceType: PublishDraftSourceType.REPORT,
          status: PublishDraftStatus.DRAFT,
          tags: [],
        },
      }),
    ).rejects.toBeInstanceOf(NotImplementedException);

    await expect(
      adapter.syncPublishedMetadata({
        binding: {
          id: 'binding-001',
          platformType: PublishPlatformType.CSDN,
          displayName: 'CSDN 博客',
          accountIdentifier: 'csdn-demo',
          status: PublishBindingStatus.ACTIVE,
          credentialPayload: {
            cookie: 'cookie=value',
          },
        },
        publishJobId: 'job-001',
        remotePostId: 'remote-001',
        remotePostUrl: 'https://blog.csdn.net/demo/article/details/1',
      }),
    ).rejects.toBeInstanceOf(NotImplementedException);
  });

  it('rejects malformed credential payload JSON', async () => {
    await expect(
      registry.getAdapter(PublishPlatformType.WECHAT).validateCredential({
        credentialPayload: 'not-json',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
