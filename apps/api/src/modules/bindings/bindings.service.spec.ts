import {
  BindingStatus,
  CrawlMode,
  CrawlScheduleKind,
  CrawlRunStatus,
  CrawlTriggerType,
  CredentialSource,
  PostType,
  UserRole,
} from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../app.module';
import { CredentialCryptoService } from '../crypto/credential-crypto.service';
import { FEED_CRAWLER_ADAPTER } from '../crawler/crawler.constants';
import type { FeedCrawlerAdapter } from '../crawler/crawler.types';
import { CrawlerAuthError } from '../crawler/errors/crawler-adapter.error';
import { PrismaService } from '../prisma/prisma.service';
import { BindingsService } from './bindings.service';

describe('BindingsService', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let bindingsService: BindingsService;
  let credentialCryptoService: CredentialCryptoService;
  let feedCrawlerAdapter: FeedCrawlerAdapter;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    bindingsService = moduleRef.get(BindingsService);
    credentialCryptoService = moduleRef.get(CredentialCryptoService);
    feedCrawlerAdapter = moduleRef.get(FEED_CRAWLER_ADAPTER);

    await prisma.user.upsert({
      where: { id: 'binding_owner' },
      update: {
        email: 'binding_owner@example.com',
        name: 'Binding Owner',
        role: UserRole.USER,
      },
      create: {
        id: 'binding_owner',
        email: 'binding_owner@example.com',
        name: 'Binding Owner',
        role: UserRole.USER,
      },
    });

    await prisma.bindingBrowserSession.deleteMany({
      where: {
        userId: 'binding_owner',
      },
    });
    await prisma.xAccountBinding.deleteMany({
      where: {
        userId: 'binding_owner',
      },
    });
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await moduleRef.close();
  });

  it('creates a binding through upsertForUser and provisions crawl job', async () => {
    const binding = await bindingsService.upsertForUser('binding_owner', {
      xUserId: 'x-manual-001',
      username: 'manual_owner',
      displayName: 'Manual Owner',
      avatarUrl: 'https://images.example.com/manual-owner.png',
      credentialSource: CredentialSource.COOKIE_IMPORT,
      credentialPayload: '{"cookie":"session=demo"}',
      crawlEnabled: true,
      crawlIntervalMinutes: 90,
    });

    expect(binding.userId).toBe('binding_owner');
    expect(binding.status).toBe(BindingStatus.ACTIVE);
    expect(binding.credentialSource).toBe(CredentialSource.COOKIE_IMPORT);
    expect(binding.username).toBe('manual_owner');
    expect(binding.crawlEnabled).toBe(true);
    expect(binding.crawlIntervalMinutes).toBe(90);
    expect(binding.crawlJob?.enabled).toBe(true);
    expect(binding.crawlJob?.intervalMinutes).toBe(90);
    expect(binding.crawlProfiles).toEqual([
      expect.objectContaining({
        mode: CrawlMode.RECOMMENDED,
        enabled: true,
        intervalMinutes: 90,
      }),
    ]);
    expect(
      credentialCryptoService.decrypt(binding.authPayloadEncrypted),
    ).toBe('{"cookie":"session=demo"}');
  });

  it('creates a binding directly from browser login payload', async () => {
    const binding = await bindingsService.upsertFromBrowserLogin(
      'binding_owner',
      buildPayload({
        xUserId: 'x-browser-001',
        username: 'browser_owner',
        displayName: 'Browser Owner',
      }),
    );

    expect(binding.userId).toBe('binding_owner');
    expect(binding.status).toBe(BindingStatus.ACTIVE);
    expect(binding.credentialSource).toBe(CredentialSource.WEB_LOGIN);
    expect(binding.crawlEnabled).toBe(true);
    expect(binding.crawlIntervalMinutes).toBe(60);
    expect(binding.crawlJob?.enabled).toBe(true);
    expect(binding.crawlJob?.intervalMinutes).toBe(60);
    expect(binding.crawlProfiles).toEqual([
      expect.objectContaining({
        mode: CrawlMode.RECOMMENDED,
        enabled: true,
        intervalMinutes: 60,
      }),
    ]);

    const storedPayload = JSON.parse(
      credentialCryptoService.decrypt(binding.authPayloadEncrypted),
    ) as {
      adapter: string;
      username: string;
      xUserId: string;
    };

    expect(storedPayload.adapter).toBe('real');
    expect(storedPayload.username).toBe('browser_owner');
    expect(storedPayload.xUserId).toBe('x-browser-001');
  });

  it('reactivates the same existing disabled binding and preserves crawl interval', async () => {
    const existingBinding = await createBinding({
      xUserId: 'x-legacy',
      username: 'legacy_owner',
      displayName: 'Legacy Owner',
      status: BindingStatus.DISABLED,
      crawlEnabled: false,
      crawlIntervalMinutes: 45,
    });

    const rebound = await bindingsService.upsertFromBrowserLogin(
      'binding_owner',
      buildPayload({
        xUserId: 'x-legacy',
        username: 'legacy_owner',
        displayName: 'Legacy Owner Rebound',
        avatarUrl: 'https://images.example.com/rebound-owner.png',
      }),
    );

    expect(rebound.id).toBe(existingBinding.id);
    expect(rebound.status).toBe(BindingStatus.ACTIVE);
    expect(rebound.crawlEnabled).toBe(true);
    expect(rebound.crawlIntervalMinutes).toBe(45);
    expect(rebound.crawlJob?.enabled).toBe(true);
    expect(rebound.crawlJob?.intervalMinutes).toBe(45);
    expect(rebound.username).toBe('legacy_owner');
    expect(rebound.displayName).toBe('Legacy Owner Rebound');
  });

  it('updates an existing binding through upsertForUser', async () => {
    const existingBinding = await createBinding({
      xUserId: 'x-existing',
      username: 'existing_owner',
      displayName: 'Existing Owner',
      status: BindingStatus.INVALID,
      crawlEnabled: true,
      crawlIntervalMinutes: 30,
    });

    const updated = await bindingsService.upsertForUser('binding_owner', {
      xUserId: 'x-existing',
      username: 'existing_owner',
      displayName: 'Updated Owner',
      avatarUrl: 'https://images.example.com/updated-owner.png',
      credentialSource: CredentialSource.COOKIE_IMPORT,
      credentialPayload: '{"cookie":"session=updated"}',
      crawlEnabled: false,
      crawlIntervalMinutes: 120,
    });

    expect(updated.id).toBe(existingBinding.id);
    expect(updated.status).toBe(BindingStatus.ACTIVE);
    expect(updated.username).toBe('existing_owner');
    expect(updated.displayName).toBe('Updated Owner');
    expect(updated.credentialSource).toBe(CredentialSource.COOKIE_IMPORT);
    expect(updated.crawlEnabled).toBe(false);
    expect(updated.crawlIntervalMinutes).toBe(120);
    expect(updated.nextCrawlAt).toBeNull();
    expect(updated.crawlJob?.enabled).toBe(false);
    expect(updated.crawlJob?.intervalMinutes).toBe(120);
    expect(updated.crawlJob?.nextRunAt).toBeNull();
    expect(
      credentialCryptoService.decrypt(updated.authPayloadEncrypted),
    ).toBe('{"cookie":"session=updated"}');
  });

  it('creates a second binding instead of overwriting a different x account', async () => {
    const existingBinding = await createBinding({
      xUserId: 'x-first',
      username: 'first_owner',
      displayName: 'First Owner',
      status: BindingStatus.ACTIVE,
      crawlEnabled: true,
      crawlIntervalMinutes: 30,
    });

    const secondBinding = await bindingsService.upsertFromBrowserLogin(
      'binding_owner',
      buildPayload({
        xUserId: 'x-second',
        username: 'second_owner',
        displayName: 'Second Owner',
      }),
    );

    expect(secondBinding.id).not.toBe(existingBinding.id);
    expect(secondBinding.xUserId).toBe('x-second');
    expect(secondBinding.username).toBe('second_owner');
    await expect(
      prisma.xAccountBinding.count({
        where: {
          userId: 'binding_owner',
        },
      }),
    ).resolves.toBe(2);
  });

  it('updates crawl configuration and syncs the crawl job', async () => {
    const binding = await createBinding({
      xUserId: 'x-config',
      username: 'config_owner',
      displayName: 'Config Owner',
      status: BindingStatus.ACTIVE,
      crawlEnabled: true,
      crawlIntervalMinutes: 30,
    });

    const updated = await bindingsService.updateCrawlConfig(
      'binding_owner',
      binding.id,
      {
        crawlEnabled: false,
        crawlIntervalMinutes: 180,
      },
    );

    expect(updated.crawlEnabled).toBe(false);
    expect(updated.crawlIntervalMinutes).toBe(180);
    expect(updated.nextCrawlAt).toBeNull();
    expect(updated.crawlJob?.enabled).toBe(false);
    expect(updated.crawlJob?.intervalMinutes).toBe(180);
    expect(updated.crawlJob?.nextRunAt).toBeNull();
    expect(updated.crawlProfiles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          mode: CrawlMode.RECOMMENDED,
          enabled: false,
          intervalMinutes: 180,
          nextRunAt: null,
        }),
      ]),
    );
  });

  it('creates and updates custom crawl profiles for a binding', async () => {
    const binding = await createBinding({
      xUserId: 'x-profiles',
      username: 'profiles_owner',
      displayName: 'Profiles Owner',
      status: BindingStatus.ACTIVE,
      crawlEnabled: true,
      crawlIntervalMinutes: 30,
    });

    const createdProfile = await bindingsService.createCrawlProfile(
      'binding_owner',
      binding.id,
      {
        mode: CrawlMode.SEARCH,
        enabled: true,
        scheduleKind: CrawlScheduleKind.CRON,
        scheduleCron: '15 9 * * 1,3,5',
        queryText: 'AI agent',
        region: 'global',
        language: 'en',
        maxPosts: 40,
      },
    );

    expect(createdProfile.mode).toBe(CrawlMode.SEARCH);
    expect(createdProfile.queryText).toBe('AI agent');
    expect(createdProfile.maxPosts).toBe(40);

    const updatedProfile = await bindingsService.updateCrawlProfile(
      'binding_owner',
      binding.id,
      createdProfile.id,
      {
        enabled: false,
        scheduleKind: CrawlScheduleKind.INTERVAL,
        intervalMinutes: 180,
        queryText: 'AI infra',
        region: 'us',
        language: 'zh',
        maxPosts: 25,
      },
    );

    expect(updatedProfile.enabled).toBe(false);
    expect(updatedProfile.scheduleKind).toBe(CrawlScheduleKind.INTERVAL);
    expect(updatedProfile.intervalMinutes).toBe(180);
    expect(updatedProfile.nextRunAt).toBeNull();
    expect(updatedProfile.queryText).toBe('AI infra');

    const profiles = await bindingsService.listCrawlProfiles(
      'binding_owner',
      binding.id,
    );

    expect(profiles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          mode: CrawlMode.RECOMMENDED,
        }),
        expect.objectContaining({
          id: createdProfile.id,
          mode: CrawlMode.SEARCH,
          queryText: 'AI infra',
        }),
      ]),
    );
  });

  it('requires query text for search crawl profiles', async () => {
    const binding = await createBinding({
      xUserId: 'x-search-profile',
      username: 'search_profile_owner',
      displayName: 'Search Profile Owner',
      status: BindingStatus.ACTIVE,
      crawlEnabled: true,
      crawlIntervalMinutes: 30,
    });

    await expect(
      bindingsService.createCrawlProfile('binding_owner', binding.id, {
        mode: CrawlMode.SEARCH,
        enabled: true,
        scheduleKind: CrawlScheduleKind.INTERVAL,
        intervalMinutes: 120,
        maxPosts: 20,
      }),
    ).rejects.toThrow('Search crawl profile requires a query text');
  });

  it('revalidates a binding and refreshes stored profile fields', async () => {
    const binding = await createBinding({
      xUserId: 'x-revalidate',
      username: 'revalidate_owner',
      displayName: 'Revalidate Owner',
      status: BindingStatus.INVALID,
      crawlEnabled: true,
      crawlIntervalMinutes: 30,
    });
    const validateCredentialSpy = jest
      .spyOn(feedCrawlerAdapter, 'validateCredential')
      .mockResolvedValue({
        xUserId: 'x-revalidate-updated',
        username: 'validated_owner',
        displayName: 'Validated Owner',
        avatarUrl: 'https://images.example.com/validated-owner.png',
      });

    const result = await bindingsService.revalidate('binding_owner', binding.id);

    expect(validateCredentialSpy).toHaveBeenCalledWith(
      credentialCryptoService.decrypt(binding.authPayloadEncrypted),
    );
    expect(result.status).toBe(BindingStatus.ACTIVE);
    expect(result.xUserId).toBe('x-revalidate-updated');
    expect(result.username).toBe('validated_owner');
    expect(result.displayName).toBe('Validated Owner');
    expect(result.avatarUrl).toBe(
      'https://images.example.com/validated-owner.png',
    );
    expect(result.lastValidatedAt).toBeInstanceOf(Date);
    expect(result.lastErrorMessage).toBeNull();
  });

  it('marks a binding invalid when revalidation returns an auth error', async () => {
    const binding = await createBinding({
      xUserId: 'x-auth-failure',
      username: 'auth_failure_owner',
      displayName: 'Auth Failure Owner',
      status: BindingStatus.ACTIVE,
      crawlEnabled: true,
      crawlIntervalMinutes: 30,
    });
    const validateCredentialSpy = jest
      .spyOn(feedCrawlerAdapter, 'validateCredential')
      .mockRejectedValue(new CrawlerAuthError('Credential expired'));

    const result = await bindingsService.revalidate('binding_owner', binding.id);

    expect(validateCredentialSpy).toHaveBeenCalled();
    expect(result.status).toBe(BindingStatus.INVALID);
    expect(result.lastValidatedAt).toBeInstanceOf(Date);
    expect(result.lastErrorMessage).toBe('Credential expired');
  });

  it('disables a binding and pauses the crawl job', async () => {
    const binding = await createBinding({
      xUserId: 'x-disable',
      username: 'disable_owner',
      displayName: 'Disable Owner',
      status: BindingStatus.ACTIVE,
      crawlEnabled: true,
      crawlIntervalMinutes: 30,
    });

    const disabled = await bindingsService.disable('binding_owner', binding.id);

    expect(disabled.status).toBe(BindingStatus.DISABLED);
    expect(disabled.crawlEnabled).toBe(false);
    expect(disabled.nextCrawlAt).toBeNull();
    expect(disabled.crawlJob?.enabled).toBe(false);
    expect(disabled.crawlJob?.nextRunAt).toBeNull();
  });

  it('unbinds a binding and clears related archives and crawl runs', async () => {
    const binding = await createBinding({
      xUserId: 'x-unbind',
      username: 'unbind_owner',
      displayName: 'Unbind Owner',
      status: BindingStatus.ACTIVE,
      crawlEnabled: true,
      crawlIntervalMinutes: 30,
    });
    const run = await prisma.crawlRun.create({
      data: {
        bindingId: binding.id,
        crawlJobId: binding.crawlJob!.id,
        triggerType: CrawlTriggerType.MANUAL,
        status: CrawlRunStatus.SUCCESS,
      },
    });

    await prisma.archivedPost.create({
      data: {
        bindingId: binding.id,
        firstCrawlRunId: run.id,
        xPostId: 'unbind-post-001',
        postUrl: 'https://x.com/unbind_owner/status/unbind-post-001',
        postType: PostType.POST,
        authorUsername: 'unbind_owner',
        rawText: 'unbind post',
        richTextJson: { version: 1, blocks: [] },
        renderedHtml: '<p>unbind post</p>',
        rawPayloadJson: { id: 'unbind-post-001' },
        sourceCreatedAt: new Date('2026-03-19T08:00:00.000Z'),
      },
    });

    const result = await bindingsService.unbind('binding_owner', binding.id);

    expect(result).toEqual({
      deletedArchiveCount: 1,
      deletedBindingId: binding.id,
      deletedRunCount: 1,
    });
    await expect(
      prisma.xAccountBinding.findUniqueOrThrow({
        where: {
          id: binding.id,
        },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.archivedPost.count({
        where: {
          bindingId: binding.id,
        },
      }),
    ).resolves.toBe(0);
    await expect(
      prisma.crawlRun.count({
        where: {
          bindingId: binding.id,
        },
      }),
    ).resolves.toBe(0);
  });

  it('rejects unbinding when crawl runs are still queued or running', async () => {
    const binding = await createBinding({
      xUserId: 'x-active-run',
      username: 'active_run_owner',
      displayName: 'Active Run Owner',
      status: BindingStatus.ACTIVE,
      crawlEnabled: true,
      crawlIntervalMinutes: 30,
    });

    await prisma.crawlRun.create({
      data: {
        bindingId: binding.id,
        crawlJobId: binding.crawlJob!.id,
        triggerType: CrawlTriggerType.SCHEDULED,
        status: CrawlRunStatus.RUNNING,
      },
    });

    await expect(
      bindingsService.unbind('binding_owner', binding.id),
    ).rejects.toThrow(
      'Current binding has queued or running crawl runs and cannot be unbound yet',
    );
  });

  async function createBinding(input: {
    crawlEnabled: boolean;
    crawlIntervalMinutes: number;
    displayName: string;
    status: BindingStatus;
    username: string;
    xUserId: string;
  }) {
    return prisma.xAccountBinding.create({
      data: {
        userId: 'binding_owner',
        xUserId: input.xUserId,
        username: input.username,
        displayName: input.displayName,
        status: input.status,
        credentialSource: CredentialSource.WEB_LOGIN,
        authPayloadEncrypted: credentialCryptoService.encrypt(
          JSON.stringify(buildPayload(input)),
        ),
        lastValidatedAt: new Date('2026-03-19T00:00:00.000Z'),
        crawlEnabled: input.crawlEnabled,
        crawlIntervalMinutes: input.crawlIntervalMinutes,
        nextCrawlAt: input.crawlEnabled
          ? new Date('2026-03-19T12:45:00.000Z')
          : null,
        crawlJob: {
          create: {
            enabled: input.crawlEnabled,
            intervalMinutes: input.crawlIntervalMinutes,
            nextRunAt: input.crawlEnabled
              ? new Date('2026-03-19T12:45:00.000Z')
              : null,
          },
        },
        crawlProfiles: {
          create: [
            {
              mode: CrawlMode.RECOMMENDED,
              enabled: input.crawlEnabled,
              intervalMinutes: input.crawlIntervalMinutes,
              maxPosts: 20,
              nextRunAt: input.crawlEnabled
                ? new Date('2026-03-19T12:45:00.000Z')
                : null,
            },
          ],
        },
      },
      include: {
        crawlJob: true,
        crawlProfiles: true,
      },
    });
  }

  function buildPayload(input: {
    avatarUrl?: string;
    displayName: string;
    username: string;
    xUserId: string;
  }) {
    return {
      adapter: 'real' as const,
      authToken: 'auth-token-demo',
      avatarUrl:
        input.avatarUrl ?? 'https://images.example.com/browser-owner.png',
      capturedAt: '2026-03-19T00:00:00.000Z',
      cookies: [
        {
          domain: '.x.com',
          expires: -1,
          httpOnly: true,
          name: 'auth_token',
          path: '/',
          sameSite: 'Lax' as const,
          secure: true,
          value: 'auth-token-demo',
        },
        {
          domain: '.x.com',
          expires: -1,
          httpOnly: false,
          name: 'ct0',
          path: '/',
          sameSite: 'Lax' as const,
          secure: true,
          value: 'ct0-demo',
        },
      ],
      ct0: 'ct0-demo',
      displayName: input.displayName,
      loginUrl: 'https://x.com/i/flow/login',
      username: input.username,
      xUserId: input.xUserId,
    };
  }
});
