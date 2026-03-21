import { UserRole } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { TaxonomyService } from './taxonomy.service';

describe('TaxonomyService', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let taxonomyService: TaxonomyService;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    taxonomyService = moduleRef.get(TaxonomyService);

    await prisma.user.upsert({
      where: { id: 'taxonomy_owner' },
      update: {
        email: 'taxonomy_owner@example.com',
        name: 'Taxonomy Owner',
        role: UserRole.USER,
      },
      create: {
        id: 'taxonomy_owner',
        email: 'taxonomy_owner@example.com',
        name: 'Taxonomy Owner',
        role: UserRole.USER,
      },
    });

    await prisma.archivedPostTag.deleteMany({
      where: {
        tag: {
          userId: 'taxonomy_owner',
        },
      },
    });
    await prisma.tag.deleteMany({
      where: {
        userId: 'taxonomy_owner',
      },
    });
    await prisma.category.deleteMany({
      where: {
        userId: 'taxonomy_owner',
      },
    });
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('creates, lists, updates and disables categories', async () => {
    const category = await taxonomyService.createCategory('taxonomy_owner', {
      name: 'AI Signals',
      color: '#2563eb',
    });
    const secondCategory = await taxonomyService.createCategory(
      'taxonomy_owner',
      {
        name: 'Product Notes',
      },
    );

    expect(category.slug).toBe('ai-signals');
    expect(category.sortOrder).toBe(0);
    expect(secondCategory.sortOrder).toBe(1);

    const updated = await taxonomyService.updateCategory(
      'taxonomy_owner',
      category.id,
      {
        description: 'Track high signal AI posts',
        sortOrder: 5,
      },
    );

    expect(updated.description).toBe('Track high signal AI posts');
    expect(updated.sortOrder).toBe(5);

    await taxonomyService.disableCategory('taxonomy_owner', secondCategory.id);

    await expect(
      taxonomyService.listCategories('taxonomy_owner'),
    ).resolves.toHaveLength(1);
    await expect(
      taxonomyService.listCategories('taxonomy_owner', {
        includeInactive: true,
      }),
    ).resolves.toHaveLength(2);
  });

  it('creates, lists, updates and disables tags', async () => {
    const tag = await taxonomyService.createTag('taxonomy_owner', {
      name: 'OpenAI',
      color: '#10b981',
    });
    const secondTag = await taxonomyService.createTag('taxonomy_owner', {
      name: 'Anthropic',
    });

    expect(tag.slug).toBe('openai');
    expect(secondTag.slug).toBe('anthropic');

    const updated = await taxonomyService.updateTag('taxonomy_owner', tag.id, {
      name: 'OpenAI API',
      slug: 'openai-api',
      isActive: true,
    });

    expect(updated.name).toBe('OpenAI API');
    expect(updated.slug).toBe('openai-api');

    await taxonomyService.disableTag('taxonomy_owner', secondTag.id);

    await expect(taxonomyService.listTags('taxonomy_owner')).resolves.toEqual([
      expect.objectContaining({
        id: tag.id,
      }),
    ]);
    await expect(
      taxonomyService.listTags('taxonomy_owner', {
        includeInactive: true,
      }),
    ).resolves.toHaveLength(2);
  });

  it('reuses existing tags and creates missing tags for AI classification results', async () => {
    const existingTag = await taxonomyService.createTag('taxonomy_owner', {
      name: 'OpenAI',
      color: '#10b981',
    });

    const ensuredTags = await taxonomyService.ensureTagsForUser(
      'taxonomy_owner',
      [
        {
          name: 'OpenAI',
          slug: 'openai',
        },
        {
          name: 'Inference Ops',
        },
        {
          name: 'Inference Ops',
          slug: 'inference-ops',
        },
      ],
    );

    expect(ensuredTags).toEqual([
      expect.objectContaining({
        id: existingTag.id,
        slug: 'openai',
      }),
      expect.objectContaining({
        name: 'Inference Ops',
        slug: 'inference-ops',
      }),
      expect.objectContaining({
        name: 'Inference Ops',
        slug: 'inference-ops',
      }),
    ]);

    await expect(
      prisma.tag.findMany({
        where: {
          userId: 'taxonomy_owner',
        },
        orderBy: {
          slug: 'asc',
        },
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        slug: 'inference-ops',
      }),
      expect.objectContaining({
        id: existingTag.id,
        slug: 'openai',
      }),
    ]);
  });
});
