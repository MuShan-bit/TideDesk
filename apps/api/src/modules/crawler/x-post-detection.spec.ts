import { PostType } from '@prisma/client';
import {
  detectPostType,
  findQuotedStatusHref,
  inferRelations,
  normalizeStatusHref,
  parseStatusHref,
  type PostDetectionSnapshot,
} from './x-post-detection';

describe('x-post-detection', () => {
  function createSnapshot(
    overrides: Partial<PostDetectionSnapshot> = {},
  ): PostDetectionSnapshot {
    return {
      hasSocialContext: false,
      permalink: 'https://x.com/alice/status/123',
      rawText: 'hello world',
      statusLinkCandidates: [],
      timeElementCount: 1,
      tweetTextCount: 1,
      userNameBlockCount: 1,
      xPostId: '123',
      ...overrides,
    };
  }

  it('normalizes relative status hrefs to x.com urls', () => {
    expect(normalizeStatusHref('/alice/status/123?foo=1#bar')).toBe(
      'https://x.com/alice/status/123',
    );
  });

  it('parses target author and post id from normalized status hrefs', () => {
    expect(parseStatusHref('/alice/status/123?foo=1')).toEqual({
      targetUrl: 'https://x.com/alice/status/123',
      targetAuthorUsername: 'alice',
      targetXPostId: '123',
    });
  });

  it('ignores duplicate self status links when finding a quoted target', () => {
    const snapshot = createSnapshot({
      statusLinkCandidates: [
        {
          href: '/alice/status/123',
          resolvedUrl: 'https://x.com/alice/status/123',
          hasTimeElement: true,
        },
        {
          href: '/alice/status/123',
          resolvedUrl: 'https://x.com/alice/status/123',
        },
      ],
    });

    expect(findQuotedStatusHref(snapshot)).toBeUndefined();
    expect(detectPostType(snapshot)).toBe(PostType.POST);
  });

  it('classifies a post as quote only when a distinct quoted status exists', () => {
    const snapshot = createSnapshot({
      statusLinkCandidates: [
        {
          href: '/alice/status/123',
          resolvedUrl: 'https://x.com/alice/status/123',
          hasTimeElement: true,
        },
        {
          href: '/bob/status/456',
          resolvedUrl: 'https://x.com/bob/status/456',
          isInNestedTweet: true,
          hasTimeElement: true,
        },
      ],
      timeElementCount: 2,
      userNameBlockCount: 2,
    });

    expect(findQuotedStatusHref(snapshot)).toBe('https://x.com/bob/status/456');
    expect(detectPostType(snapshot)).toBe(PostType.QUOTE);
    expect(
      inferRelations({
        entities: {
          mentions: [],
          hashtags: [],
          urls: [],
        },
        permalink: snapshot.permalink,
        postType: PostType.QUOTE,
        snapshot,
        username: 'alice',
        xPostId: snapshot.xPostId,
      }),
    ).toEqual([
      {
        relationType: 'QUOTE',
        targetUrl: 'https://x.com/bob/status/456',
        targetAuthorUsername: 'bob',
        targetXPostId: '456',
      },
    ]);
  });

  it('does not treat a stray status link as a quote without quote-card signals', () => {
    const snapshot = createSnapshot({
      statusLinkCandidates: [
        {
          href: '/charlie/status/789',
          resolvedUrl: 'https://x.com/charlie/status/789',
        },
      ],
    });

    expect(findQuotedStatusHref(snapshot)).toBeUndefined();
    expect(detectPostType(snapshot)).toBe(PostType.POST);
  });

  it('still detects replies when the post text starts with a mention', () => {
    const snapshot = createSnapshot({
      rawText: '@bob thanks for the tip',
    });

    expect(detectPostType(snapshot)).toBe(PostType.REPLY);
  });
});
