import { type MediaType } from '@prisma/client';
import { type NormalizedPost } from '../crawler/crawler.types';

type RichTextNode =
  | {
      text: string;
      type: 'text';
    }
  | {
      tag: string;
      text: string;
      type: 'hashtag';
    }
  | {
      text: string;
      type: 'link';
      href: string;
      displayUrl?: string;
    }
  | {
      text: string;
      type: 'mention';
      username: string;
    };

type RichTextParagraphBlock = {
  children: RichTextNode[];
  type: 'paragraph';
};

type RichTextMediaBlock = {
  height?: number;
  mediaType: MediaType;
  previewUrl?: string;
  sourceUrl: string;
  type: 'media';
  width?: number;
};

export type RichTextDocument = {
  blocks: Array<RichTextParagraphBlock | RichTextMediaBlock>;
  version: 1;
};

type InlineEntity =
  | {
      end: number;
      start: number;
      type: 'hashtag';
      tag: string;
    }
  | {
      displayUrl?: string;
      end: number;
      href: string;
      start: number;
      type: 'link';
    }
  | {
      end: number;
      start: number;
      type: 'mention';
      username: string;
    };

function buildInlineEntities(post: NormalizedPost): InlineEntity[] {
  return [
    ...post.entities.mentions.map(
      (item): InlineEntity => ({
        type: 'mention',
        start: item.start,
        end: item.end,
        username: item.username,
      }),
    ),
    ...post.entities.hashtags.map(
      (item): InlineEntity => ({
        type: 'hashtag',
        start: item.start,
        end: item.end,
        tag: item.tag,
      }),
    ),
    ...post.entities.urls.map(
      (item): InlineEntity => ({
        type: 'link',
        start: item.start,
        end: item.end,
        href: item.url,
        displayUrl: item.displayUrl,
      }),
    ),
  ].sort((left, right) => {
    if (left.start !== right.start) {
      return left.start - right.start;
    }

    return left.end - right.end;
  });
}

function buildParagraphChildren(
  text: string,
  paragraphOffset: number,
  entities: InlineEntity[],
): RichTextNode[] {
  if (text.length === 0) {
    return [{ type: 'text', text: '' }];
  }

  const children: RichTextNode[] = [];
  let cursor = 0;

  for (const entity of entities) {
    const start = entity.start - paragraphOffset;
    const end = entity.end - paragraphOffset;

    if (start < cursor || start < 0 || end > text.length || start >= end) {
      continue;
    }

    if (start > cursor) {
      children.push({
        type: 'text',
        text: text.slice(cursor, start),
      });
    }

    const entityText = text.slice(start, end);

    switch (entity.type) {
      case 'mention':
        children.push({
          type: 'mention',
          text: entityText,
          username: entity.username,
        });
        break;
      case 'hashtag':
        children.push({
          type: 'hashtag',
          text: entityText,
          tag: entity.tag,
        });
        break;
      case 'link':
        children.push({
          type: 'link',
          text: entityText,
          href: entity.href,
          displayUrl: entity.displayUrl,
        });
        break;
    }

    cursor = end;
  }

  if (cursor < text.length) {
    children.push({
      type: 'text',
      text: text.slice(cursor),
    });
  }

  return children.length > 0 ? children : [{ type: 'text', text }];
}

export function convertNormalizedPostToRichText(
  post: NormalizedPost,
): RichTextDocument {
  const inlineEntities = buildInlineEntities(post);
  const blocks: RichTextDocument['blocks'] = [];
  let paragraphOffset = 0;

  for (const line of post.rawText.split('\n')) {
    const paragraphEntities = inlineEntities.filter(
      (entity) =>
        entity.start >= paragraphOffset &&
        entity.end <= paragraphOffset + line.length,
    );

    blocks.push({
      type: 'paragraph',
      children: buildParagraphChildren(
        line,
        paragraphOffset,
        paragraphEntities,
      ),
    });

    paragraphOffset += line.length + 1;
  }

  for (const media of post.media) {
    blocks.push({
      type: 'media',
      mediaType: media.mediaType,
      sourceUrl: media.sourceUrl,
      previewUrl: media.previewUrl,
      width: media.width,
      height: media.height,
    });
  }

  return {
    version: 1,
    blocks,
  };
}
