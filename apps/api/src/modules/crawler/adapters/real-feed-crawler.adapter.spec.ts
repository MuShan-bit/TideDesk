import { MediaType, PostType } from '@prisma/client';
import type { BindingProfile, RawFeedResponse } from '../crawler.types';
import { XBrowserAutomationService } from '../x-browser-automation.service';
import { RealFeedCrawlerAdapter } from './real-feed-crawler.adapter';

describe('RealFeedCrawlerAdapter', () => {
  const payload = {
    adapter: 'real' as const,
    authToken: 'auth-token-demo',
    avatarUrl: 'https://images.example.com/browser-owner.png',
    capturedAt: '2026-03-19T00:00:00.000Z',
    cookies: [
      {
        domain: '.x.com',
        expires: -1,
        httpOnly: true,
        name: 'auth_token',
        path: '/',
        sameSite: 'Lax' as const,
        secure: true,
        value: 'auth-token-demo',
      },
    ],
    ct0: 'ct0-demo',
    displayName: 'Browser Owner',
    loginUrl: 'https://x.com/i/flow/login',
    username: 'browser_owner',
    xUserId: 'x-browser-001',
  };

  it('delegates real feed fetching to browser automation with parsed payload', async () => {
    const expectedResponse = {
      adapter: 'real',
      fetchedAt: '2026-03-19T00:00:00.000Z',
      posts: [],
    } satisfies RawFeedResponse;
    const fetchRecommendedFeed = jest.fn().mockResolvedValue(expectedResponse);
    const validateCredential = jest.fn();
    const browserAutomationService = {
      fetchRecommendedFeed,
      validateCredential,
    } as unknown as XBrowserAutomationService;
    const adapter = new RealFeedCrawlerAdapter(browserAutomationService);

    const rawFeed = await adapter.fetchRecommendedFeed(JSON.stringify(payload));

    expect(fetchRecommendedFeed).toHaveBeenCalledWith(payload);
    expect(validateCredential).not.toHaveBeenCalled();
    expect(rawFeed).toEqual(expectedResponse);
  });

  it('validates real credentials through browser automation and merges fallback profile fields', async () => {
    const validateCredential = jest.fn().mockResolvedValue({
      username: 'validated_owner',
      displayName: 'Validated Owner',
    } satisfies BindingProfile);
    const browserAutomationService = {
      fetchRecommendedFeed: jest.fn(),
      validateCredential,
    } as unknown as XBrowserAutomationService;
    const adapter = new RealFeedCrawlerAdapter(browserAutomationService);

    const profile = await adapter.validateCredential(JSON.stringify(payload));

    expect(validateCredential).toHaveBeenCalledWith(payload);
    expect(profile).toEqual({
      xUserId: 'x-browser-001',
      username: 'validated_owner',
      displayName: 'Validated Owner',
      avatarUrl: 'https://images.example.com/browser-owner.png',
    });
  });

  it('normalizes DOM-shaped raw posts into stable archive input', async () => {
    const browserAutomationService = {
      fetchRecommendedFeed: jest.fn(),
      validateCredential: jest.fn(),
    } as unknown as XBrowserAutomationService;
    const adapter = new RealFeedCrawlerAdapter(browserAutomationService);
    const rawFeed = {
      adapter: 'real',
      fetchedAt: '2026-03-19T00:00:00.000Z',
      posts: [
        {
          xPostId: 'post-001',
          postUrl: '/browser_owner/status/post-001',
          postType: PostType.POST,
          author: {
            username: ' @browser_owner ',
            displayName: ' Browser Owner ',
            avatarUrl: '//images.example.com/browser-owner.png',
          },
          rawText: '  hello world  ',
          sourceCreatedAt: '2026-03-19T00:00:00.000Z',
          language: ' en ',
          entities: {
            mentions: [
              {
                username: ' @friend ',
                start: 0,
                end: 7,
              },
            ],
            hashtags: [
              {
                tag: ' DemoTag ',
                start: 8,
                end: 16,
              },
            ],
            urls: [
              {
                url: '//example.com/demo',
                displayUrl: ' example.com/demo ',
                start: 17,
                end: 35,
              },
            ],
          },
          media: [
            {
              mediaType: MediaType.IMAGE,
              sourceUrl: '//images.example.com/post-001.png',
              previewUrl: '/media/post-001-preview.png',
              altText: ' preview ',
            },
          ],
          metrics: {
            viewCount: 42,
          },
          rawPayload: undefined,
        },
      ],
    } satisfies RawFeedResponse;

    const posts = await adapter.normalizePosts(rawFeed);

    expect(posts).toEqual([
      expect.objectContaining({
        xPostId: 'post-001',
        postUrl: 'https://x.com/browser_owner/status/post-001',
        rawText: 'hello world',
        language: 'en',
        author: {
          username: 'browser_owner',
          displayName: 'Browser Owner',
          avatarUrl: 'https://images.example.com/browser-owner.png',
        },
        entities: {
          mentions: [
            {
              username: 'friend',
              start: 0,
              end: 7,
            },
          ],
          hashtags: [
            {
              tag: 'DemoTag',
              start: 8,
              end: 16,
            },
          ],
          urls: [
            {
              url: 'https://example.com/demo',
              displayUrl: 'example.com/demo',
              start: 17,
              end: 35,
            },
          ],
        },
        media: [
          {
            mediaType: MediaType.IMAGE,
            sourceUrl: 'https://images.example.com/post-001.png',
            previewUrl: 'https://x.com/media/post-001-preview.png',
            altText: 'preview',
          },
        ],
        viewCount: BigInt(42),
        rawPayloadJson: {},
      }),
    ]);
  });
});
