import {
  PublishBindingStatus,
  PublishDraftSourceType,
  PublishDraftStatus,
  PublishJobStatus,
  PublishPlatformType,
} from '@prisma/client';
import { WechatPublishingChannelAdapter } from './wechat-publishing-channel.adapter';

type MockFetchResponseInit = {
  body: string | ArrayBuffer;
  contentType?: string;
  ok?: boolean;
  status?: number;
  statusText?: string;
};

function createJsonResponse(payload: Record<string, unknown>) {
  return createMockResponse({
    body: JSON.stringify(payload),
    contentType: 'application/json',
  });
}

function createBinaryResponse(value: string, contentType = 'image/png') {
  return createMockResponse({
    body: new TextEncoder().encode(value).buffer,
    contentType,
  });
}

function createMockResponse(init: MockFetchResponseInit) {
  const textBody =
    typeof init.body === 'string'
      ? init.body
      : Buffer.from(init.body).toString('utf8');

  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    statusText: init.statusText ?? 'OK',
    headers: {
      get: (name: string) =>
        name.toLowerCase() === 'content-type'
          ? init.contentType ?? 'application/json'
          : null,
    },
    text: jest.fn(async () => textBody),
    arrayBuffer:
      typeof init.body === 'string'
        ? jest.fn(async () => new TextEncoder().encode(init.body).buffer)
        : jest.fn(async () => init.body),
  };
}

describe('WechatPublishingChannelAdapter', () => {
  const originalFetch = global.fetch;
  let adapter: WechatPublishingChannelAdapter;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    adapter = new WechatPublishingChannelAdapter();
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('validates real WeChat API credentials with appId and appSecret', async () => {
    fetchMock
      .mockResolvedValueOnce(
        createJsonResponse({
          access_token: 'access-token-001',
          expires_in: 7200,
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          ip_list: ['101.226.103.0'],
        }),
      );

    const result = await adapter.validateCredential({
      credentialPayload: JSON.stringify({
        appId: 'wx-app-001',
        appSecret: 'wechat-secret-001',
      }),
    });

    expect(result.status).toBe(PublishBindingStatus.ACTIVE);
    expect(result.validationError).toBeNull();
    expect(result.inferredAccountIdentifier).toBe('wx-app-001');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toContain('/cgi-bin/token');
    expect(fetchMock.mock.calls[1]?.[0]).toContain('/cgi-bin/getcallbackip');
  });

  it('falls back to structural validation for legacy cookie-based bindings', async () => {
    const result = await adapter.validateCredential({
      credentialPayload: JSON.stringify({
        appId: 'wx-app-001',
        cookie: 'session=demo',
      }),
    });

    expect(result.status).toBe(PublishBindingStatus.ACTIVE);
    expect(result.validationError).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('publishes a draft through WeChat draft and freepublish APIs', async () => {
    fetchMock
      .mockResolvedValueOnce(createBinaryResponse('cover-image'))
      .mockResolvedValueOnce(
        createJsonResponse({
          url: 'https://mmbiz.qpic.cn/body-001',
        }),
      )
      .mockResolvedValueOnce(createBinaryResponse('cover-image'))
      .mockResolvedValueOnce(
        createJsonResponse({
          media_id: 'thumb-001',
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          media_id: 'draft-media-001',
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          publish_id: 1001,
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          publish_status: 0,
          article_id: 'article-001',
          article_detail: {
            item: [
              {
                article_id: 'article-001',
                article_url: 'https://mp.weixin.qq.com/s/example',
              },
            ],
          },
        }),
      );

    const result = await adapter.publishDraft({
      binding: {
        id: 'binding-001',
        platformType: PublishPlatformType.WECHAT,
        displayName: '公众号主号',
        accountIdentifier: 'gh_demo',
        status: PublishBindingStatus.ACTIVE,
        credentialPayload: {
          accessToken: 'access-token-001',
          author: 'Auto X',
        },
      },
      draft: {
        id: 'draft-001',
        title: '周报发布稿',
        summary: '这里是摘要',
        richTextJson: {
          version: 1,
          blocks: [],
        },
        renderedHtml:
          '<figure><img src="https://cdn.example.com/cover.png" alt="" /></figure><p>正文内容</p><figure><video src="https://cdn.example.com/video.mp4"></video></figure>',
        sourceType: PublishDraftSourceType.REPORT,
        status: PublishDraftStatus.DRAFT,
        tags: [],
      },
    });

    expect(result.status).toBe(PublishJobStatus.SUCCESS);
    expect(result.remotePostId).toBe('1001');
    expect(result.remotePostUrl).toBe('https://mp.weixin.qq.com/s/example');
    expect(result.metadataJson).toMatchObject({
      draftMediaId: 'draft-media-001',
      coverThumbMediaId: 'thumb-001',
      articleId: 'article-001',
      publishStatus: 0,
    });

    const draftRequestBody = JSON.parse(
      String(fetchMock.mock.calls[4]?.[1]?.body),
    ) as {
      articles: Array<{
        content: string;
        thumb_media_id: string;
      }>;
    };

    expect(draftRequestBody.articles[0]?.thumb_media_id).toBe('thumb-001');
    expect(draftRequestBody.articles[0]?.content).toContain(
      'https://mmbiz.qpic.cn/body-001',
    );
    expect(draftRequestBody.articles[0]?.content).toContain('查看原视频');
  });

  it('syncs running publish metadata from WeChat', async () => {
    fetchMock.mockResolvedValueOnce(
      createJsonResponse({
        publish_status: 1,
      }),
    );

    const result = await adapter.syncPublishedMetadata({
      binding: {
        id: 'binding-001',
        platformType: PublishPlatformType.WECHAT,
        displayName: '公众号主号',
        accountIdentifier: 'gh_demo',
        status: PublishBindingStatus.ACTIVE,
        credentialPayload: {
          accessToken: 'access-token-001',
        },
      },
      publishJobId: 'job-001',
      remotePostId: '1002',
      remotePostUrl: null,
    });

    expect(result.status).toBe(PublishJobStatus.RUNNING);
    expect(result.remotePostId).toBe('1002');
    expect(result.metadataJson).toMatchObject({
      publishStatus: 1,
    });
  });
});
