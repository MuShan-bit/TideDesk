import { PublishBindingStatus, PublishJobStatus, PublishPlatformType } from '@prisma/client';
import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { BasePublishingChannelAdapter } from './base-publishing-channel.adapter';
import type {
  PublishCredentialPayload,
  PublishingCredentialValidationRequest,
  PublishingCredentialValidationResult,
  PublishingDraftPublishRequest,
  PublishingDraftPublishResult,
  PublishingSyncPublishedMetadataRequest,
  PublishingSyncPublishedMetadataResult,
} from '../publishing-channel-adapter.types';

const WECHAT_API_BASE_URL = 'https://api.weixin.qq.com/cgi-bin';
const WECHAT_ACCESS_TOKEN_URL = `${WECHAT_API_BASE_URL}/token`;
const WECHAT_VALIDATE_URL = `${WECHAT_API_BASE_URL}/getcallbackip`;
const WECHAT_DRAFT_ADD_URL = `${WECHAT_API_BASE_URL}/draft/add`;
const WECHAT_FREEPUBLISH_SUBMIT_URL = `${WECHAT_API_BASE_URL}/freepublish/submit`;
const WECHAT_FREEPUBLISH_GET_URL = `${WECHAT_API_BASE_URL}/freepublish/get`;
const WECHAT_UPLOAD_IMAGE_URL = `${WECHAT_API_BASE_URL}/media/uploadimg`;
const WECHAT_ADD_MATERIAL_URL = `${WECHAT_API_BASE_URL}/material/add_material`;
const WECHAT_PUBLISH_POLL_ATTEMPTS = 15;
const WECHAT_PUBLISH_POLL_INTERVAL_MS = 2000;
const IMG_TAG_PATTERN = /<img\b[^>]*\bsrc=(['"])(.*?)\1[^>]*>/gi;
const VIDEO_TAG_PATTERN = /<video\b([^>]*)>([\s\S]*?)<\/video>/gi;
const SOURCE_TAG_PATTERN = /<source\b[^>]*\bsrc=(['"])(.*?)\1[^>]*>/gi;

type WechatCredentialPayload = PublishCredentialPayload & {
  accessToken?: string;
  appId?: string;
  appSecret?: string;
  author?: string;
  authorizerAccessToken?: string;
  biz?: string;
  contentSourceUrl?: string;
  coverImageUrl?: string;
  needOpenComment?: boolean | number | string;
  onlyFansCanComment?: boolean | number | string;
  thumbMediaId?: string;
  username?: string;
};

type WechatAccessTokenResponse = {
  access_token?: string;
  errcode?: number;
  errmsg?: string;
  expires_in?: number;
};

type WechatValidateResponse = {
  errcode?: number;
  errmsg?: string;
  ip_list?: string[];
};

type WechatDraftAddResponse = {
  errcode?: number;
  errmsg?: string;
  media_id?: string;
};

type WechatFreePublishSubmitResponse = {
  errcode?: number;
  errmsg?: string;
  publish_id?: number | string;
};

type WechatFreePublishArticleItem = {
  article_id?: string;
  article_url?: string;
};

type WechatFreePublishStatusResponse = {
  article_detail?: {
    item?: WechatFreePublishArticleItem[];
  };
  article_id?: string;
  errcode?: number;
  errmsg?: string;
  fail_idx?: number[];
  publish_id?: number | string;
  publish_status?: number;
};

type WechatUploadImageResponse = {
  errcode?: number;
  errmsg?: string;
  url?: string;
};

type WechatAddMaterialResponse = {
  errcode?: number;
  errmsg?: string;
  media_id?: string;
  url?: string;
};

@Injectable()
export class WechatPublishingChannelAdapter extends BasePublishingChannelAdapter {
  readonly platformType = PublishPlatformType.WECHAT;

  protected readonly validationRule = {
    label: '微信公众号',
    identifierKeys: [
      'accountIdentifier',
      'biz',
      'appId',
      'accountId',
      'username',
    ],
    requiredAnyKeys: ['appId', 'biz', 'cookie', 'accessToken'],
  };

  async validateCredential(
    request: PublishingCredentialValidationRequest,
  ): Promise<PublishingCredentialValidationResult> {
    const normalizedPayload = this.parseCredentialPayload(
      request.credentialPayload,
    ) as WechatCredentialPayload;

    if (!this.shouldUseWechatApi(normalizedPayload)) {
      return super.validateCredential(request);
    }

    try {
      const accessToken = await this.resolveAccessToken(normalizedPayload);

      await this.requestWechatJson<WechatValidateResponse>(
        `${WECHAT_VALIDATE_URL}?access_token=${encodeURIComponent(accessToken)}`,
        {
          method: 'GET',
        },
        '校验公众号凭证',
      );

      return {
        normalizedPayload,
        inferredAccountIdentifier: this.inferAccountIdentifier(
          normalizedPayload,
          this.validationRule.identifierKeys,
        ),
        status: PublishBindingStatus.ACTIVE,
        validationError: null,
      };
    } catch (error) {
      return {
        normalizedPayload,
        inferredAccountIdentifier: this.inferAccountIdentifier(
          normalizedPayload,
          this.validationRule.identifierKeys,
        ),
        status: PublishBindingStatus.INVALID,
        validationError:
          error instanceof Error
            ? error.message
            : '微信公众号凭证校验失败',
      };
    }
  }

  async publishDraft(
    request: PublishingDraftPublishRequest,
  ): Promise<PublishingDraftPublishResult> {
    const credentialPayload = this.ensureWechatCredentialPayload(
      request.binding.credentialPayload,
    );
    const accessToken = await this.resolveAccessToken(credentialPayload);
    const transformedContent = await this.transformDraftContent(
      accessToken,
      request.draft.renderedHtml,
    );
    const thumbMediaId = await this.resolveThumbMediaId(
      accessToken,
      credentialPayload,
      transformedContent.originalFirstImageUrl,
    );
    const draftAddPayload = {
      articles: [
        {
          title: request.draft.title.trim(),
          author:
            this.getTrimmedString(credentialPayload.author) ??
            request.binding.displayName,
          digest: this.buildDraftDigest(request.draft.summary, transformedContent.html),
          content: transformedContent.html,
          content_source_url:
            this.getTrimmedString(credentialPayload.contentSourceUrl) ?? '',
          thumb_media_id: thumbMediaId,
          need_open_comment: this.normalizeBooleanFlag(
            credentialPayload.needOpenComment,
            false,
          )
            ? 1
            : 0,
          only_fans_can_comment: this.normalizeBooleanFlag(
            credentialPayload.onlyFansCanComment,
            false,
          )
            ? 1
            : 0,
        },
      ],
    };
    const draftAddResponse = await this.requestWechatJson<WechatDraftAddResponse>(
      `${WECHAT_DRAFT_ADD_URL}?access_token=${encodeURIComponent(accessToken)}`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(draftAddPayload),
      },
      '创建公众号草稿',
    );
    const mediaId = this.getTrimmedString(draftAddResponse.media_id);

    if (!mediaId) {
      throw new Error('微信公众号草稿创建成功，但未返回 media_id');
    }

    const submitResponse =
      await this.requestWechatJson<WechatFreePublishSubmitResponse>(
        `${WECHAT_FREEPUBLISH_SUBMIT_URL}?access_token=${encodeURIComponent(
          accessToken,
        )}`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            media_id: mediaId,
          }),
        },
        '提交公众号发布',
      );
    const publishId = this.getPublishId(submitResponse.publish_id);
    const syncResult = await this.pollPublishedMetadata(
      {
        ...request,
        binding: {
          ...request.binding,
          credentialPayload,
        },
      },
      publishId,
    );

    return {
      remotePostId: publishId,
      remotePostUrl: syncResult.remotePostUrl ?? null,
      status: syncResult.status ?? PublishJobStatus.RUNNING,
      publishedAt: syncResult.publishedAt ?? null,
      metadataJson: {
        coverThumbMediaId: thumbMediaId,
        draftMediaId: mediaId,
        ...(syncResult.metadataJson ?? {}),
      },
    };
  }

  async syncPublishedMetadata(
    request: PublishingSyncPublishedMetadataRequest,
  ): Promise<PublishingSyncPublishedMetadataResult> {
    const credentialPayload = this.ensureWechatCredentialPayload(
      request.binding.credentialPayload,
    );
    const accessToken = await this.resolveAccessToken(credentialPayload);
    const publishId = this.getPublishId(request.remotePostId);
    const publishIdValue = Number.parseInt(publishId, 10);
    const publishStatus =
      await this.requestWechatJson<WechatFreePublishStatusResponse>(
        `${WECHAT_FREEPUBLISH_GET_URL}?access_token=${encodeURIComponent(
          accessToken,
        )}`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            publish_id: Number.isNaN(publishIdValue) ? publishId : publishIdValue,
          }),
        },
        '同步公众号发布回执',
      );

    return this.mapPublishStatusResponse(publishId, publishStatus);
  }

  private async pollPublishedMetadata(
    request: PublishingDraftPublishRequest,
    publishId: string,
  ) {
    for (let attempt = 0; attempt < WECHAT_PUBLISH_POLL_ATTEMPTS; attempt += 1) {
      const result = await this.syncPublishedMetadata({
        binding: request.binding,
        publishJobId: `draft:${request.draft.id}`,
        remotePostId: publishId,
        remotePostUrl: null,
      });

      if (result.status === PublishJobStatus.SUCCESS) {
        return result;
      }

      if (result.status === PublishJobStatus.FAILED) {
        const failureReason =
          typeof result.metadataJson?.failureReason === 'string'
            ? result.metadataJson.failureReason
            : '微信公众号发布失败';

        throw new Error(failureReason);
      }

      if (attempt < WECHAT_PUBLISH_POLL_ATTEMPTS - 1) {
        await this.sleep(WECHAT_PUBLISH_POLL_INTERVAL_MS);
      }
    }

    return {
      remotePostId: publishId,
      remotePostUrl: null,
      status: PublishJobStatus.RUNNING,
      publishedAt: null,
      metadataJson: {
        publishStatus: 'PENDING_CONFIRMATION',
      },
    } satisfies PublishingSyncPublishedMetadataResult;
  }

  private async transformDraftContent(
    accessToken: string,
    renderedHtml: string | null,
  ) {
    const sanitizedHtml = this.normalizeDraftHtml(renderedHtml);
    const originalFirstImageUrl = this.extractFirstImageUrl(sanitizedHtml);
    const htmlWithoutVideo = this.replaceVideoTagsWithLinks(sanitizedHtml);
    const bodyImageMap = await this.uploadBodyImages(accessToken, htmlWithoutVideo);
    const transformedHtml = htmlWithoutVideo.replace(
      IMG_TAG_PATTERN,
      (tag, quote, src: string) => {
        const normalizedSource = this.normalizeRemoteMediaUrl(src);
        const uploadedSource = normalizedSource
          ? bodyImageMap.get(normalizedSource)
          : undefined;

        if (!uploadedSource) {
          return tag;
        }

        return tag.replace(src, uploadedSource);
      },
    );

    return {
      html: transformedHtml,
      originalFirstImageUrl,
    };
  }

  private normalizeDraftHtml(renderedHtml: string | null) {
    const baseHtml = renderedHtml?.trim().length
      ? renderedHtml.trim()
      : '<p>暂无正文内容。</p>';

    return baseHtml
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<figure\b[^>]*>/gi, '<p>')
      .replace(/<\/figure>/gi, '</p>')
      .replace(/<aside\b[^>]*>/gi, '<blockquote>')
      .replace(/<\/aside>/gi, '</blockquote>')
      .replace(/<span\b[^>]*>/gi, '<span>');
  }

  private replaceVideoTagsWithLinks(value: string) {
    return value.replace(
      VIDEO_TAG_PATTERN,
      (match, attributes: string, innerHtml: string) => {
        const srcMatch = attributes.match(/\bsrc=(['"])(.*?)\1/i);
        const posterMatch = attributes.match(/\bposter=(['"])(.*?)\1/i);
        const nestedSourceMatch = innerHtml?.match(SOURCE_TAG_PATTERN);
        const nestedSourceUrl = nestedSourceMatch?.[2];
        const resolvedVideoUrl =
          this.normalizeRemoteMediaUrl(srcMatch?.[2]) ??
          this.normalizeRemoteMediaUrl(nestedSourceUrl);
        const resolvedPosterUrl = this.normalizeRemoteMediaUrl(
          posterMatch?.[2],
        );

        if (!resolvedVideoUrl && !resolvedPosterUrl) {
          return '';
        }

        if (resolvedPosterUrl && resolvedVideoUrl) {
          return `<p><a href="${resolvedVideoUrl}" target="_blank" rel="noopener noreferrer"><img src="${resolvedPosterUrl}" alt="" /></a></p>`;
        }

        if (resolvedPosterUrl) {
          return `<p><img src="${resolvedPosterUrl}" alt="" /></p>`;
        }

        return `<p><a href="${resolvedVideoUrl}" target="_blank" rel="noopener noreferrer">查看原视频</a></p>`;
      },
    );
  }

  private async uploadBodyImages(accessToken: string, html: string) {
    const imageUrls = Array.from(html.matchAll(IMG_TAG_PATTERN))
      .map((match) => this.normalizeRemoteMediaUrl(match[2]))
      .filter((item): item is string => Boolean(item));
    const uniqueImageUrls = Array.from(new Set(imageUrls));
    const uploadedImageMap = new Map<string, string>();

    for (const imageUrl of uniqueImageUrls) {
      if (this.isWechatHostedImage(imageUrl)) {
        uploadedImageMap.set(imageUrl, imageUrl);
        continue;
      }

      uploadedImageMap.set(
        imageUrl,
        await this.uploadArticleImage(accessToken, imageUrl),
      );
    }

    return uploadedImageMap;
  }

  private async resolveThumbMediaId(
    accessToken: string,
    payload: WechatCredentialPayload,
    firstImageUrl: string | null,
  ) {
    const explicitThumbMediaId = this.getTrimmedString(payload.thumbMediaId);

    if (explicitThumbMediaId) {
      return explicitThumbMediaId;
    }

    const coverImageUrl =
      this.normalizeRemoteMediaUrl(payload.coverImageUrl) ?? firstImageUrl;

    if (!coverImageUrl) {
      throw new BadRequestException(
        '微信公众号发布需要封面，请提供 thumbMediaId、coverImageUrl，或确保草稿正文里至少包含一张图片',
      );
    }

    return this.uploadCoverMaterial(accessToken, coverImageUrl);
  }

  private async uploadArticleImage(accessToken: string, imageUrl: string) {
    const asset = await this.downloadRemoteAsset(imageUrl);
    const formData = new FormData();

    formData.append(
      'media',
      new Blob([asset.buffer], {
        type: asset.contentType,
      }),
      asset.fileName,
    );

    const uploadResponse =
      await this.requestWechatJson<WechatUploadImageResponse>(
        `${WECHAT_UPLOAD_IMAGE_URL}?access_token=${encodeURIComponent(
          accessToken,
        )}`,
        {
          method: 'POST',
          body: formData,
        },
        '上传公众号正文图片',
      );
    const uploadedUrl = this.getTrimmedString(uploadResponse.url);

    if (!uploadedUrl) {
      throw new Error('公众号正文图片上传成功，但未返回可用的 URL');
    }

    return uploadedUrl;
  }

  private async uploadCoverMaterial(accessToken: string, imageUrl: string) {
    const asset = await this.downloadRemoteAsset(imageUrl);
    const formData = new FormData();

    formData.append(
      'media',
      new Blob([asset.buffer], {
        type: asset.contentType,
      }),
      asset.fileName,
    );

    const addMaterialResponse =
      await this.requestWechatJson<WechatAddMaterialResponse>(
        `${WECHAT_ADD_MATERIAL_URL}?access_token=${encodeURIComponent(
          accessToken,
        )}&type=image`,
        {
          method: 'POST',
          body: formData,
        },
        '上传公众号封面素材',
      );
    const mediaId = this.getTrimmedString(addMaterialResponse.media_id);

    if (!mediaId) {
      throw new Error('公众号封面素材上传成功，但未返回 media_id');
    }

    return mediaId;
  }

  private async downloadRemoteAsset(url: string) {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`下载远程资源失败：${response.status} ${response.statusText}`);
    }

    const contentType =
      response.headers.get('content-type')?.split(';')[0]?.trim() ??
      'application/octet-stream';
    const buffer = await response.arrayBuffer();
    const urlObject = new URL(url);
    const rawFileName =
      urlObject.pathname.split('/').filter(Boolean).at(-1) ?? 'upload.bin';
    const fileName = rawFileName.includes('.') ? rawFileName : `${rawFileName}.bin`;

    return {
      buffer,
      contentType,
      fileName,
    };
  }

  private async resolveAccessToken(payload: WechatCredentialPayload) {
    const directAccessToken =
      this.getTrimmedString(payload.accessToken) ??
      this.getTrimmedString(payload.authorizerAccessToken);

    if (directAccessToken) {
      return directAccessToken;
    }

    const appId = this.getTrimmedString(payload.appId);
    const appSecret = this.getTrimmedString(payload.appSecret);

    if (!appId || !appSecret) {
      throw new BadRequestException(
        '微信公众号真实发布需要 accessToken，或同时提供 appId 与 appSecret',
      );
    }

    const tokenResponse =
      await this.requestWechatJson<WechatAccessTokenResponse>(
        `${WECHAT_ACCESS_TOKEN_URL}?grant_type=client_credential&appid=${encodeURIComponent(
          appId,
        )}&secret=${encodeURIComponent(appSecret)}`,
        {
          method: 'GET',
        },
        '获取公众号 access_token',
      );
    const accessToken = this.getTrimmedString(tokenResponse.access_token);

    if (!accessToken) {
      throw new Error('公众号 access_token 获取成功，但响应中缺少 access_token 字段');
    }

    return accessToken;
  }

  private async requestWechatJson<T extends { errcode?: number; errmsg?: string }>(
    url: string,
    init: RequestInit,
    actionLabel: string,
  ) {
    const response = await fetch(url, init);
    const text = await response.text();
    let payload: T | null = null;

    try {
      payload = text.length > 0 ? (JSON.parse(text) as T) : null;
    } catch {
      throw new Error(`${actionLabel}失败：微信返回了无法解析的响应`);
    }

    if (!response.ok) {
      throw new Error(
        `${actionLabel}失败：${response.status} ${response.statusText}`,
      );
    }

    if (payload?.errcode && payload.errcode !== 0) {
      throw new Error(
        `${actionLabel}失败：${payload.errcode} ${payload.errmsg ?? '未知错误'}`,
      );
    }

    if (!payload) {
      throw new Error(`${actionLabel}失败：微信返回了空响应`);
    }

    return payload;
  }

  private mapPublishStatusResponse(
    publishId: string,
    response: WechatFreePublishStatusResponse,
  ) {
    const publishStatus = response.publish_status ?? -1;
    const articleItem = response.article_detail?.item?.[0];
    const articleUrl =
      this.getTrimmedString(articleItem?.article_url) ?? null;
    const articleId =
      this.getTrimmedString(articleItem?.article_id) ??
      this.getTrimmedString(response.article_id) ??
      null;

    if (publishStatus === 0) {
      return {
        remotePostId: publishId,
        remotePostUrl: articleUrl,
        status: PublishJobStatus.SUCCESS,
        publishedAt: new Date(),
        metadataJson: {
          articleId,
          publishStatus,
        },
      } satisfies PublishingSyncPublishedMetadataResult;
    }

    if (publishStatus === 1) {
      return {
        remotePostId: publishId,
        remotePostUrl: articleUrl,
        status: PublishJobStatus.RUNNING,
        publishedAt: null,
        metadataJson: {
          articleId,
          publishStatus,
        },
      } satisfies PublishingSyncPublishedMetadataResult;
    }

    return {
      remotePostId: publishId,
      remotePostUrl: articleUrl,
      status: PublishJobStatus.FAILED,
      publishedAt: null,
      metadataJson: {
        articleId,
        failIndexes: response.fail_idx ?? [],
        failureReason: `微信公众号发布失败，publish_status=${publishStatus}`,
        publishStatus,
      },
    } satisfies PublishingSyncPublishedMetadataResult;
  }

  private buildDraftDigest(summary: string | null, html: string) {
    const summaryText = summary?.trim();

    if (summaryText) {
      return summaryText.slice(0, 120);
    }

    return html
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120);
  }

  private shouldUseWechatApi(payload: WechatCredentialPayload) {
    return Boolean(
      this.getTrimmedString(payload.accessToken) ||
        this.getTrimmedString(payload.authorizerAccessToken) ||
        (this.getTrimmedString(payload.appId) &&
          this.getTrimmedString(payload.appSecret)),
    );
  }

  private ensureWechatCredentialPayload(payload: PublishCredentialPayload) {
    return payload as WechatCredentialPayload;
  }

  private getTrimmedString(value: unknown) {
    return typeof value === 'string' && value.trim().length > 0
      ? value.trim()
      : null;
  }

  private getPublishId(value: string | number | null | undefined) {
    if (typeof value === 'number') {
      return String(value);
    }

    const publishId = this.getTrimmedString(value);

    if (!publishId) {
      throw new Error('微信公众号发布提交成功，但未返回 publish_id');
    }

    return publishId;
  }

  private normalizeBooleanFlag(
    value: boolean | number | string | undefined,
    fallbackValue: boolean,
  ) {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      return value !== 0;
    }

    if (typeof value === 'string') {
      const normalizedValue = value.trim().toLowerCase();

      if (['1', 'true', 'yes', 'y'].includes(normalizedValue)) {
        return true;
      }

      if (['0', 'false', 'no', 'n'].includes(normalizedValue)) {
        return false;
      }
    }

    return fallbackValue;
  }

  private extractFirstImageUrl(value: string) {
    for (const match of value.matchAll(IMG_TAG_PATTERN)) {
      const normalizedUrl = this.normalizeRemoteMediaUrl(match[2]);

      if (normalizedUrl) {
        return normalizedUrl;
      }
    }

    return null;
  }

  private normalizeRemoteMediaUrl(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmedValue = value.trim();

    if (trimmedValue.length === 0) {
      return null;
    }

    try {
      const normalizedValue = trimmedValue.startsWith('//')
        ? `https:${trimmedValue}`
        : trimmedValue;
      const url = trimmedValue.startsWith('http://') ||
        trimmedValue.startsWith('https://') ||
        trimmedValue.startsWith('//')
        ? new URL(normalizedValue)
        : new URL(trimmedValue, 'http://localhost');

      if (url.pathname === '/api/media-proxy') {
        const proxiedUrl = url.searchParams.get('url');

        return proxiedUrl ? this.normalizeRemoteMediaUrl(proxiedUrl) : null;
      }

      if (!['http:', 'https:'].includes(url.protocol)) {
        return null;
      }

      if (url.origin === 'http://localhost' && trimmedValue.startsWith('/')) {
        return null;
      }

      return url.toString();
    } catch {
      return null;
    }
  }

  private isWechatHostedImage(value: string) {
    try {
      const url = new URL(value);

      return url.hostname.endsWith('qpic.cn') || url.hostname.endsWith('qq.com');
    } catch {
      return false;
    }
  }

  private sleep(durationMs: number) {
    return new Promise((resolve) => {
      setTimeout(resolve, durationMs);
    });
  }
}
