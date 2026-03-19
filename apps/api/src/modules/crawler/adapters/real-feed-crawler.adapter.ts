import { Injectable } from '@nestjs/common';
import { normalizeRawFeedPosts } from '../crawler-normalizer';
import type {
  BindingProfile,
  FeedCrawlerAdapter,
  NormalizedPost,
  RawFeedResponse,
} from '../crawler.types';
import { CrawlerAuthError } from '../errors/crawler-adapter.error';
import { XBrowserAutomationService } from '../x-browser-automation.service';
import type {
  RealBrowserCredentialPayload,
  XCookiePayload,
} from '../x-browser.types';

type RealRawPost = RawFeedResponse['posts'][number];

@Injectable()
export class RealFeedCrawlerAdapter implements FeedCrawlerAdapter {
  readonly name = 'real';

  constructor(
    private readonly xBrowserAutomationService: XBrowserAutomationService,
  ) {}

  async validateCredential(payload: string): Promise<BindingProfile> {
    const parsed = this.parseCredential(payload);
    const profile =
      await this.xBrowserAutomationService.validateCredential(parsed);

    return {
      xUserId: profile.xUserId ?? parsed.xUserId,
      username: profile.username ?? parsed.username,
      displayName: profile.displayName ?? parsed.displayName,
      avatarUrl: profile.avatarUrl ?? parsed.avatarUrl,
    };
  }

  fetchRecommendedFeed(payload: string): Promise<RawFeedResponse> {
    const parsed = this.parseCredential(payload);

    return this.xBrowserAutomationService.fetchRecommendedFeed(parsed);
  }

  normalizePosts(raw: RawFeedResponse): Promise<NormalizedPost[]> {
    const normalizedRaw = {
      ...raw,
      posts: raw.posts.map((post) => this.normalizeDomPost(post)),
    } satisfies RawFeedResponse;

    return Promise.resolve(normalizeRawFeedPosts(normalizedRaw));
  }

  private parseCredential(payload: string): RealBrowserCredentialPayload {
    if (!payload.trim()) {
      throw new CrawlerAuthError('Credential payload cannot be empty');
    }

    try {
      const parsed = JSON.parse(
        payload,
      ) as Partial<RealBrowserCredentialPayload>;

      if (typeof parsed !== 'object' || parsed === null) {
        throw new CrawlerAuthError('Credential payload must be a JSON object');
      }

      if (parsed.adapter && parsed.adapter !== 'real') {
        throw new CrawlerAuthError(
          'Real crawler credential must declare adapter as real',
        );
      }

      const cookies = this.normalizeCookies(parsed.cookies);

      if (cookies.length === 0) {
        throw new CrawlerAuthError(
          'Real crawler credential requires captured browser cookies',
        );
      }

      const authTokenCookie = cookies.find(
        (cookie) => cookie.name === 'auth_token',
      )?.value;
      const ct0Cookie = cookies.find((cookie) => cookie.name === 'ct0')?.value;

      return {
        adapter: 'real',
        capturedAt:
          typeof parsed.capturedAt === 'string'
            ? parsed.capturedAt
            : new Date().toISOString(),
        loginUrl:
          typeof parsed.loginUrl === 'string'
            ? parsed.loginUrl
            : 'https://x.com/i/flow/login',
        cookies,
        authToken:
          typeof parsed.authToken === 'string'
            ? parsed.authToken
            : authTokenCookie,
        ct0: typeof parsed.ct0 === 'string' ? parsed.ct0 : ct0Cookie,
        xUserId:
          typeof parsed.xUserId === 'string' ? parsed.xUserId : undefined,
        username:
          typeof parsed.username === 'string' ? parsed.username : undefined,
        displayName:
          typeof parsed.displayName === 'string'
            ? parsed.displayName
            : undefined,
        avatarUrl:
          typeof parsed.avatarUrl === 'string' ? parsed.avatarUrl : undefined,
      };
    } catch (error) {
      if (error instanceof CrawlerAuthError) {
        throw error;
      }

      throw new CrawlerAuthError('Credential payload must be valid JSON');
    }
  }

