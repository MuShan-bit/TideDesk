import { BadRequestException } from '@nestjs/common';

export function normalizeTaxonomySlug(value: string) {
  const normalized = value
    .trim()
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!normalized) {
    throw new BadRequestException('Taxonomy slug cannot be empty');
  }

  return normalized;
}
