import type {
  NormalizedPost,
  PostEntities,
  RawFeedResponse,
} from './crawler.types';

function normalizeEntities(
  entities: RawFeedResponse['posts'][number]['entities'],
): PostEntities {
  return {
    mentions: entities?.mentions ?? [],
    hashtags: entities?.hashtags ?? [],
    urls: entities?.urls ?? [],
  };
}

export function normalizeRawFeedPosts(raw: RawFeedResponse): NormalizedPost[] {
  return raw.posts.map((post) => ({
    xPostId: post.xPostId,
    postUrl: post.postUrl,
    postType: post.postType,
    author: post.author,
    rawText: post.rawText,
    sourceCreatedAt: post.sourceCreatedAt,
    language: post.language,
    entities: normalizeEntities(post.entities),
    media: post.media ?? [],
    replyCount: post.metrics?.replyCount,
    repostCount: post.metrics?.repostCount,
    quoteCount: post.metrics?.quoteCount,
    favoriteCount: post.metrics?.favoriteCount,
    viewCount:
      typeof post.metrics?.viewCount === 'number'
        ? BigInt(post.metrics.viewCount)
        : post.metrics?.viewCount,
    rawPayloadJson: post.rawPayload ?? {},
  }));
}
