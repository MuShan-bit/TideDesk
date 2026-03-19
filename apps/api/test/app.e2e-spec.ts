import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { CrawlRunStatus, CrawlTriggerType, UserRole } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from './../src/modules/prisma/prisma.service';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const internalHeaders = {
    'x-internal-auth': 'replace-with-an-internal-shared-secret',
    'x-user-id': 'user_demo',
    'x-user-email': 'user_demo@example.com',
    'x-user-role': 'USER',
  };
  const otherInternalHeaders = {
    'x-internal-auth': 'replace-with-an-internal-shared-secret',
    'x-user-id': 'user_other',
    'x-user-email': 'user_other@example.com',
    'x-user-role': 'USER',
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    await prisma.user.upsert({
      where: { id: 'user_demo' },
      update: {
        email: 'user_demo@example.com',
        name: 'Demo User',
        role: UserRole.USER,
      },
      create: {
        id: 'user_demo',
        email: 'user_demo@example.com',
        name: 'Demo User',
        role: UserRole.USER,
      },
    });

    await prisma.user.upsert({
      where: { id: 'user_other' },
      update: {
        email: 'user_other@example.com',
        name: 'Other User',
        role: UserRole.USER,
      },
      create: {
        id: 'user_other',
        email: 'user_other@example.com',
        name: 'Other User',
        role: UserRole.USER,
      },
    });

    await prisma.crawlJob.deleteMany({
      where: {
        binding: {
          userId: {
            in: ['user_demo', 'user_other'],
          },
        },
      },
    });

    await prisma.bindingBrowserSession.deleteMany({
      where: {
        userId: {
          in: ['user_demo', 'user_other'],
        },
      },
    });

    await prisma.xAccountBinding.deleteMany({
      where: {
        userId: {
          in: ['user_demo', 'user_other'],
        },
      },
    });
  });

  afterEach(async () => {
    await app.close();
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect(({ body }) => {
        const payload = body as { service: string; status: string };

        expect(payload.status).toBe('ok');
        expect(payload.service).toBe('api');
      });
  });

  it('/internal/me (GET) rejects unauthenticated requests', () => {
    return request(app.getHttpServer()).get('/internal/me').expect(401);
  });

  it('/internal/me (GET) returns current user context', () => {
    return request(app.getHttpServer())
      .get('/internal/me')
      .set(internalHeaders)
      .expect(200)
      .expect(({ body }) => {
        const payload = body as {
          user: { email: string; id: string; role: string };
        };

        expect(payload.user.id).toBe('user_demo');
        expect(payload.user.email).toBe('user_demo@example.com');
        expect(payload.user.role).toBe('USER');
      });
  });

  it('/dashboard/summary returns current binding, latest run and archive count', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/bindings')
      .set(internalHeaders)
      .send({
        xUserId: 'x-user-dashboard',
        username: 'dashboard_owner',
        displayName: 'Dashboard Owner',
        credentialSource: 'WEB_LOGIN',
        credentialPayload: '{"cookie":"dashboard"}',
        crawlEnabled: true,
        crawlIntervalMinutes: 30,
      })
      .expect(201);

    const binding = createResponse.body as { id: string };

    await request(app.getHttpServer())
      .post(`/bindings/${binding.id}/crawl-now`)
      .set(internalHeaders)
      .expect(201);

    await request(app.getHttpServer())
      .get('/dashboard/summary')
      .set(internalHeaders)
      .expect(200)
      .expect(({ body }) => {
        const payload = body as {
          archiveCount: number;
          binding: {
            id: string;
            username: string;
          } | null;
          latestRun: {
            status: string;
            newCount: number;
          } | null;
          nextRunAt: string | null;
        };

        expect(payload.binding?.id).toBe(binding.id);
        expect(payload.binding?.username).toBe('dashboard_owner');
        expect(payload.latestRun?.status).toBe('SUCCESS');
        expect(payload.latestRun?.newCount).toBe(2);
        expect(payload.archiveCount).toBe(2);
        expect(payload.nextRunAt).not.toBeNull();
      });
  });

  it('redacts sensitive credential fields from public API responses', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/bindings')
      .set(internalHeaders)
      .send({
        xUserId: 'x-user-sensitive',
        username: 'sensitive_owner',
        displayName: 'Sensitive Owner',
        credentialSource: 'COOKIE_IMPORT',
        credentialPayload:
          '{"username":"sensitive_owner","xUserId":"x-user-sensitive"}',
        crawlEnabled: true,
        crawlIntervalMinutes: 30,
      })
      .expect(201);

    const binding = createResponse.body as { id: string };
    const persistedBinding = await prisma.xAccountBinding.findUniqueOrThrow({
      where: {
        id: binding.id,
      },
    });

    expect(persistedBinding.authPayloadEncrypted).toBeTruthy();
    expect(createResponse.body.authPayloadEncrypted).toBeUndefined();

    const browserSession = await prisma.bindingBrowserSession.create({
      data: {
        userId: 'user_demo',
        bindingId: binding.id,
        status: 'SUCCESS',
        loginUrl: 'https://x.com/i/flow/login',
        capturedPayloadEncrypted: 'encrypted-browser-session-payload',
        expiresAt: new Date('2026-03-20T00:00:00.000Z'),
        completedAt: new Date('2026-03-19T00:30:00.000Z'),
        xUserId: 'x-user-sensitive',
        username: 'sensitive_owner',
      },
    });

    await request(app.getHttpServer())
      .post(`/bindings/${binding.id}/crawl-now`)
      .set(internalHeaders)
      .expect(201);

    await request(app.getHttpServer())
      .get('/bindings/current')
      .set(internalHeaders)
      .expect(200)
      .expect(({ body }) => {
        expect(body.authPayloadEncrypted).toBeUndefined();
      });

    await request(app.getHttpServer())
      .get('/dashboard/summary')
      .set(internalHeaders)
      .expect(200)
      .expect(({ body }) => {
        expect(body.binding?.authPayloadEncrypted).toBeUndefined();
      });

    const archivesListResponse = await request(app.getHttpServer())
      .get('/archives?page=1&pageSize=1')
      .set(internalHeaders)
      .expect(200);
    const archiveListPayload = archivesListResponse.body as {
      items: Array<{
        id: string;
        binding?: {
          authPayloadEncrypted?: string;
        };
      }>;
    };
    const archivedPostId = archiveListPayload.items[0]?.id;

    expect(archiveListPayload.items[0]?.binding?.authPayloadEncrypted).toBeUndefined();
    expect(archivedPostId).toBeTruthy();

    await request(app.getHttpServer())
      .get(`/archives/${archivedPostId}`)
      .set(internalHeaders)
      .expect(200)
      .expect(({ body }) => {
        expect(body.binding?.authPayloadEncrypted).toBeUndefined();
      });

    const runsListResponse = await request(app.getHttpServer())
      .get('/runs?page=1&pageSize=1')
      .set(internalHeaders)
      .expect(200);
    const runsListPayload = runsListResponse.body as {
      items: Array<{
        id: string;
        binding?: {
          authPayloadEncrypted?: string;
        };
      }>;
    };
    const runId = runsListPayload.items[0]?.id;

    expect(runsListPayload.items[0]?.binding?.authPayloadEncrypted).toBeUndefined();
    expect(runId).toBeTruthy();

    await request(app.getHttpServer())
      .get(`/runs/${runId}`)
      .set(internalHeaders)
      .expect(200)
      .expect(({ body }) => {
        expect(body.binding?.authPayloadEncrypted).toBeUndefined();
      });

    await request(app.getHttpServer())
      .get(`/bindings/browser-sessions/${browserSession.id}`)
      .set(internalHeaders)
      .expect(200)
      .expect(({ body }) => {
        expect(body.capturedPayloadEncrypted).toBeUndefined();
        expect(body.binding?.authPayloadEncrypted).toBeUndefined();
      });
  });

  it('/archives returns paginated archive cards scoped to the current user', async () => {
    const ownBindingResponse = await request(app.getHttpServer())
      .post('/bindings')
      .set(internalHeaders)
      .send({
        xUserId: 'x-user-archives-own',
        username: 'archives_owner',
        displayName: 'Archives Owner',
        credentialSource: 'WEB_LOGIN',
        credentialPayload: '{"cookie":"archives-own"}',
        crawlEnabled: true,
        crawlIntervalMinutes: 30,
      })
      .expect(201);

    const otherBindingResponse = await request(app.getHttpServer())
      .post('/bindings')
      .set(otherInternalHeaders)
      .send({
        xUserId: 'x-user-archives-other',
        username: 'archives_other',
        displayName: 'Archives Other',
        credentialSource: 'WEB_LOGIN',
        credentialPayload: '{"cookie":"archives-other"}',
        crawlEnabled: true,
        crawlIntervalMinutes: 45,
      })
      .expect(201);

    const ownBinding = ownBindingResponse.body as { id: string };
    const otherBinding = otherBindingResponse.body as { id: string };

    await request(app.getHttpServer())
      .post(`/bindings/${ownBinding.id}/crawl-now`)
      .set(internalHeaders)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/bindings/${otherBinding.id}/crawl-now`)
      .set(otherInternalHeaders)
      .expect(201);

    await request(app.getHttpServer())
      .get('/archives?page=1&pageSize=1')
      .set(internalHeaders)
      .expect(200)
      .expect(({ body }) => {
        const payload = body as {
          items: Array<{
            authorUsername: string;
            binding: { userId: string };
          }>;
          page: number;
          pageSize: number;
          total: number;
        };

        expect(payload.page).toBe(1);
        expect(payload.pageSize).toBe(1);
        expect(payload.total).toBe(2);
        expect(payload.items).toHaveLength(1);
        expect(payload.items[0]?.binding.userId).toBe('user_demo');
        expect(payload.items[0]?.authorUsername).toBeTruthy();
      });
  });

  it('/archives supports keyword, postType and date range filters', async () => {
    const ownBindingResponse = await request(app.getHttpServer())
      .post('/bindings')
      .set(internalHeaders)
      .send({
        xUserId: 'x-user-archives-filter',
        username: 'archives_filter_owner',
        displayName: 'Archives Filter Owner',
        credentialSource: 'WEB_LOGIN',
        credentialPayload: '{"cookie":"archives-filter"}',
        crawlEnabled: false,
        crawlIntervalMinutes: 30,
      })
      .expect(201);

    const otherBindingResponse = await request(app.getHttpServer())
      .post('/bindings')
      .set(otherInternalHeaders)
      .send({
        xUserId: 'x-user-archives-filter-other',
        username: 'archives_filter_other',
        displayName: 'Archives Filter Other',
        credentialSource: 'WEB_LOGIN',
        credentialPayload: '{"cookie":"archives-filter-other"}',
        crawlEnabled: false,
        crawlIntervalMinutes: 45,
      })
      .expect(201);

    const ownBinding = ownBindingResponse.body as { id: string };
    const otherBinding = otherBindingResponse.body as { id: string };

    await prisma.archivedPost.create({
      data: {
        bindingId: ownBinding.id,
        xPostId: 'archives-filter-match',
        postUrl:
          'https://x.com/archives_filter_owner/status/archives-filter-match',
        postType: 'QUOTE',
        authorUsername: 'archives_filter_owner',
        authorDisplayName: 'AI Curator',
        rawText: 'AI trend digest worth saving',
        richTextJson: { version: 1, blocks: [] },
        renderedHtml: '<p>AI trend digest worth saving</p>',
        rawPayloadJson: { id: 'archives-filter-match' },
        sourceCreatedAt: new Date('2026-03-19T09:00:00.000Z'),
      },
    });
    await prisma.archivedPost.create({
      data: {
        bindingId: ownBinding.id,
        xPostId: 'archives-filter-type-miss',
        postUrl:
          'https://x.com/archives_filter_owner/status/archives-filter-type-miss',
        postType: 'POST',
        authorUsername: 'archives_filter_owner',
        rawText: 'AI trend but wrong type',
        richTextJson: { version: 1, blocks: [] },
        renderedHtml: '<p>AI trend but wrong type</p>',
        rawPayloadJson: { id: 'archives-filter-type-miss' },
        sourceCreatedAt: new Date('2026-03-19T10:00:00.000Z'),
      },
    });
    await prisma.archivedPost.create({
      data: {
        bindingId: otherBinding.id,
        xPostId: 'archives-filter-user-miss',
        postUrl:
          'https://x.com/archives_filter_other/status/archives-filter-user-miss',
        postType: 'QUOTE',
        authorUsername: 'archives_filter_other',
        rawText: 'AI trend from another user',
        richTextJson: { version: 1, blocks: [] },
        renderedHtml: '<p>AI trend from another user</p>',
        rawPayloadJson: { id: 'archives-filter-user-miss' },
        sourceCreatedAt: new Date('2026-03-19T09:30:00.000Z'),
      },
    });

    await request(app.getHttpServer())
      .get(
        '/archives?page=1&pageSize=10&keyword=trend&postType=QUOTE&dateFrom=2026-03-19&dateTo=2026-03-19',
      )
      .set(internalHeaders)
      .expect(200)
      .expect(({ body }) => {
        const payload = body as {
          items: Array<{
            binding: { userId: string };
            postType: string;
            xPostId: string;
          }>;
          total: number;
        };

        expect(payload.total).toBe(1);
        expect(payload.items).toHaveLength(1);
        expect(payload.items[0]?.xPostId).toBe('archives-filter-match');
        expect(payload.items[0]?.postType).toBe('QUOTE');
        expect(payload.items[0]?.binding.userId).toBe('user_demo');
      });
  });

  it('/archives/:id returns archive detail with user isolation', async () => {
    const ownBindingResponse = await request(app.getHttpServer())
      .post('/bindings')
      .set(internalHeaders)
      .send({
        xUserId: 'x-user-archive-detail',
        username: 'archive_detail_owner',
        displayName: 'Archive Detail Owner',
        credentialSource: 'WEB_LOGIN',
        credentialPayload: '{"cookie":"archive-detail"}',
        crawlEnabled: true,
        crawlIntervalMinutes: 30,
      })
      .expect(201);

    const ownBinding = ownBindingResponse.body as { id: string };

    await request(app.getHttpServer())
      .post(`/bindings/${ownBinding.id}/crawl-now`)
      .set(internalHeaders)
      .expect(201);

    const archivedPost = await prisma.archivedPost.findFirstOrThrow({
      where: {
        bindingId: ownBinding.id,
      },
      orderBy: {
        archivedAt: 'desc',
      },
    });

    await request(app.getHttpServer())
      .get(`/archives/${archivedPost.id}`)
      .set(internalHeaders)
      .expect(200)
      .expect(({ body }) => {
        const payload = body as {
          id: string;
          authorUsername: string;
          mediaItems: unknown[];
          rawText: string;
          renderedHtml: string | null;
          richTextJson: { version: number };
        };

        expect(payload.id).toBe(archivedPost.id);
        expect(payload.authorUsername).toBeTruthy();
        expect(payload.rawText).toBeTruthy();
        expect(payload.richTextJson.version).toBe(1);
        expect(payload.renderedHtml).toContain('<p>');
        expect(payload.mediaItems.length).toBeGreaterThanOrEqual(0);
      });

    await request(app.getHttpServer())
      .get(`/archives/${archivedPost.id}`)
      .set(otherInternalHeaders)
      .expect(404);
  });

  it('/runs returns paginated crawl run records scoped to the current user', async () => {
    const ownBindingResponse = await request(app.getHttpServer())
      .post('/bindings')
      .set(internalHeaders)
      .send({
        xUserId: 'x-user-runs-own',
        username: 'runs_owner',
        displayName: 'Runs Owner',
        credentialSource: 'WEB_LOGIN',
        credentialPayload: '{"cookie":"runs-own"}',
        crawlEnabled: true,
        crawlIntervalMinutes: 30,
      })
      .expect(201);

    const otherBindingResponse = await request(app.getHttpServer())
      .post('/bindings')
      .set(otherInternalHeaders)
      .send({
        xUserId: 'x-user-runs-other',
        username: 'runs_other',
        displayName: 'Runs Other',
        credentialSource: 'WEB_LOGIN',
        credentialPayload: '{"cookie":"runs-other"}',
        crawlEnabled: true,
        crawlIntervalMinutes: 30,
      })
      .expect(201);

    const ownBinding = ownBindingResponse.body as { id: string };
    const otherBinding = otherBindingResponse.body as { id: string };

    await request(app.getHttpServer())
      .post(`/bindings/${ownBinding.id}/crawl-now`)
      .set(internalHeaders)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/bindings/${otherBinding.id}/crawl-now`)
      .set(otherInternalHeaders)
      .expect(201);

    await request(app.getHttpServer())
      .get('/runs?page=1&pageSize=10')
      .set(internalHeaders)
      .expect(200)
      .expect(({ body }) => {
        const payload = body as {
          items: Array<{
            binding: { userId: string };
            status: string;
            triggerType: string;
          }>;
          page: number;
          pageSize: number;
          total: number;
        };

        expect(payload.page).toBe(1);
        expect(payload.pageSize).toBe(10);
        expect(payload.total).toBeGreaterThanOrEqual(1);
        expect(payload.items.length).toBeGreaterThanOrEqual(1);
        expect(
          payload.items.every((item) => item.binding.userId === 'user_demo'),
        ).toBe(true);
        expect(payload.items[0]?.status).toBeTruthy();
        expect(payload.items[0]?.triggerType).toBeTruthy();
      });
  });

  it('/runs/:id returns crawl run detail with processing items scoped to the current user', async () => {
    const bindingResponse = await request(app.getHttpServer())
      .post('/bindings')
      .set(internalHeaders)
      .send({
        xUserId: 'x-user-run-detail-own',
        username: 'run_detail_owner',
        displayName: 'Run Detail Owner',
        credentialSource: 'WEB_LOGIN',
        credentialPayload: '{"cookie":"run-detail-owner"}',
        crawlEnabled: true,
        crawlIntervalMinutes: 30,
      })
      .expect(201);

    const binding = bindingResponse.body as { id: string };

    const crawlResponse = await request(app.getHttpServer())
      .post(`/bindings/${binding.id}/crawl-now`)
      .set(internalHeaders)
      .expect(201);

    const run = crawlResponse.body as { id: string };

    await request(app.getHttpServer())
      .get(`/runs/${run.id}`)
      .set(internalHeaders)
      .expect(200)
      .expect(({ body }) => {
        const payload = body as {
          id: string;
          binding: { userId: string; username: string };
          fetchedCount: number;
          newCount: number;
          skippedCount: number;
          failedCount: number;
          runPosts: Array<{
            actionType: string;
            reason: string | null;
            archivedPost: null | {
              id: string;
              xPostId: string;
            };
          }>;
        };

        expect(payload.id).toBe(run.id);
        expect(payload.binding.userId).toBe('user_demo');
        expect(payload.binding.username).toBe('run_detail_owner');
        expect(payload.fetchedCount).toBeGreaterThanOrEqual(1);
        expect(
          payload.newCount + payload.skippedCount + payload.failedCount,
        ).toBe(payload.fetchedCount);
        expect(payload.runPosts.length).toBeGreaterThanOrEqual(1);
        expect(payload.runPosts[0]?.actionType).toBeTruthy();
        expect(payload.runPosts[0]?.reason).toBeTruthy();
        expect(payload.runPosts[0]?.archivedPost?.id).toBeTruthy();
        expect(payload.runPosts[0]?.archivedPost?.xPostId).toBeTruthy();
      });

    await request(app.getHttpServer())
      .get(`/runs/${run.id}`)
      .set(otherInternalHeaders)
      .expect(404);
  });

  it('/bindings current/create/disable flow works', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/bindings')
      .set(internalHeaders)
      .send({
        xUserId: 'x-user-1',
        username: 'demo_x_user',
        displayName: 'Demo X User',
        credentialSource: 'WEB_LOGIN',
        credentialPayload: '{"cookie":"demo"}',
        crawlEnabled: true,
        crawlIntervalMinutes: 60,
      })
      .expect(201);

    const createPayload = createResponse.body as {
      id: string;
      status: string;
      username: string;
    };

    expect(createPayload.username).toBe('demo_x_user');
    expect(createPayload.status).toBe('ACTIVE');

    const currentResponse = await request(app.getHttpServer())
      .get('/bindings/current')
      .set(internalHeaders)
      .expect(200);

    const currentPayload = currentResponse.body as {
      userId: string;
      username: string;
    };

    expect(currentPayload.username).toBe('demo_x_user');
    expect(currentPayload.userId).toBe('user_demo');

    await request(app.getHttpServer())
      .post(`/bindings/${createPayload.id}/validate`)
      .set(internalHeaders)
      .expect(201)
      .expect(({ body }) => {
        const payload = body as {
          lastValidatedAt: string | null;
          status: string;
        };

        expect(payload.status).toBe('ACTIVE');
        expect(payload.lastValidatedAt).not.toBeNull();
      });

    await request(app.getHttpServer())
      .post(`/bindings/${createPayload.id}/disable`)
      .set(internalHeaders)
      .expect(201)
      .expect(({ body }) => {
        const payload = body as {
          crawlEnabled: boolean;
          status: string;
        };

        expect(payload.status).toBe('DISABLED');
        expect(payload.crawlEnabled).toBe(false);
      });
  });

  it('/bindings/:id/crawl-now queues a manual crawl run once per binding', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/bindings')
      .set(internalHeaders)
      .send({
        xUserId: 'x-user-manual',
        username: 'manual_owner',
        displayName: 'Manual Owner',
        credentialSource: 'WEB_LOGIN',
        credentialPayload: '{"cookie":"manual"}',
        crawlEnabled: false,
        crawlIntervalMinutes: 30,
      })
      .expect(201);

    const binding = createResponse.body as {
      id: string;
    };

    await request(app.getHttpServer())
      .post(`/bindings/${binding.id}/crawl-now`)
      .set(internalHeaders)
      .expect(201)
      .expect(({ body }) => {
        const payload = body as {
          bindingId: string;
          crawlJobId: string;
          fetchedCount: number;
          newCount: number;
          skippedCount: number;
          status: string;
          triggerType: string;
        };

        expect(payload.bindingId).toBe(binding.id);
        expect(payload.status).toBe('SUCCESS');
        expect(payload.triggerType).toBe(CrawlTriggerType.MANUAL);
        expect(payload.crawlJobId).toBeTruthy();
        expect(payload.fetchedCount).toBe(2);
        expect(payload.newCount).toBe(2);
        expect(payload.skippedCount).toBe(0);
      });

    await request(app.getHttpServer())
      .post(`/bindings/${binding.id}/crawl-now`)
      .set(internalHeaders)
      .expect(201)
      .expect(({ body }) => {
        const payload = body as {
          fetchedCount: number;
          newCount: number;
          skippedCount: number;
          status: string;
          triggerType: string;
        };

        expect(payload.status).toBe('SUCCESS');
        expect(payload.triggerType).toBe(CrawlTriggerType.MANUAL);
        expect(payload.fetchedCount).toBe(2);
        expect(payload.newCount).toBe(0);
        expect(payload.skippedCount).toBe(2);
      });

    const storedRuns = await prisma.crawlRun.findMany({
      where: {
        bindingId: binding.id,
      },
    });
    const archivedPosts = await prisma.archivedPost.findMany({
      where: {
        bindingId: binding.id,
      },
    });
    const runPosts = await prisma.crawlRunPost.findMany({
      where: {
        crawlRun: {
          bindingId: binding.id,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    expect(storedRuns).toHaveLength(2);
    expect(storedRuns.every((run) => run.status === 'SUCCESS')).toBe(true);
    expect(storedRuns.reduce((sum, run) => sum + run.newCount, 0)).toBe(2);
    expect(storedRuns.reduce((sum, run) => sum + run.skippedCount, 0)).toBe(2);
    expect(archivedPosts).toHaveLength(2);
    expect(runPosts).toHaveLength(4);
    expect(
      runPosts.filter((item) => item.actionType === 'CREATED'),
    ).toHaveLength(2);
    expect(
      runPosts.filter((item) => item.actionType === 'SKIPPED'),
    ).toHaveLength(2);
  });

  it('/bindings/:id/crawl-now resumes an existing queued crawl run', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/bindings')
      .set(internalHeaders)
      .send({
        xUserId: 'x-user-queued',
        username: 'queued_owner',
        displayName: 'Queued Owner',
        credentialSource: 'WEB_LOGIN',
        credentialPayload: '{"cookie":"queued"}',
        crawlEnabled: false,
        crawlIntervalMinutes: 30,
      })
      .expect(201);

    const binding = createResponse.body as {
      crawlJob: {
        id: string;
      };
      id: string;
    };

    const queuedRun = await prisma.crawlRun.create({
      data: {
        bindingId: binding.id,
        crawlJobId: binding.crawlJob.id,
        triggerType: CrawlTriggerType.MANUAL,
        status: CrawlRunStatus.QUEUED,
      },
    });

    await request(app.getHttpServer())
      .post(`/bindings/${binding.id}/crawl-now`)
      .set(internalHeaders)
      .expect(201)
      .expect(({ body }) => {
        const payload = body as {
          id: string;
          status: string;
          triggerType: string;
        };

        expect(payload.id).toBe(queuedRun.id);
        expect(payload.status).toBe('SUCCESS');
        expect(payload.triggerType).toBe(CrawlTriggerType.MANUAL);
      });

    const storedRuns = await prisma.crawlRun.findMany({
      where: {
        bindingId: binding.id,
      },
    });

    expect(storedRuns).toHaveLength(1);
    expect(storedRuns[0]?.id).toBe(queuedRun.id);
    expect(storedRuns[0]?.status).toBe(CrawlRunStatus.SUCCESS);
  });

  it('/bindings/:id/crawl-now returns the active running run in conflict details', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/bindings')
      .set(internalHeaders)
      .send({
        xUserId: 'x-user-running',
        username: 'running_owner',
        displayName: 'Running Owner',
        credentialSource: 'WEB_LOGIN',
        credentialPayload: '{"cookie":"running"}',
        crawlEnabled: true,
        crawlIntervalMinutes: 30,
      })
      .expect(201);

    const binding = createResponse.body as {
      crawlJob: {
        id: string;
      };
      id: string;
    };

    const runningRun = await prisma.crawlRun.create({
      data: {
        bindingId: binding.id,
        crawlJobId: binding.crawlJob.id,
        triggerType: CrawlTriggerType.SCHEDULED,
        status: CrawlRunStatus.RUNNING,
        startedAt: new Date('2026-03-19T06:00:00.000Z'),
      },
    });

    await request(app.getHttpServer())
      .post(`/bindings/${binding.id}/crawl-now`)
      .set(internalHeaders)
      .expect(409)
      .expect(({ body }) => {
        const payload = body as {
          message: string;
        };

        expect(payload.message).toContain('already running');
        expect(payload.message).toContain(runningRun.id);
      });
  });

  it('/bindings enforces per-user isolation across read and write operations', async () => {
    const ownBindingResponse = await request(app.getHttpServer())
      .post('/bindings')
      .set(internalHeaders)
      .send({
        xUserId: 'x-user-demo',
        username: 'demo_owner',
        displayName: 'Demo Owner',
        credentialSource: 'WEB_LOGIN',
        credentialPayload: '{"cookie":"owner"}',
        crawlEnabled: true,
        crawlIntervalMinutes: 30,
      })
      .expect(201);

    const ownBinding = ownBindingResponse.body as {
      id: string;
      username: string;
    };

    const otherBindingResponse = await request(app.getHttpServer())
      .post('/bindings')
      .set(otherInternalHeaders)
      .send({
        xUserId: 'x-user-other',
        username: 'other_owner',
        displayName: 'Other Owner',
        credentialSource: 'WEB_LOGIN',
        credentialPayload: '{"cookie":"other"}',
        crawlEnabled: true,
        crawlIntervalMinutes: 45,
      })
      .expect(201);

    const otherBinding = otherBindingResponse.body as {
      id: string;
      username: string;
    };

    expect(ownBinding.username).toBe('demo_owner');
    expect(otherBinding.username).toBe('other_owner');

    await request(app.getHttpServer())
      .get('/bindings/current')
      .set(internalHeaders)
      .expect(200)
      .expect(({ body }) => {
        const payload = body as {
          id: string;
          userId: string;
          username: string;
        };

        expect(payload.id).toBe(ownBinding.id);
        expect(payload.userId).toBe('user_demo');
        expect(payload.username).toBe('demo_owner');
      });

    await request(app.getHttpServer())
      .get('/bindings/current')
      .set(otherInternalHeaders)
      .expect(200)
      .expect(({ body }) => {
        const payload = body as {
          id: string;
          userId: string;
          username: string;
        };

        expect(payload.id).toBe(otherBinding.id);
        expect(payload.userId).toBe('user_other');
        expect(payload.username).toBe('other_owner');
      });

    await request(app.getHttpServer())
      .patch(`/bindings/${ownBinding.id}/crawl-config`)
      .set(otherInternalHeaders)
      .send({
        crawlEnabled: false,
        crawlIntervalMinutes: 120,
      })
      .expect(404);

    await request(app.getHttpServer())
      .post(`/bindings/${ownBinding.id}/validate`)
      .set(otherInternalHeaders)
      .expect(404);

    await request(app.getHttpServer())
      .post(`/bindings/${ownBinding.id}/disable`)
      .set(otherInternalHeaders)
      .expect(404);

    await request(app.getHttpServer())
      .post(`/bindings/${ownBinding.id}/crawl-now`)
      .set(otherInternalHeaders)
      .expect(404);

    await request(app.getHttpServer())
      .get('/bindings/current')
      .set(internalHeaders)
      .expect(200)
      .expect(({ body }) => {
        const payload = body as {
          crawlEnabled: boolean;
          crawlIntervalMinutes: number;
          status: string;
        };

        expect(payload.status).toBe('ACTIVE');
        expect(payload.crawlEnabled).toBe(true);
        expect(payload.crawlIntervalMinutes).toBe(30);
      });
  });
});
