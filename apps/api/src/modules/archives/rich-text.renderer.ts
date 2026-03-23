import {
  type RichTextDocument,
  type RichTextListBlock,
  type RichTextRelationBlock,
  type RichTextNode,
} from './rich-text.converter';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function sanitizeUrl(value: string | undefined) {
  if (!value) {
    return 'about:blank';
  }

  try {
    const url = new URL(value);

    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return escapeHtml(url.toString());
    }
  } catch {
    return 'about:blank';
  }

  return 'about:blank';
}

function renderInlineNode(node: RichTextNode) {
  switch (node.type) {
    case 'text':
      return escapeHtml(node.text);
    case 'mention':
      return `<span data-node-type="mention" data-username="${escapeHtml(node.username)}">${escapeHtml(node.text)}</span>`;
    case 'hashtag':
      return `<span data-node-type="hashtag" data-tag="${escapeHtml(node.tag)}">${escapeHtml(node.text)}</span>`;
    case 'link':
      return `<a data-node-type="link" href="${sanitizeUrl(node.href)}" target="_blank" rel="noreferrer noopener">${escapeHtml(node.text)}</a>`;
  }
}

function renderInlineNodes(nodes: RichTextNode[]) {
  return nodes.map((node) => renderInlineNode(node)).join('');
}

function renderListBlock(block: RichTextListBlock) {
  const tagName = block.ordered ? 'ol' : 'ul';

  return `<${tagName}>${block.items
    .map((item) => `<li>${renderInlineNodes(item)}</li>`)
    .join('')}</${tagName}>`;
}

function getRelationSummary(block: RichTextRelationBlock) {
  const relationLabel =
    block.relationType === 'QUOTE'
      ? '引用帖子'
      : block.relationType === 'REPOST'
        ? '转发帖子'
        : '回复帖子';

  if (!block.targetAuthorUsername) {
    return relationLabel;
  }

  return `${relationLabel} @${escapeHtml(block.targetAuthorUsername)}`;
}

function renderRelationBlock(block: RichTextRelationBlock) {
  const relationLink = block.targetUrl
    ? `<a data-block-link="relation" href="${sanitizeUrl(block.targetUrl)}" target="_blank" rel="noreferrer noopener">查看原帖</a>`
    : '';

  return `<aside data-block-type="relation" data-relation-type="${block.relationType}"><p>${getRelationSummary(block)}</p>${relationLink}</aside>`;
}

export function renderRichTextToHtml(document: RichTextDocument) {
  return document.blocks
    .map((block) => {
      switch (block.type) {
        case 'paragraph':
          return `<p>${renderInlineNodes(block.children)}</p>`;
        case 'heading': {
          const tagName = `h${block.level}`;

          return `<${tagName}>${renderInlineNodes(block.children)}</${tagName}>`;
        }
        case 'list':
          return renderListBlock(block);
        case 'quote':
          return `<blockquote><p>${renderInlineNodes(block.children)}</p></blockquote>`;
        case 'relation':
          return renderRelationBlock(block);
        case 'media': {
          const sourceUrl = sanitizeUrl(block.sourceUrl);
          const previewUrl = sanitizeUrl(block.previewUrl);

          if (block.mediaType === 'VIDEO') {
            return `<figure data-block-type="media" data-media-type="${block.mediaType}"><video src="${sourceUrl}" controls playsinline preload="metadata" poster="${previewUrl}" crossorigin="anonymous"></video></figure>`;
          }

          if (block.mediaType === 'GIF') {
            return `<figure data-block-type="media" data-media-type="${block.mediaType}"><video src="${sourceUrl}" autoplay loop muted playsinline preload="metadata" poster="${previewUrl}" crossorigin="anonymous"></video></figure>`;
          }

          return `<figure data-block-type="media" data-media-type="${block.mediaType}"><img src="${sourceUrl}" alt="" loading="lazy" /></figure>`;
        }
      }
    })
    .join('');
}
