import {
  PublishBindingStatus,
  PublishDraftSourceType,
  PublishDraftStatus,
  PublishJobStatus,
  PublishPlatformType,
} from '@prisma/client';
import { ZhihuPublishingChannelAdapter } from './zhihu-publishing-channel.adapter';

describe('ZhihuPublishingChannelAdapter', () => {
  let adapter: ZhihuPublishingChannelAdapter;

  beforeEach(() => {
    adapter = new ZhihuPublishingChannelAdapter();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses real browser validation when cookie credentials are provided', async () => {
    const fakeSession = {
      browser: {} as never,
      context: {} as never,
      page: {
        url: () => 'https://www.zhihu.com/creator',
      } as never,
    };

    jest
      .spyOn(adapter as never, 'createAuthenticatedSession')
      .mockResolvedValue(fakeSession);
    jest
      .spyOn(adapter as never, 'extractAuthenticatedAccountIdentifier')
      .mockResolvedValue('zhihu-demo-user');
    jest.spyOn(adapter as never, 'closeSession').mockResolvedValue(undefined);

    const result = await adapter.validateCredential({
      credentialPayload: JSON.stringify({
        cookie: 'z_c0=demo; d_c0=demo',
      }),
    });

    expect(result.status).toBe(PublishBindingStatus.ACTIVE);
    expect(result.validationError).toBeNull();
    expect(result.inferredAccountIdentifier).toBe('zhihu-demo-user');
  });

  it('falls back to structural validation for non-cookie payloads', async () => {
    const createSessionSpy = jest.spyOn(
      adapter as never,
      'createAuthenticatedSession',
    );

    const result = await adapter.validateCredential({
      credentialPayload: JSON.stringify({
        account: 'zhihu-column-demo',
      }),
    });

    expect(result.status).toBe(PublishBindingStatus.ACTIVE);
    expect(result.inferredAccountIdentifier).toBe('zhihu-column-demo');
    expect(createSessionSpy).not.toHaveBeenCalled();
  });

  it('publishes a draft through the browser automation workflow', async () => {
    const fakePage = {
      title: jest.fn(async () => '发布后的知乎文章'),
      url: jest.fn(() => 'https://zhuanlan.zhihu.com/p/123456789'),
    } as never;
    const fakeSession = {
      browser: {} as never,
      context: {} as never,
      page: fakePage,
    };

    jest
      .spyOn(adapter as never, 'createAuthenticatedSession')
      .mockResolvedValue(fakeSession);
    jest.spyOn(adapter as never, 'waitForEditorReady').mockResolvedValue(undefined);
    jest.spyOn(adapter as never, 'fillDraftTitle').mockResolvedValue(undefined);
    jest.spyOn(adapter as never, 'fillDraftBody').mockResolvedValue(undefined);
    jest
      .spyOn(adapter as never, 'attachNetworkCapture')
      .mockReturnValue([] as never);
    jest
      .spyOn(adapter as never, 'clickPrimaryPublishButton')
      .mockResolvedValue(undefined);
    jest
      .spyOn(adapter as never, 'completeOptionalPublishDialog')
      .mockResolvedValue(undefined);
    jest.spyOn(adapter as never, 'closeSession').mockResolvedValue(undefined);
    jest
      .spyOn(adapter as never, 'waitForPublishedResult')
      .mockResolvedValue({
        remotePostId: '123456789',
        remotePostUrl: 'https://zhuanlan.zhihu.com/p/123456789',
        status: PublishJobStatus.SUCCESS,
        metadataJson: {
          source: 'page-url',
        },
      });

    const result = await adapter.publishDraft({
      binding: {
        id: 'binding-001',
        platformType: PublishPlatformType.ZHIHU,
        displayName: '知乎专栏',
        accountIdentifier: 'zhihu-demo-user',
        status: PublishBindingStatus.ACTIVE,
        credentialPayload: {
          cookie: 'z_c0=demo; d_c0=demo',
        },
      },
      draft: {
        id: 'draft-001',
        title: 'AI 周报整理',
        summary: '这里是摘要',
        renderedHtml: '<p>正文内容</p>',
        richTextJson: {
          version: 1,
          blocks: [],
        },
        sourceType: PublishDraftSourceType.REPORT,
        status: PublishDraftStatus.DRAFT,
        tags: [
          {
            id: 'tag-001',
            name: 'AI',
            slug: 'ai',
            color: null,
          },
        ],
      },
    });

    expect(result.status).toBe(PublishJobStatus.SUCCESS);
    expect(result.remotePostId).toBe('123456789');
    expect(result.remotePostUrl).toBe(
      'https://zhuanlan.zhihu.com/p/123456789',
    );
    expect(result.metadataJson).toMatchObject({
      source: 'page-url',
    });
  });

  it('confirms published article metadata from the article page', async () => {
    const fakeSession = {
      browser: {} as never,
      context: {} as never,
      page: {
        title: jest.fn(async () => '知乎文章标题'),
        url: jest.fn(() => 'https://zhuanlan.zhihu.com/p/99887766'),
      } as never,
    };

    jest
      .spyOn(adapter as never, 'createAuthenticatedSession')
      .mockResolvedValue(fakeSession);
    jest.spyOn(adapter as never, 'isArticlePage').mockResolvedValue(true);
    jest.spyOn(adapter as never, 'closeSession').mockResolvedValue(undefined);

    const result = await adapter.syncPublishedMetadata({
      binding: {
        id: 'binding-001',
        platformType: PublishPlatformType.ZHIHU,
        displayName: '知乎专栏',
        accountIdentifier: 'zhihu-demo-user',
        status: PublishBindingStatus.ACTIVE,
        credentialPayload: {
          cookie: 'z_c0=demo; d_c0=demo',
        },
      },
      publishJobId: 'job-001',
      remotePostId: '99887766',
      remotePostUrl: 'https://zhuanlan.zhihu.com/p/99887766',
    });

    expect(result.status).toBe(PublishJobStatus.SUCCESS);
    expect(result.remotePostId).toBe('99887766');
    expect(result.remotePostUrl).toBe(
      'https://zhuanlan.zhihu.com/p/99887766',
    );
    expect(result.metadataJson).toMatchObject({
      pageTitle: '知乎文章标题',
    });
  });
});
