import { type Prisma } from '@prisma/client';
import { type RichTextDocument } from '../archives/rich-text.converter';
import { renderRichTextToHtml } from '../archives/rich-text.renderer';

export function buildReportRichTextFromPlainText(bodyText: string) {
  const normalizedBodyText = bodyText
    .replaceAll('\r\n', '\n')
    .replaceAll('\r', '\n')
    .trim();
  const paragraphs = normalizedBodyText
    .split(/\n{1,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);

  const richTextJson: RichTextDocument = {
    version: 1,
    blocks:
      paragraphs.length > 0
        ? paragraphs.map((paragraph) => ({
            type: 'paragraph' as const,
            children: [
              {
                type: 'text' as const,
                text: paragraph,
              },
            ],
          }))
        : [
            {
              type: 'paragraph' as const,
              children: [
                {
                  type: 'text' as const,
                  text: '',
                },
              ],
            },
          ],
  };

  return {
    richTextJson: richTextJson satisfies Prisma.InputJsonValue,
    renderedHtml: renderRichTextToHtml(richTextJson),
  };
}
