import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { CrawlTriggerType, UserRole } from '@prisma/client';
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
          status: string;
          triggerType: string;
        };

        expect(payload.bindingId).toBe(binding.id);
        expect(payload.status).toBe('SUCCESS');
        expect(payload.triggerType).toBe(CrawlTriggerType.MANUAL);
        expect(payload.crawlJobId).toBeTruthy();
      });

    await request(app.getHttpServer())
      .post(`/bindings/${binding.id}/crawl-now`)
      .set(internalHeaders)
      .expect(201)
      .expect(({ body }) => {
        const payload = body as {
          status: string;
          triggerType: string;
        };

        expect(payload.status).toBe('SUCCESS');
        expect(payload.triggerType).toBe(CrawlTriggerType.MANUAL);
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

    expect(storedRuns).toHaveLength(2);
    expect(storedRuns.every((run) => run.status === 'SUCCESS')).toBe(true);
    expect(archivedPosts).toHaveLength(2);
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
