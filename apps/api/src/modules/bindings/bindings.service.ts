import { BindingStatus, CredentialSource, type Prisma } from '@prisma/client';
import {
  Inject,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CredentialCryptoService } from '../crypto/credential-crypto.service';
import { FEED_CRAWLER_ADAPTER } from '../crawler/crawler.constants';
import type { FeedCrawlerAdapter } from '../crawler/crawler.types';
import { CrawlerAuthError } from '../crawler/errors/crawler-adapter.error';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertBindingDto } from './dto/upsert-binding.dto';
import { UpdateCrawlConfigDto } from './dto/update-crawl-config.dto';

@Injectable()
export class BindingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credentialCryptoService: CredentialCryptoService,
    @Inject(FEED_CRAWLER_ADAPTER)
    private readonly feedCrawlerAdapter: FeedCrawlerAdapter,
  ) {}

  async getCurrent(userId: string) {
    return this.prisma.xAccountBinding.findFirst({
      where: { userId },
      include: { crawlJob: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async upsertForUser(userId: string, dto: UpsertBindingDto) {
    const encryptedPayload = this.credentialCryptoService.encrypt(
      dto.credentialPayload,
    );
    const nextRunAt = dto.crawlEnabled
      ? this.buildNextRunAt(dto.crawlIntervalMinutes)
      : null;
    const existingBinding = await this.prisma.xAccountBinding.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });

    const data: Prisma.XAccountBindingUncheckedCreateInput = {
      userId,
      xUserId: dto.xUserId,
      username: dto.username,
      displayName: dto.displayName,
      avatarUrl: dto.avatarUrl,
      status: BindingStatus.ACTIVE,
      credentialSource: dto.credentialSource ?? CredentialSource.WEB_LOGIN,
      authPayloadEncrypted: encryptedPayload,
      lastValidatedAt: new Date(),
      crawlEnabled: dto.crawlEnabled,
      crawlIntervalMinutes: dto.crawlIntervalMinutes,
      nextCrawlAt: nextRunAt,
    };

    if (!existingBinding) {
      return this.prisma.xAccountBinding.create({
        data: {
          ...data,
          crawlJob: {
            create: {
              enabled: dto.crawlEnabled,
              intervalMinutes: dto.crawlIntervalMinutes,
              nextRunAt,
            },
          },
        },
        include: { crawlJob: true },
      });
    }

    return this.prisma.xAccountBinding.update({
      where: { id: existingBinding.id },
      data: {
        xUserId: dto.xUserId,
        username: dto.username,
        displayName: dto.displayName,
        avatarUrl: dto.avatarUrl,
        status: BindingStatus.ACTIVE,
        credentialSource: dto.credentialSource,
        authPayloadEncrypted: encryptedPayload,
        lastValidatedAt: new Date(),
        crawlEnabled: dto.crawlEnabled,
        crawlIntervalMinutes: dto.crawlIntervalMinutes,
        nextCrawlAt: nextRunAt,
        crawlJob: existingBinding.id
          ? {
              upsert: {
                create: {
                  enabled: dto.crawlEnabled,
                  intervalMinutes: dto.crawlIntervalMinutes,
                  nextRunAt,
                },
                update: {
                  enabled: dto.crawlEnabled,
                  intervalMinutes: dto.crawlIntervalMinutes,
                  nextRunAt,
                },
              },
            }
          : undefined,
      },
      include: { crawlJob: true },
    });
  }

  async updateCrawlConfig(
    userId: string,
    bindingId: string,
    dto: UpdateCrawlConfigDto,
  ) {
    const binding = await this.assertOwnership(userId, bindingId);
    const nextRunAt = dto.crawlEnabled
      ? this.buildNextRunAt(dto.crawlIntervalMinutes)
      : null;

    return this.prisma.xAccountBinding.update({
      where: { id: binding.id },
      data: {
        crawlEnabled: dto.crawlEnabled,
        crawlIntervalMinutes: dto.crawlIntervalMinutes,
        nextCrawlAt: nextRunAt,
        crawlJob: {
          upsert: {
            create: {
              enabled: dto.crawlEnabled,
              intervalMinutes: dto.crawlIntervalMinutes,
              nextRunAt,
            },
            update: {
              enabled: dto.crawlEnabled,
              intervalMinutes: dto.crawlIntervalMinutes,
              nextRunAt,
            },
          },
        },
      },
      include: { crawlJob: true },
    });
  }

  async disable(userId: string, bindingId: string) {
    const binding = await this.assertOwnership(userId, bindingId);

    return this.prisma.xAccountBinding.update({
      where: { id: binding.id },
      data: {
        status: BindingStatus.DISABLED,
        crawlEnabled: false,
        nextCrawlAt: null,
        crawlJob: {
          update: {
            enabled: false,
            nextRunAt: null,
          },
        },
      },
      include: { crawlJob: true },
    });
  }

  async revalidate(userId: string, bindingId: string) {
    const binding = await this.assertOwnership(userId, bindingId);
    const credentialPayload = this.credentialCryptoService.decrypt(
      binding.authPayloadEncrypted,
    );

    try {
      const profile =
        await this.feedCrawlerAdapter.validateCredential(credentialPayload);

      return this.prisma.xAccountBinding.update({
        where: { id: binding.id },
        data: {
          xUserId: profile.xUserId ?? binding.xUserId,
          username: profile.username ?? binding.username,
          displayName: profile.displayName ?? binding.displayName,
          avatarUrl: profile.avatarUrl ?? binding.avatarUrl,
          status: BindingStatus.ACTIVE,
          lastValidatedAt: new Date(),
          lastErrorMessage: null,
        },
        include: { crawlJob: true },
      });
    } catch (error) {
      const shouldInvalidate = error instanceof CrawlerAuthError;
      const message =
        error instanceof Error ? error.message : 'Unknown validation error';

      return this.prisma.xAccountBinding.update({
        where: { id: binding.id },
        data: {
          status: shouldInvalidate ? BindingStatus.INVALID : binding.status,
          lastValidatedAt: new Date(),
          lastErrorMessage: message,
        },
        include: { crawlJob: true },
      });
    }
  }

  private async assertOwnership(userId: string, bindingId: string) {
    const binding = await this.prisma.xAccountBinding.findUnique({
      where: { id: bindingId },
    });

    if (!binding) {
      throw new NotFoundException('Binding not found');
    }

    if (binding.userId !== userId) {
      throw new ForbiddenException(
        'Binding does not belong to the current user',
      );
    }

    return binding;
  }

  private buildNextRunAt(intervalMinutes: number) {
    const now = new Date();

    return new Date(now.getTime() + intervalMinutes * 60 * 1000);
  }
}