  private normalizeDomPost(post: RealRawPost): RealRawPost {
    const authorUsername = this.normalizeUsername(post.author.username);
    const authorDisplayName = this.normalizeOptionalString(
      post.author.displayName,
    );
    const authorAvatarUrl = this.normalizeUrl(post.author.avatarUrl);
    const postUrl = this.normalizePostUrl(
      post.postUrl,
      authorUsername,
      post.xPostId,
    );

    return {
      ...post,
      postUrl,
      rawText: post.rawText.trim(),
      language: this.normalizeOptionalString(post.language),
      author: {
        ...post.author,
        username: authorUsername,
        displayName: authorDisplayName,
        avatarUrl: authorAvatarUrl,
      },
      entities: {
        mentions: (post.entities?.mentions ?? [])
          .map((item) => ({
            ...item,
            username: this.normalizeUsername(item.username),
          }))
          .filter((item) => item.username !== 'unknown'),
        hashtags: (post.entities?.hashtags ?? [])
          .map((item) => ({
            ...item,
            tag: this.normalizeOptionalString(item.tag) ?? '',
          }))
          .filter((item) => item.tag.length > 0),
        urls: (post.entities?.urls ?? [])
          .map((item) => ({
            ...item,
            url: this.normalizeUrl(item.url) ?? item.url.trim(),
            displayUrl:
              this.normalizeOptionalString(item.displayUrl) ?? undefined,
          }))
          .filter((item) => item.url.length > 0),
      },
      media: (post.media ?? [])
        .map((item) => ({
          ...item,
          sourceUrl: this.normalizeUrl(item.sourceUrl) ?? item.sourceUrl.trim(),
          previewUrl: this.normalizeUrl(item.previewUrl),
          altText: this.normalizeOptionalString(item.altText),
        }))
        .filter((item) => item.sourceUrl.length > 0),
      rawPayload: post.rawPayload ?? {},
    };
  }

  private normalizeCookies(cookies: unknown): XCookiePayload[] {
    if (!Array.isArray(cookies)) {
      return [];
    }

    return cookies.flatMap((cookie) => {
      if (typeof cookie !== 'object' || cookie === null) {
        return [];
      }

      const candidate = cookie as Partial<XCookiePayload>;

      if (
        typeof candidate.name !== 'string' ||
        typeof candidate.value !== 'string' ||
        typeof candidate.domain !== 'string' ||
        typeof candidate.path !== 'string' ||
        typeof candidate.httpOnly !== 'boolean' ||
        typeof candidate.secure !== 'boolean'
      ) {
        return [];
      }

      return [
        {
          name: candidate.name,
          value: candidate.value,
          domain: candidate.domain,
          path: candidate.path,
          httpOnly: candidate.httpOnly,
          secure: candidate.secure,
          expires:
            typeof candidate.expires === 'number' ? candidate.expires : -1,
          sameSite:
            candidate.sameSite === 'Lax' ||
            candidate.sameSite === 'None' ||
            candidate.sameSite === 'Strict'
              ? candidate.sameSite
              : undefined,
        },
      ];
    });
  }

  private normalizeOptionalString(value?: string | null) {
    if (typeof value !== 'string') {
      return undefined;
    }

    const normalized = value.trim();

    return normalized.length > 0 ? normalized : undefined;
  }

  private normalizeUsername(value?: string | null) {
    const normalized = this.normalizeOptionalString(value)?.replace(/^@+/, '');

    return normalized && normalized.length > 0 ? normalized : 'unknown';
  }

  private normalizeUrl(value?: string | null) {
    const normalized = this.normalizeOptionalString(value);

    if (!normalized) {
      return undefined;
    }

    if (normalized.startsWith('//')) {
      return `https:${normalized}`;
    }

    if (normalized.startsWith('/')) {
      return `https://x.com${normalized}`;
    }

    return normalized;
  }

  private normalizePostUrl(
    value: string,
    username: string,
    xPostId: string,
  ): string {
    const normalized = this.normalizeUrl(value);

    if (normalized) {
      return normalized;
    }

    return `https://x.com/${username}/status/${xPostId}`;
  }
}
