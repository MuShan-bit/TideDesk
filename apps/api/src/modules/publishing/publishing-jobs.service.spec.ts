import {
  PublishBindingStatus,
  PublishDraftSourceType,
  PublishDraftStatus,
  PublishJobStatus,
  PublishPlatformType,
  UserRole,
} from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../app.module';
import { CredentialCryptoService } from '../crypto/credential-crypto.service';
import { PrismaService } from '../prisma/prisma.service';
import { WechatPublishingChannelAdapter } from './adapters/wechat-publishing-channel.adapter';
import { PublishingJobsService } from './publishing-jobs.service';

jest.setTimeout(20000);

describe('PublishingJobsService', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let credentialCryptoService: CredentialCryptoService;
  let publishingJobsService: PublishingJobsService;
  let wechatAdapter: WechatPublishingChannelAdapter;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    credentialCryptoService = moduleRef.get(CredentialCryptoService);
    publishingJobsService = moduleRef.get(PublishingJobsService);
    wechatAdapter = moduleRef.get(WechatPublishingChannelAdapter);

    await prisma.user.deleteMany({
      where: {
        id: {
          in: ['publish_job_owner', 'publish_job_other'],
        },
      },
    });

    await prisma.user.createMany({
      data: [
        {
          id: 'publish_job_owner',
          email: 'publish_job_owner@example.com',
          name: 'Publish Job Owner',
          role: UserRole.USER,
        },
        {
          id: 'publish_job_other',
          email: 'publish_job_other@example.com',
          name: 'Publish Job Other',
          role: UserRole.USER,
        },
      ],
    });
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await moduleRef.close();
  });

  it('executes selected channel publishing jobs and updates the draft status', async () => {
    const binding = await createPublishChannelBinding('publish_job_owner');
    const draft = await createDraft('publish_job_owner', binding.id);

    jest.spyOn(wechatAdapter, 'publishDraft').mockResolvedValue({
      remotePostId: 'remote-001',
      remotePostUrl: 'https://mp.weixin.qq.com/s/demo-article',
      status: PublishJobStatus.SUCCESS,
      publishedAt: new Date('2026-03-23T10:00:00.000Z'),
    });
    jest.spyOn(wechatAdapter, 'syncPublishedMetadata').mockResolvedValue({
      remotePostId: 'remote-001',
      remotePostUrl: 'https://mp.weixin.qq.com/s/demo-article',
      status: PublishJobStatus.SUCCESS,
      publishedAt: new Date('2026-03-23T10:01:00.000Z'),
    });

    const result = await publishingJobsService.publishDraft(
      'publish_job_owner',
      draft.id,
      {},
    );
    const refreshedDraft = await prisma.publishDraft.findUniqueOrThrow({
      where: {
        id: draft.id,
      },
      include: {
        publishJobs: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    expect(result.executedChannelCount).toBe(1);
    expect(result.results[0]?.status).toBe(PublishJobStatus.SUCCESS);
    expect(result.results[0]?.remotePostUrl).toBe(
      'https://mp.weixin.qq.com/s/demo-article',
    );
    expect(refreshedDraft.status).toBe('PUBLISHED_ALL');
    expect(refreshedDraft.publishJobs).toHaveLength(1);
    expect(refreshedDraft.publishJobs[0]?.status).toBe(PublishJobStatus.SUCCESS);
  });

  it('supports retrying a failed channel by creating a new publish job record', async () => {
    const binding = await createPublishChannelBinding('publish_job_owner');
    const draft = await createDraft('publish_job_owner', binding.id);

    jest
      .spyOn(wechatAdapter, 'publishDraft')
      .mockRejectedValueOnce(new Error('temporary upstream failure'))
      .mockResolvedValueOnce({
        remotePostId: 'remote-002',
        remotePostUrl: 'https://mp.weixin.qq.com/s/retry-demo',
        status: PublishJobStatus.SUCCESS,
        publishedAt: new Date('2026-03-23T12:00:00.000Z'),
      });
    jest.spyOn(wechatAdapter, 'syncPublishedMetadata').mockResolvedValue({
      remotePostId: 'remote-002',
      remotePostUrl: 'https://mp.weixin.qq.com/s/retry-demo',
      status: PublishJobStatus.SUCCESS,
      publishedAt: new Date('2026-03-23T12:01:00.000Z'),
    });

    const firstAttempt = await publishingJobsService.publishDraft(
      'publish_job_owner',
      draft.id,
      {},
    );

    expect(firstAttempt.results[0]?.status).toBe(PublishJobStatus.FAILED);
    expect(firstAttempt.results[0]?.errorMessage).toContain(
      'temporary upstream failure',
    );

    const retryAttempt = await publishingJobsService.publishDraft(
      'publish_job_owner',
      draft.id,
      {
        channelBindingId: binding.id,
      },
    );
    const refreshedDraft = await prisma.publishDraft.findUniqueOrThrow({
      where: {
        id: draft.id,
      },
      include: {
        publishJobs: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    expect(retryAttempt.executedChannelCount).toBe(1);
    expect(retryAttempt.results[0]?.status).toBe(PublishJobStatus.SUCCESS);
    expect(refreshedDraft.status).toBe('PUBLISHED_ALL');
    expect(refreshedDraft.publishJobs).toHaveLength(2);
    expect(refreshedDraft.publishJobs[0]?.status).toBe(PublishJobStatus.SUCCESS);
    expect(refreshedDraft.publishJobs[1]?.status).toBe(PublishJobStatus.FAILED);
  });

  async function createPublishChannelBinding(userId: string) {
    return prisma.publishChannelBinding.create({
      data: {
        userId,
        platformType: PublishPlatformType.WECHAT,
        displayName: '微信公众号主号',
        accountIdentifier: 'gh_publish_job_demo',
        authPayloadEncrypted: credentialCryptoService.encrypt(
          JSON.stringify({
            appId: 'wx-app-demo',
            accessToken: 'access-token-demo',
          }),
        ),
        status: PublishBindingStatus.ACTIVE,
      },
    });
  }

  async function createDraft(userId: string, channelBindingId: string) {
    return prisma.publishDraft.create({
      data: {
        userId,
        sourceType: PublishDraftSourceType.REPORT,
        status: PublishDraftStatus.READY,
        title: '发布任务草稿',
        summary: '发布任务摘要',
        sourceIdsJson: {
          reportIds: ['report-demo'],
          archivedPostIds: [],
        },
        richTextJson: {
          version: 1,
          blocks: [],
        },
        renderedHtml: '<p>发布任务正文</p>',
        targetChannels: {
          create: {
            channelBindingId,
          },
        },
      },
    });
  }
});
