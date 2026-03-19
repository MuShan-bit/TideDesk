import { Injectable } from '@nestjs/common';
import { normalizeRawFeedPosts } from '../crawler-normalizer';
import type {
  BindingProfile,
  FeedCrawlerAdapter,
  NormalizedPost,
  RawFeedResponse,
} from '../crawler.types';
import {
  CrawlerAuthError,
  CrawlerUnsupportedError,
} from '../errors/crawler-adapter.error';

type RealCredentialPayload = {
  authToken?: string;
  avatarUrl?: string;
  cookie?: string;
  ct0?: string;
  displayName?: string;
  username?: string;
  xUserId?: string;
};

@Injectable()
export class RealFeedCrawlerAdapter implements FeedCrawlerAdapter {
  readonly name = 'real';

  validateCredential(payload: string): Promise<BindingProfile> {
    const parsed = this.parseCredential(payload);

    return Promise.resolve({
      xUserId: parsed.xUserId,
      username: parsed.username,
      displayName: parsed.displayName,
      avatarUrl: parsed.avatarUrl,
    });
  }

  fetchRecommendedFeed(payload: string): Promise<RawFeedResponse> {
    void payload;

    return Promise.reject(
      new CrawlerUnsupportedError(
        'Real feed crawler adapter fetch flow is not wired yet',
      ),
    );
  }

  normalizePosts(raw: RawFeedResponse): Promise<NormalizedPost[]> {
    return Promise.resolve(normalizeRawFeedPosts(raw));
  }

  private parseCredential(payload: string): RealCredentialPayload {
    if (!payload.trim()) {
      throw new CrawlerAuthError('Credential payload cannot be empty');
    }

    try {
      const parsed = JSON.parse(payload) as RealCredentialPayload;

      if (typeof parsed !== 'object' || parsed === null) {
        throw new CrawlerAuthError('Credential payload must be a JSON object');
      }

      if (
        typeof parsed.cookie !== 'string' &&
        typeof parsed.authToken !== 'string'
      ) {
        throw new CrawlerAuthError(
          'Real crawler credential requires cookie or authToken',
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
}
