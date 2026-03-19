import { MediaType, PostType } from '@prisma/client';
import { convertNormalizedPostToRichText } from './rich-text.converter';

describe('convertNormalizedPostToRichText', () => {
  it('converts mentions, hashtags, links, paragraphs and media blocks', () => {
    const rawText = 'Hello @alice check #AI https://openai.com\nSecond line';
    const document = convertNormalizedPostToRichText({
      xPostId: 'post-001',
      postUrl: 'https://x.com/demo/status/post-001',
      postType: PostType.POST,
      author: {
        username: 'demo',
      },
      rawText,
      sourceCreatedAt: '2026-03-19T11:00:00.000Z',
      entities: {
        mentions: [
          {
            username: 'alice',
            start: 6,
            end: 12,
          },
        ],
        hashtags: [
          {
            tag: 'AI',
            start: 19,
            end: 22,
          },
        ],
        urls: [
          {
            url: 'https://openai.com',
            displayUrl: 'openai.com',
            start: 23,
            end: 41,
          },
        ],
      },
      media: [
        {
          mediaType: MediaType.IMAGE,
          sourceUrl: 'https://images.example.com/post-001.png',
          previewUrl: 'https://images.example.com/post-001-preview.png',
          width: 1200,
          height: 675,
        },
      ],
      rawPayloadJson: {
        id: 'post-001',
      },
    });

    expect(document).toEqual({
      version: 1,
      blocks: [
        {
          type: 'paragraph',
          children: [
            { type: 'text', text: 'Hello ' },
            { type: 'mention', text: '@alice', username: 'alice' },
            { type: 'text', text: ' check ' },
            { type: 'hashtag', text: '#AI', tag: 'AI' },
            { type: 'text', text: ' ' },
            {
              type: 'link',
              text: 'https://openai.com',
              href: 'https://openai.com',
              displayUrl: 'openai.com',
            },
          ],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', text: 'Second line' }],
        },
        {
          type: 'media',
          mediaType: MediaType.IMAGE,
          sourceUrl: 'https://images.example.com/post-001.png',
          previewUrl: 'https://images.example.com/post-001-preview.png',
          width: 1200,
          height: 675,
        },
      ],
    });
  });

  it('keeps empty lines as empty paragraphs', () => {
    const document = convertNormalizedPostToRichText({
      xPostId: 'post-002',
      postUrl: 'https://x.com/demo/status/post-002',
      postType: PostType.REPLY,
      author: {
        username: 'demo',
      },
      rawText: 'First line\n\nThird line',
      sourceCreatedAt: '2026-03-19T11:05:00.000Z',
      entities: {
        mentions: [],
        hashtags: [],
        urls: [],
      },
      media: [],
      rawPayloadJson: {
        id: 'post-002',
      },
    });

    expect(document.blocks).toEqual([
      {
        type: 'paragraph',
        children: [{ type: 'text', text: 'First line' }],
      },
      {
        type: 'paragraph',
        children: [{ type: 'text', text: '' }],
      },
      {
        type: 'paragraph',
        children: [{ type: 'text', text: 'Third line' }],
      },
    ]);
  });
});
