import { Injectable } from '@nestjs/common';
import { MediaType, PostType } from '@prisma/client';
import { normalizeRawFeedPosts } from '../crawler-normalizer';
import { retryCrawlerOperation } from '../crawler-retry';
import type {
  BindingProfile,
  FeedCrawlerAdapter,
  NormalizedPost,
  RawFeedResponse,
} from '../crawler.types';
import {
  CrawlerAuthError,
  CrawlerNetworkError,
  CrawlerRateLimitError,
  CrawlerStructureChangedError,
} from '../errors/crawler-adapter.error';

type MockFailureMode = 'AUTH' | 'NETWORK' | 'RATE_LIMIT' | 'STRUCTURE_CHANGED';

type MockCredentialPayload = {
  avatarUrl?: string;
  cookie?: string;
  displayName?: string;
  failTimes?: number;
  failureMode?: MockFailureMode;
  username?: string;
  xUserId?: string;
};

@Injectable()
export class MockFeedCrawlerAdapter implements FeedCrawlerAdapter {
  readonly name = 'mock';

  validateCredential(payload: string): Promise<BindingProfile> {
    const parsed = this.parseCredential(payload);

    if (parsed.failureMode === 'AUTH') {
      return Promise.reject(
        new CrawlerAuthError('Mock crawler rejected the credential'),
      );
    }

    return Promise.resolve({
      xUserId: parsed.xUserId,
      username: parsed.username,
      displayName: parsed.displayName,
      avatarUrl: parsed.avatarUrl,
    });
  }

  async fetchRecommendedFeed(payload: string): Promise<RawFeedResponse> {
    const profile = await this.validateCredential(payload);
    const parsed = this.parseCredential(payload);
    let attempt = 0;

    return retryCrawlerOperation(
      () => {
        attempt += 1;
        this.throwMockFailure(parsed, attempt);

        return this.buildMockResponse(profile, attempt);
      },
      {
        baseDelayMs: 0,
      },
    );
  }

  normalizePosts(raw: RawFeedResponse): Promise<NormalizedPost[]> {
    return Promise.resolve(normalizeRawFeedPosts(raw));
  }

  private parseCredential(payload: string): MockCredentialPayload {
    if (!payload.trim()) {
      throw new CrawlerAuthError('Credential payload cannot be empty');
    }

    try {
      const parsed = JSON.parse(payload) as MockCredentialPayload;

      if (typeof parsed !== 'object' || parsed === null) {
        throw new CrawlerAuthError('Credential payload must be a JSON object');
      }

      if (
        typeof parsed.cookie !== 'string' &&
        typeof parsed.username !== 'string' &&
        typeof parsed.xUserId !== 'string'
      ) {
        throw new CrawlerAuthError(
          'Mock credential requires at least cookie, username or xUserId',
        );
      }

      return parsed;
    } catch (error) {
      if (error instanceof CrawlerAuthError) {
        throw error;
      }

      throw new CrawlerAuthError('Credential payload must be valid JSON');
    }
  }

  private buildMockResponse(
    profile: BindingProfile,
    attempt: number,
  ): RawFeedResponse {
    const now = new Date().toISOString();

    return {
      adapter: this.name,
      fetchedAt: now,
      metadata: {
        attempts: attempt,
        source: 'mock',
        username: profile.username ?? 'mock_user',
      },
      posts: [
        {
          xPostId: 'mock-post-001',
          postUrl: 'https://x.com/mock_user/status/mock-post-001',
          postType: PostType.POST,
          author: {
            xUserId: 'x_author_001',
            username: 'openai_news',
            displayName: 'OpenAI Newsroom',
            avatarUrl: 'https://images.example.com/openai-newsroom.png',
          },
          rawText:
            'GPT-5.4 release notes are live. This mock post helps us verify archive flows.',
          sourceCreatedAt: now,
          language: 'en',
          entities: {
            mentions: [],
            hashtags: [{ tag: 'AI', start: 0, end: 3 }],
            urls: [
              {
                url: 'https://openai.com',
                displayUrl: 'openai.com',
                start: 42,
                end: 60,
              },
            ],
          },
          media: [
            {
              mediaType: MediaType.IMAGE,
              sourceUrl: 'https://images.example.com/mock-post-001.png',
              previewUrl:
                'https://images.example.com/mock-post-001-preview.png',
              width: 1200,
              height: 675,
              altText: 'Mock preview image',
            },
          ],
          metrics: {
            replyCount: 12,
            repostCount: 34,
            quoteCount: 3,
            favoriteCount: 256,
            viewCount: 2048,
          },
          rawPayload: {
            id: 'mock-post-001',
            adapter: this.name,
          },
        },
        {
          xPostId: 'mock-post-002',
          postUrl: 'https://x.com/mock_user/status/mock-post-002',
          postType: PostType.QUOTE,
          author: {
            xUserId: 'x_author_002',
            username: 'product_updates',
            displayName: 'Product Updates',
          },
          rawText:
            'Quoting a trend observation from the recommendation feed for pagination testing.',
          sourceCreatedAt: now,
          language: 'en',
          entities: {
            mentions: [{ username: 'openai_news', start: 8, end: 20 }],
            hashtags: [],
            urls: [],
          },
          media: [],
          metrics: {
            replyCount: 2,
            repostCount: 5,
            quoteCount: 1,
            favoriteCount: 18,
            viewCount: 320,
          },
          rawPayload: {
            id: 'mock-post-002',
            adapter: this.name,
          },
        },
      ],
    };
  }

  private throwMockFailure(payload: MockCredentialPayload, attempt: number) {
    const maxFailures = payload.failTimes ?? Number.POSITIVE_INFINITY;

    if (!payload.failureMode || attempt > maxFailures) {
      return;
    }

    switch (payload.failureMode) {
      case 'AUTH':
        return;
      case 'NETWORK':
        throw new CrawlerNetworkError(
          `Mock crawler network failure on attempt ${attempt}`,
        );
      case 'RATE_LIMIT':
        throw new CrawlerRateLimitError(
          `Mock crawler rate limited on attempt ${attempt}`,
          0,
        );
      case 'STRUCTURE_CHANGED':
        throw new CrawlerStructureChangedError(
          'Mock crawler detected an unsupported upstream response shape',
        );
    }
  }
}
