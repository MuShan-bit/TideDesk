import { MediaType, PostType } from '@prisma/client';

export type BindingProfile = {
  avatarUrl?: string;
  displayName?: string;
  username?: string;
  xUserId?: string;
};

export type PostEntityRange = {
  end: number;
  start: number;
};

export type PostMentionEntity = PostEntityRange & {
  username: string;
};

export type PostHashtagEntity = PostEntityRange & {
  tag: string;
};

export type PostUrlEntity = PostEntityRange & {
  displayUrl?: string;
  url: string;
};

export type PostEntities = {
  hashtags: PostHashtagEntity[];
  mentions: PostMentionEntity[];
  urls: PostUrlEntity[];
};

export type RawFeedPostAuthor = {
  avatarUrl?: string;
  displayName?: string;
  username: string;
  xUserId?: string;
};

export type RawFeedPostMedia = {
  altText?: string;
  height?: number;
  mediaType: MediaType;
  previewUrl?: string;
  sourceUrl: string;
  width?: number;
};

export type RawFeedPost = {
  author: RawFeedPostAuthor;
  entities?: Partial<PostEntities>;
  language?: string;
  media?: RawFeedPostMedia[];
  metrics?: {
    favoriteCount?: number;
    quoteCount?: number;
    replyCount?: number;
    repostCount?: number;
    viewCount?: bigint | number | string;
  };
  postType: PostType;
  postUrl: string;
  rawPayload?: Record<string, unknown>;
  rawText: string;
  sourceCreatedAt: string;
  xPostId: string;
};

export type RawFeedResponse = {
  adapter: string;
  fetchedAt: string;
  metadata?: Record<string, unknown>;
  posts: RawFeedPost[];
};

export type NormalizedPost = {
  author: RawFeedPostAuthor;
  entities: PostEntities;
  favoriteCount?: number;
  language?: string;
  media: RawFeedPostMedia[];
  postType: PostType;
  postUrl: string;
  quoteCount?: number;
  rawPayloadJson: Record<string, unknown>;
  rawText: string;
  replyCount?: number;
  repostCount?: number;
  sourceCreatedAt: string;
  viewCount?: bigint | string;
  xPostId: string;
};

export interface FeedCrawlerAdapter {
  readonly name: string;

  fetchRecommendedFeed(payload: string): Promise<RawFeedResponse>;
  normalizePosts(raw: RawFeedResponse): Promise<NormalizedPost[]>;
  validateCredential(payload: string): Promise<BindingProfile>;
}
