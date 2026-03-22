import {
  PublishBindingStatus,
  PublishPlatformType,
  UserRole,
} from '@prisma/client';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../app.module';
import { CredentialCryptoService } from '../crypto/credential-crypto.service';
import { PrismaService } from '../prisma/prisma.service';
import { PublishingService } from './publishing.service';

describe('PublishingService', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let publishingService: PublishingService;
  let credentialCryptoService: CredentialCryptoService;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    publishingService = moduleRef.get(PublishingService);
    credentialCryptoService = moduleRef.get(CredentialCryptoService);

    await prisma.user.deleteMany({
      where: {
        id: {
          in: ['publish_owner', 'publish_other'],
        },
      },
    });

    await prisma.user.createMany({
      data: [
        {
          id: 'publish_owner',
          email: 'publish_owner@example.com',
          name: 'Publish Owner',
          role: UserRole.USER,
        },
        {
          id: 'publish_other',
          email: 'publish_other@example.com',
          name: 'Publish Other',
          role: UserRole.USER,
        },
      ],
    });
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('creates, encrypts, infers, and lists publish channel bindings', async () => {
    const wechatBinding = await publishingService.createPublishChannelBinding(
      'publish_owner',
      {
        platformType: PublishPlatformType.WECHAT,
        displayName: '微信公众号主号',
        credentialPayload: JSON.stringify({
          appId: 'wx-app-001',
          cookie: 'wx_cookie=value',
        }),
      },
    );
    await publishingService.createPublishChannelBinding('publish_owner', {
      platformType: PublishPlatformType.ZHIHU,
      displayName: '知乎专栏',
      accountIdentifier: 'zhihu-column-demo',
      credentialPayload: JSON.stringify({
        cookie: 'zhihu_cookie=value',
      }),
    });

    const list = await publishingService.listPublishChannelBindings(
      'publish_owner',
      {
        platformType: PublishPlatformType.WECHAT,
      },
    );

    expect(wechatBinding.status).toBe(PublishBindingStatus.ACTIVE);
    expect(wechatBinding.accountIdentifier).toBe('wx-app-001');
    expect(wechatBinding.lastValidatedAt).toBeInstanceOf(Date);
    expect(wechatBinding.lastValidationError).toBeNull();
    expect(
      credentialCryptoService.decrypt(wechatBinding.authPayloadEncrypted),
    ).toBe(JSON.stringify({ appId: 'wx-app-001', cookie: 'wx_cookie=value' }));

    expect(list).toHaveLength(1);
    expect(list[0]?.platformType).toBe(PublishPlatformType.WECHAT);
  });

  it('marks structurally invalid bindings and supports update, revalidate, and disable', async () => {
    const invalidBinding = await publishingService.createPublishChannelBinding(
      'publish_owner',
      {
        platformType: PublishPlatformType.CSDN,
        displayName: 'CSDN 草稿箱',
        credentialPayload: JSON.stringify({
          note: 'missing required auth keys',
        }),
      },
    );

    expect(invalidBinding.status).toBe(PublishBindingStatus.INVALID);
    expect(invalidBinding.lastValidationError).toContain('CSDN凭证缺少关键字段');

    const updatedBinding = await publishingService.updatePublishChannelBinding(
      'publish_owner',
      invalidBinding.id,
      {
        credentialPayload: JSON.stringify({
          account: 'csdn_demo',
          csrfToken: 'csrf-demo',
        }),
      },
    );

    expect(updatedBinding.status).toBe(PublishBindingStatus.ACTIVE);
    expect(updatedBinding.accountIdentifier).toBe('csdn_demo');
    expect(updatedBinding.lastValidationError).toBeNull();

    await prisma.publishChannelBinding.update({
      where: {
        id: updatedBinding.id,
      },
      data: {
        authPayloadEncrypted: 'broken-payload',
      },
    });

    const revalidatedBinding =
      await publishingService.revalidatePublishChannelBinding(
        'publish_owner',
        updatedBinding.id,
      );

    expect(revalidatedBinding.status).toBe(PublishBindingStatus.INVALID);
    expect(revalidatedBinding.lastValidationError).toContain(
      'Unable to decrypt or validate credential payload',
    );

    const disabledBinding = await publishingService.disablePublishChannelBinding(
      'publish_owner',
      updatedBinding.id,
    );

    expect(disabledBinding.status).toBe(PublishBindingStatus.DISABLED);
  });

  it('isolates publish channel bindings by user', async () => {
    const otherBinding = await publishingService.createPublishChannelBinding(
      'publish_other',
      {
        platformType: PublishPlatformType.ZHIHU,
        displayName: 'Other Zhihu',
        credentialPayload: JSON.stringify({
          cookie: 'other-cookie',
        }),
      },
    );

    await expect(
      publishingService.getPublishChannelBinding('publish_owner', otherBinding.id),
    ).rejects.toBeInstanceOf(NotFoundException);

    await expect(
      publishingService.updatePublishChannelBinding(
        'publish_owner',
        otherBinding.id,
        {
          displayName: 'Hacked',
        },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
