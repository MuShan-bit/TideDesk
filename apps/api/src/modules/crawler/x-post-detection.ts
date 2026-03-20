import type { PostType } from '@prisma/client';
import type { PostEntities } from './crawler.types';

const X_ORIGIN = 'https://x.com';

export type StatusLinkCandidate = {
  href?: string | null;
  resolvedUrl?: string | null;
  hasTimeElement?: boolean;
  isInNestedTweet?: boolean;
};

export type PostDetectionSnapshot = {
  hasSocialContext: boolean;
  permalink: string;
  rawText: string;
  statusLinkCandidates: StatusLinkCandidate[];
  timeElementCount: number;
  tweetTextCount: number;
  userNameBlockCount: number;
  xPostId: string;
};

type ParsedStatusHref = {
  targetAuthorUsername?: string;
  targetUrl?: string;
  targetXPostId?: string;
};

export function normalizeStatusHref(
  href?: string | null,
  origin = X_ORIGIN,
): string | undefined {
  if (typeof href !== 'string') {
    return undefined;
  }

  const normalized = href.trim();

  if (!normalized) {
    return undefined;
  }

  try {
    const url = new URL(normalized, origin);
    url.hash = '';
    url.search = '';

    return url.toString();
  } catch {
    return undefined;
  }
}

export function parseStatusHref(
  href?: string | null,
  origin = X_ORIGIN,
): ParsedStatusHref {
  const normalizedHref = normalizeStatusHref(href, origin);

  if (!normalizedHref) {
    return {};
  }

  const match = normalizedHref.match(/\/([^/?]+)\/status\/([^/?]+)/);

  if (!match) {
    return {
      targetUrl: normalizedHref,
    };
  }

  return {
    targetUrl: normalizedHref,
    targetAuthorUsername: match[1],
    targetXPostId: match[2],
  };
}

function hasQuoteCardSignals(snapshot: PostDetectionSnapshot) {
  return (
    snapshot.timeElementCount > 1 ||
    snapshot.tweetTextCount > 1 ||
    snapshot.userNameBlockCount > 1
  );
}

export function findQuotedStatusHref(snapshot: PostDetectionSnapshot) {
  const canonicalPermalink = normalizeStatusHref(snapshot.permalink);
  const quoteCardSignalsPresent = hasQuoteCardSignals(snapshot);
  const seen = new Set<string>();

  for (const candidate of snapshot.statusLinkCandidates) {
    const resolvedHref = normalizeStatusHref(
      candidate.resolvedUrl ?? candidate.href,
    );

    if (!resolvedHref || seen.has(resolvedHref)) {
      continue;
    }

    seen.add(resolvedHref);

    const parsed = parseStatusHref(resolvedHref);

    if (
      (canonicalPermalink && resolvedHref === canonicalPermalink) ||
      (parsed.targetXPostId && parsed.targetXPostId === snapshot.xPostId)
    ) {
      continue;
    }

    if (
      candidate.isInNestedTweet ||
      candidate.hasTimeElement ||
      quoteCardSignalsPresent
    ) {
      return resolvedHref;
    }
  }

  return undefined;
}

export function detectPostType(snapshot: PostDetectionSnapshot): PostType {
  if (snapshot.hasSocialContext) {
    return 'REPOST';
  }

  if (findQuotedStatusHref(snapshot)) {
    return 'QUOTE';
  }

  if (snapshot.rawText.trim().startsWith('@')) {
    return 'REPLY';
  }

  return 'POST';
}

export function inferRelations(args: {
  entities: PostEntities;
  permalink: string;
  postType: PostType;
  snapshot: PostDetectionSnapshot;
  username: string;
  xPostId: string;
}) {
  if (args.postType === 'QUOTE') {
    const quotedStatusHref = findQuotedStatusHref(args.snapshot);

    if (!quotedStatusHref) {
      return [];
    }

    return [
      {
        relationType: 'QUOTE' as const,
        ...parseStatusHref(quotedStatusHref),
      },
    ];
  }

  if (args.postType === 'REPLY') {
    return [
      {
        relationType: 'REPLY' as const,
        targetAuthorUsername: args.entities.mentions[0]?.username,
      },
    ];
  }

  if (args.postType === 'REPOST') {
    return [
      {
        relationType: 'REPOST' as const,
        targetXPostId: args.xPostId,
        targetUrl: args.permalink,
        targetAuthorUsername: args.username,
      },
    ];
  }

  return [];
}
