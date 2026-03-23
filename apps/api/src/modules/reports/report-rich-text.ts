import { type Prisma } from '@prisma/client';
import {
  type RichTextDocument,
  type RichTextMediaBlock,
  type RichTextNode,
} from '../archives/rich-text.converter';
import { renderRichTextToHtml } from '../archives/rich-text.renderer';

const MARKDOWN_LINK_PATTERN = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
const IMAGE_MARKDOWN_PATTERN = /^!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)$/i;
const IMAGE_LABEL_PATTERN = /^图片链接[:：]\s*(https?:\/\/\S+)$/i;
const VIDEO_LABEL_PATTERN = /^视频链接[:：]\s*(https?:\/\/\S+)$/i;
const HEADING_PATTERN = /^(#{1,3})\s+(.+)$/;
const ORDERED_LIST_PATTERN = /^\d+\.\s+(.+)$/;
const UNORDERED_LIST_PATTERN = /^[-*]\s+(.+)$/;
const QUOTE_PATTERN = /^>\s?(.+)$/;

export function buildReportRichTextFromPlainText(bodyText: string) {
  const normalizedBodyText = bodyText
    .replaceAll('\r\n', '\n')
    .replaceAll('\r', '\n')
    .trim();
  const richTextJson = buildStructuredRichTextDocument(normalizedBodyText);

  return {
    richTextJson: richTextJson satisfies Prisma.InputJsonValue,
    renderedHtml: renderRichTextToHtml(richTextJson),
  };
}

function buildStructuredRichTextDocument(bodyText: string): RichTextDocument {
  const lines = bodyText.length > 0 ? bodyText.split('\n') : [];
  const blocks: RichTextDocument['blocks'] = [];
  let index = 0;

  while (index < lines.length) {
    const currentLine = lines[index]?.trim() ?? '';

    if (currentLine.length === 0) {
      index += 1;
      continue;
    }

    const mediaBlock = tryBuildMediaBlock(currentLine);

    if (mediaBlock) {
      blocks.push(mediaBlock);
      index += 1;
      continue;
    }

    const headingMatch = currentLine.match(HEADING_PATTERN);

    if (headingMatch) {
      const level = Math.min(headingMatch[1]?.length ?? 1, 3) as 1 | 2 | 3;
      const headingText = headingMatch[2]?.trim() ?? '';

      blocks.push({
        type: 'heading',
        level,
        children: buildInlineChildren(headingText),
      });
      index += 1;
      continue;
    }

    const listBlock = tryBuildListBlock(lines, index);

    if (listBlock) {
      blocks.push(listBlock.block);
      index = listBlock.nextIndex;
      continue;
    }

    const quoteBlock = tryBuildQuoteBlock(lines, index);

    if (quoteBlock) {
      blocks.push(quoteBlock.block);
      index = quoteBlock.nextIndex;
      continue;
    }

    const paragraphBlock = buildParagraphBlock(lines, index);

    blocks.push(paragraphBlock.block);
    index = paragraphBlock.nextIndex;
  }

  return {
    version: 1,
    blocks:
      blocks.length > 0
        ? blocks
        : [
            {
              type: 'paragraph',
              children: [{ type: 'text', text: '' }],
            },
          ],
  };
}

function tryBuildMediaBlock(line: string): RichTextMediaBlock | null {
  const markdownMatch = line.match(IMAGE_MARKDOWN_PATTERN);
  const imageMatch = line.match(IMAGE_LABEL_PATTERN);
  const videoMatch = line.match(VIDEO_LABEL_PATTERN);
  const mediaUrl =
    markdownMatch?.[1] ?? imageMatch?.[1] ?? videoMatch?.[1] ?? null;

  if (!mediaUrl) {
    return null;
  }

  return {
    type: 'media',
    mediaType: videoMatch ? 'VIDEO' : 'IMAGE',
    sourceUrl: mediaUrl,
    previewUrl: mediaUrl,
  };
}

function tryBuildListBlock(lines: string[], startIndex: number) {
  const firstLine = lines[startIndex]?.trim() ?? '';
  const orderedMatch = firstLine.match(ORDERED_LIST_PATTERN);
  const unorderedMatch = firstLine.match(UNORDERED_LIST_PATTERN);

  if (!orderedMatch && !unorderedMatch) {
    return null;
  }

  const ordered = Boolean(orderedMatch);
  const items: RichTextNode[][] = [];
  let index = startIndex;

  while (index < lines.length) {
    const line = lines[index]?.trim() ?? '';
    const match = ordered
      ? line.match(ORDERED_LIST_PATTERN)
      : line.match(UNORDERED_LIST_PATTERN);

    if (!match) {
      break;
    }

    items.push(buildInlineChildren(match[1]?.trim() ?? ''));
    index += 1;
  }

  return {
    block: {
      type: 'list' as const,
      ordered,
      items,
    },
    nextIndex: index,
  };
}

function tryBuildQuoteBlock(lines: string[], startIndex: number) {
  const firstLine = lines[startIndex]?.trim() ?? '';

  if (!QUOTE_PATTERN.test(firstLine)) {
    return null;
  }

  const quotedLines: string[] = [];
  let index = startIndex;

  while (index < lines.length) {
    const line = lines[index]?.trim() ?? '';
    const match = line.match(QUOTE_PATTERN);

    if (!match) {
      break;
    }

    quotedLines.push(match[1]?.trim() ?? '');
    index += 1;
  }

  return {
    block: {
      type: 'quote' as const,
      children: buildInlineChildren(quotedLines.join(' ')),
    },
    nextIndex: index,
  };
}

function buildParagraphBlock(lines: string[], startIndex: number) {
  const paragraphLines: string[] = [];
  let index = startIndex;

  while (index < lines.length) {
    const line = lines[index]?.trim() ?? '';

    if (line.length === 0) {
      break;
    }

    if (
      tryBuildMediaBlock(line) ||
      line.match(HEADING_PATTERN) ||
      line.match(ORDERED_LIST_PATTERN) ||
      line.match(UNORDERED_LIST_PATTERN) ||
      line.match(QUOTE_PATTERN)
    ) {
      break;
    }

    paragraphLines.push(line);
    index += 1;
  }

  return {
    block: {
      type: 'paragraph' as const,
      children: buildInlineChildren(paragraphLines.join(' ')),
    },
    nextIndex: index === startIndex ? startIndex + 1 : index,
  };
}

function buildInlineChildren(text: string): RichTextNode[] {
  if (text.length === 0) {
    return [{ type: 'text', text: '' }];
  }

  const children: RichTextNode[] = [];
  let cursor = 0;

  for (const match of text.matchAll(MARKDOWN_LINK_PATTERN)) {
    const linkText = match[1];
    const href = match[2];
    const matchIndex = match.index ?? -1;

    if (!linkText || !href || matchIndex < cursor) {
      continue;
    }

    if (matchIndex > cursor) {
      children.push({
        type: 'text',
        text: text.slice(cursor, matchIndex),
      });
    }

    children.push({
      type: 'link',
      text: linkText,
      href,
    });

    cursor = matchIndex + match[0].length;
  }

  if (cursor < text.length) {
    children.push({
      type: 'text',
      text: text.slice(cursor),
    });
  }

  return children.length > 0 ? children : [{ type: 'text', text }];
}
