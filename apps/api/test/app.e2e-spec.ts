import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { UserRole } from '@prisma/client';
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

    await prisma.crawlJob.deleteMany({
      where: {
        binding: {
          userId: 'user_demo',
        },
      },
    });

    await prisma.xAccountBinding.deleteMany({
      where: { userId: 'user_demo' },
    });
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
});
