import { existsSync } from 'fs';
import {
  PublishBindingStatus,
  PublishJobStatus,
  PublishPlatformType,
} from '@prisma/client';
import { BadRequestException, Injectable } from '@nestjs/common';
import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
  type Response,
} from 'playwright';
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

const ZHIHU_CREATOR_URL = 'https://www.zhihu.com/creator';
const ZHIHU_SIGNIN_PATH = '/signin';
const ZHIHU_WRITE_URL = 'https://zhuanlan.zhihu.com/write';
const ZHIHU_ARTICLE_URL_PATTERN = /https:\/\/zhuanlan\.zhihu\.com\/p\/(\d+)/i;
const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36';
const DESKTOP_VIEWPORT = {
  width: 1440,
  height: 1024,
} as const;
const DEFAULT_SYSTEM_CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
] as const;
const IMG_TAG_PATTERN = /<img\b[^>]*\bsrc=(['"])(.*?)\1[^>]*>/gi;
const VIDEO_TAG_PATTERN = /<video\b([^>]*)>([\s\S]*?)<\/video>/gi;
const SOURCE_TAG_PATTERN = /<source\b[^>]*\bsrc=(['"])(.*?)\1[^>]*>/gi;
const LINK_TAG_PATTERN = /<a\b[^>]*\bhref=(['"])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi;
const PARAGRAPH_BREAK_PATTERN =
  /<\/(?:p|div|h1|h2|h3|h4|h5|h6|blockquote|li|figure|section|article)>/gi;
const NETWORK_CAPTURE_LIMIT = 40;
const PUBLISH_TIMEOUT_MS = 30000;

type ZhihuCredentialPayload = PublishCredentialPayload & {
  account?: string;
  accountId?: string;
  cookie?: string;
  cookies?: Array<Record<string, unknown>>;
  handle?: string;
  session?: string;
  userAgent?: string;
  username?: string;
};

type BrowserSession = {
  browser: Browser;
  context: BrowserContext;
  page: Page;
};

type BrowserCookie = Parameters<BrowserContext['addCookies']>[0][number];

type ZhihuNetworkCapture = Array<{
  payload: unknown;
  status: number;
  url: string;
}>;

@Injectable()
export class ZhihuPublishingChannelAdapter extends BasePublishingChannelAdapter {
  readonly platformType = PublishPlatformType.ZHIHU;

  protected readonly validationRule = {
    label: '知乎',
    identifierKeys: [
      'accountIdentifier',
      'username',
      'account',
      'accountId',
      'handle',
    ],
    requiredAnyKeys: ['cookie', 'session', 'authorization', 'account'],
  };

  async validateCredential(
    request: PublishingCredentialValidationRequest,
  ): Promise<PublishingCredentialValidationResult> {
    const normalizedPayload = this.parseCredentialPayload(
      request.credentialPayload,
    ) as ZhihuCredentialPayload;

    if (!this.hasBrowserCredential(normalizedPayload)) {
      return super.validateCredential(request);
    }

    let session: BrowserSession | null = null;

    try {
      session = await this.createAuthenticatedSession(
        normalizedPayload,
        ZHIHU_CREATOR_URL,
      );
      const extractedAccountIdentifier =
        (await this.extractAuthenticatedAccountIdentifier(session.page)) ??
        this.inferAccountIdentifier(
          normalizedPayload,
          this.validationRule.identifierKeys,
        );

      return {
        normalizedPayload,
        inferredAccountIdentifier: extractedAccountIdentifier,
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
          error instanceof Error ? error.message : '知乎凭证校验失败',
      };
    } finally {
      await this.closeSession(session);
    }
  }

  async publishDraft(
    request: PublishingDraftPublishRequest,
  ): Promise<PublishingDraftPublishResult> {
    const credentialPayload = this.ensureBrowserCredentialPayload(
      request.binding.credentialPayload,
    );
    const bodyText = this.convertRichHtmlToEditorText(
      request.draft.renderedHtml,
      request.draft.summary,
    );
    const topicCandidates = this.buildTopicCandidates(
      request.draft.tags.map((item) => item.name),
      request.draft.title,
    );
    let session: BrowserSession | null = null;

    try {
      session = await this.createAuthenticatedSession(
        credentialPayload,
        ZHIHU_WRITE_URL,
      );
      await this.waitForEditorReady(session.page);
      await this.fillDraftTitle(session.page, request.draft.title);
      await this.fillDraftBody(session.page, bodyText);

      const networkCapture = this.attachNetworkCapture(session.page);

      await this.clickPrimaryPublishButton(session.page);
      await this.completeOptionalPublishDialog(session.page, topicCandidates);

      const publishResult = await this.waitForPublishedResult(
        session.page,
        networkCapture,
      );

      return {
        remotePostId: publishResult.remotePostId,
        remotePostUrl: publishResult.remotePostUrl,
        status: publishResult.status ?? PublishJobStatus.SUCCESS,
        publishedAt: new Date(),
        metadataJson: {
          editorUrl: session.page.url(),
          title: request.draft.title,
          topicCandidates,
          ...(publishResult.metadataJson ?? {}),
        },
      };
    } finally {
      await this.closeSession(session);
    }
  }

  async syncPublishedMetadata(
    request: PublishingSyncPublishedMetadataRequest,
  ): Promise<PublishingSyncPublishedMetadataResult> {
    const credentialPayload = this.ensureBrowserCredentialPayload(
      request.binding.credentialPayload,
    );
    const targetUrl =
      this.normalizeArticleUrl(request.remotePostUrl) ??
      (request.remotePostId
        ? `https://zhuanlan.zhihu.com/p/${request.remotePostId}`
        : null);

    if (!targetUrl) {
      return {
        remotePostId: request.remotePostId ?? null,
        remotePostUrl: request.remotePostUrl ?? null,
        status: PublishJobStatus.RUNNING,
        publishedAt: null,
        metadataJson: {
          reason: 'Missing remotePostUrl and remotePostId for Zhihu sync',
        },
      };
    }

    let session: BrowserSession | null = null;

    try {
      session = await this.createAuthenticatedSession(credentialPayload, targetUrl);
      const resolvedArticleUrl = this.normalizeArticleUrl(session.page.url());
      const resolvedRemotePostId =
        this.extractArticleId(session.page.url()) ?? request.remotePostId ?? null;

      if (!resolvedArticleUrl || !(await this.isArticlePage(session.page))) {
        return {
          remotePostId: resolvedRemotePostId,
          remotePostUrl: resolvedArticleUrl ?? targetUrl,
          status: PublishJobStatus.FAILED,
          publishedAt: null,
          metadataJson: {
            reason: 'Unable to confirm a published Zhihu article page',
          },
        };
      }

      return {
        remotePostId: resolvedRemotePostId,
        remotePostUrl: resolvedArticleUrl,
        status: PublishJobStatus.SUCCESS,
        publishedAt: new Date(),
        metadataJson: {
          pageTitle: await session.page.title(),
        },
      };
    } finally {
      await this.closeSession(session);
    }
  }

  private async createAuthenticatedSession(
    payload: ZhihuCredentialPayload,
    targetUrl: string,
  ): Promise<BrowserSession> {
    const browser = await this.launchBrowser();
    const context = await browser.newContext({
      viewport: DESKTOP_VIEWPORT,
      userAgent: this.getTrimmedString(payload.userAgent) ?? DEFAULT_USER_AGENT,
    });

    await context.addCookies(this.normalizeCookies(payload));

    const page = await context.newPage();

    await page.goto(targetUrl, {
      waitUntil: 'domcontentloaded',
    });

    if (this.isSigninUrl(page.url())) {
      throw new Error('Unable to confirm an authenticated Zhihu session');
    }

    await page.waitForLoadState('networkidle').catch(() => undefined);

    if (this.isSigninUrl(page.url())) {
      throw new Error('Unable to confirm an authenticated Zhihu session');
    }

    return {
      browser,
      context,
      page,
    };
  }

  private async waitForEditorReady(page: Page) {
    await page.waitForFunction(
      () => {
        const textFields = Array.from(
          document.querySelectorAll('textarea, input, [contenteditable="true"]'),
        ).filter((node) => {
          const element = node as HTMLElement;
          const style = window.getComputedStyle(element);
          const rect = element.getBoundingClientRect();

          return (
            style.visibility !== 'hidden' &&
            style.display !== 'none' &&
            rect.width > 120 &&
            rect.height > 24
          );
        });

        return textFields.length > 0;
      },
      {
        timeout: 15000,
      },
    );
  }

  private async fillDraftTitle(page: Page, title: string) {
    const titleLocator = await this.findFirstVisibleLocator(page, [
      'textarea[placeholder*="标题"]',
      'input[placeholder*="标题"]',
      'textarea',
      'input[type="text"]',
      'input',
    ]);

    if (!titleLocator) {
      throw new Error('Unable to locate the Zhihu article title field');
    }

    await titleLocator.click();
    await titleLocator.fill(title.trim());
  }

  private async fillDraftBody(page: Page, bodyText: string) {
    const editorLocator = await this.findFirstVisibleLocator(page, [
      '.ProseMirror[contenteditable="true"]',
      '[data-slate-editor="true"]',
      '[contenteditable="true"][role="textbox"]',
      '[contenteditable="true"]',
    ]);

    if (!editorLocator) {
      throw new Error('Unable to locate the Zhihu article editor area');
    }

    await editorLocator.click();

    const editorHandle = await editorLocator.elementHandle();

    if (!editorHandle) {
      throw new Error('Unable to access the Zhihu article editor element');
    }

    await page.evaluate(
      ({ element, text }) => {
        const target = element as HTMLElement;

        target.focus();
        target.innerHTML = '';

        const paragraphs = text
          .split(/\n{2,}/)
          .map((item) => item.trim())
          .filter((item) => item.length > 0);

        if (paragraphs.length === 0) {
          target.textContent = text;
          target.dispatchEvent(
            new InputEvent('input', {
              bubbles: true,
            }),
          );
          return;
        }

        for (const paragraphText of paragraphs) {
          const paragraph = document.createElement('p');

          paragraph.textContent = paragraphText;
          target.appendChild(paragraph);
        }

        target.dispatchEvent(
          new InputEvent('input', {
            bubbles: true,
          }),
        );
      },
      {
        element: editorHandle,
        text: bodyText,
      },
    );
  }

  private async clickPrimaryPublishButton(page: Page) {
    const clicked = await this.clickFirstVisibleButton(page, [
      /发布文章/,
      /^发布$/,
      /发布/,
    ]);

    if (!clicked) {
      throw new Error('Unable to locate the Zhihu publish button');
    }
  }

  private async completeOptionalPublishDialog(
    page: Page,
    topicCandidates: string[],
  ) {
    const publishDialogVisible = await this.hasVisibleText(page, [
      '发布文章',
      '确认发布',
      '添加话题',
      '选择话题',
    ]);

    if (!publishDialogVisible) {
      return;
    }

    await this.tryFillTopicField(page, topicCandidates);

    await this.clickFirstVisibleButton(page, [
      /确认发布/,
      /立即发布/,
      /^发布$/,
      /完成/,
    ]);
  }

  private async waitForPublishedResult(
    page: Page,
    networkCapture: ZhihuNetworkCapture,
  ) {
    const startedAt = Date.now();

    while (Date.now() - startedAt < PUBLISH_TIMEOUT_MS) {
      const pageUrl = page.url();
      const articleUrlFromPage = this.normalizeArticleUrl(pageUrl);
      const articleIdFromPage = this.extractArticleId(pageUrl);

      if (articleUrlFromPage && articleIdFromPage) {
        return {
          remotePostId: articleIdFromPage,
          remotePostUrl: articleUrlFromPage,
          status: PublishJobStatus.SUCCESS,
          metadataJson: {
            source: 'page-url',
          },
        };
      }

      const responseResult = this.extractPublishedResultFromNetwork(networkCapture);

      if (responseResult) {
        return {
          remotePostId: responseResult.remotePostId,
          remotePostUrl: responseResult.remotePostUrl,
          status: PublishJobStatus.SUCCESS,
          metadataJson: {
            source: 'network-response',
            responseUrl: responseResult.responseUrl,
          },
        };
      }

      if (await this.hasVisibleText(page, ['发布成功', '已发布'])) {
        return {
          remotePostId: articleIdFromPage ?? null,
          remotePostUrl: articleUrlFromPage ?? null,
          status: PublishJobStatus.RUNNING,
          metadataJson: {
            source: 'success-toast',
          },
        };
      }

      if (await this.hasVisibleText(page, ['登录/注册', '验证码登录', '密码登录'])) {
        throw new Error('Zhihu session expired during publishing');
      }

      await page.waitForTimeout(1000);
    }

    throw new Error('Timed out waiting for Zhihu publish confirmation');
  }

  private attachNetworkCapture(page: Page): ZhihuNetworkCapture {
    const entries: ZhihuNetworkCapture = [];

    page.on('response', async (response) => {
      const capturedPayload = await this.captureResponsePayload(response);

      if (!capturedPayload) {
        return;
      }

      entries.unshift(capturedPayload);
      entries.splice(NETWORK_CAPTURE_LIMIT);
    });

    return entries;
  }

  private async captureResponsePayload(response: Response) {
    const url = response.url();

    if (!url.includes('zhihu.com')) {
      return null;
    }

    const contentType = response.headers()['content-type'] ?? '';

    if (!contentType.includes('application/json')) {
      return null;
    }

    try {
      const payload = await response.json();

      return {
        url,
        status: response.status(),
        payload,
      };
    } catch {
      return null;
    }
  }

  private extractPublishedResultFromNetwork(capture: ZhihuNetworkCapture) {
    for (const entry of capture) {
      const stringifiedPayload = JSON.stringify(entry.payload);
      const matchedArticleUrl = stringifiedPayload.match(ZHIHU_ARTICLE_URL_PATTERN);

      if (matchedArticleUrl?.[0]) {
        return {
          remotePostId: matchedArticleUrl[1] ?? null,
          remotePostUrl: matchedArticleUrl[0],
          responseUrl: entry.url,
        };
      }

      const extractedArticleId = this.findStringValueByKey(entry.payload, [
        'articleId',
        'postId',
        'id',
      ]);
      const extractedArticleUrl = this.findStringValueByPattern(
        entry.payload,
        ZHIHU_ARTICLE_URL_PATTERN,
      );

      if (extractedArticleUrl) {
        return {
          remotePostId:
            this.extractArticleId(extractedArticleUrl) ?? extractedArticleId,
          remotePostUrl: extractedArticleUrl,
          responseUrl: entry.url,
        };
      }

      if (extractedArticleId && entry.url.includes('article')) {
        return {
          remotePostId: extractedArticleId,
          remotePostUrl: `https://zhuanlan.zhihu.com/p/${extractedArticleId}`,
          responseUrl: entry.url,
        };
      }
    }

    return null;
  }

  private async tryFillTopicField(page: Page, topicCandidates: string[]) {
    const topicInput = await this.findFirstVisibleLocator(page, [
      'input[placeholder*="话题"]',
      'input[placeholder*="添加话题"]',
      'input[placeholder*="搜索话题"]',
      'input[placeholder*="标签"]',
    ]);

    if (!topicInput || topicCandidates.length === 0) {
      return;
    }

    for (const topicCandidate of topicCandidates.slice(0, 3)) {
      await topicInput.click();
      await topicInput.fill(topicCandidate);
      await page.waitForTimeout(500);

      const selected = await this.clickFirstVisibleLocator(page, [
        '[role="option"]',
        '.Select-option',
        '.MenuItem',
      ]);

      if (selected) {
        await page.waitForTimeout(300);
        return;
      }

      await page.keyboard.press('Enter').catch(() => undefined);
      await page.waitForTimeout(300);
    }
  }

  private async isArticlePage(page: Page) {
    const pageUrl = page.url();

    if (this.extractArticleId(pageUrl)) {
      return true;
    }

    return this.hasVisibleText(page, ['发布于', '赞同', '评论']);
  }

  private async extractAuthenticatedAccountIdentifier(page: Page) {
    return page.evaluate(() => {
      const candidates = Array.from(document.querySelectorAll('a[href]'))
        .map((node) => node.getAttribute('href') ?? '')
        .filter((value) => value.includes('/people/'));

      for (const candidate of candidates) {
        const matchedValue = candidate.match(/\/people\/([^/?#]+)/);

        if (matchedValue?.[1]) {
          return matchedValue[1];
        }
      }

      return null;
    });
  }

  private convertRichHtmlToEditorText(
    renderedHtml: string | null,
    summary: string | null,
  ) {
    const baseHtml =
      renderedHtml && renderedHtml.trim().length > 0
        ? renderedHtml
        : summary && summary.trim().length > 0
          ? `<p>${summary.trim()}</p>`
          : '<p>暂无正文内容。</p>';

    return baseHtml
      .replace(VIDEO_TAG_PATTERN, (_match, attributes: string, innerHtml: string) => {
        const srcMatch = attributes.match(/\bsrc=(['"])(.*?)\1/i);
        const nestedSourceMatch = innerHtml.match(SOURCE_TAG_PATTERN);
        const videoUrl =
          this.normalizeRemoteMediaUrl(srcMatch?.[2]) ??
          this.normalizeRemoteMediaUrl(nestedSourceMatch?.[2]);

        return videoUrl ? `\n视频链接：${videoUrl}\n` : '\n';
      })
      .replace(IMG_TAG_PATTERN, (_match, _quote, src: string) => {
        const imageUrl = this.normalizeRemoteMediaUrl(src);

        return imageUrl ? `\n图片链接：${imageUrl}\n` : '\n';
      })
      .replace(LINK_TAG_PATTERN, (_match, _quote, href: string, text: string) => {
        const normalizedHref = this.normalizeRemoteMediaUrl(href) ?? href;
        const normalizedText = text.replace(/<[^>]+>/g, '').trim();

        if (normalizedText.length === 0) {
          return normalizedHref;
        }

        return `${normalizedText} (${normalizedHref})`;
      })
      .replace(PARAGRAPH_BREAK_PATTERN, '\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private buildTopicCandidates(tagNames: string[], title: string) {
    const candidates = new Set<string>();

    for (const tagName of tagNames) {
      const normalizedTagName = tagName.trim();

      if (normalizedTagName.length > 0) {
        candidates.add(normalizedTagName);
      }
    }

    const titleKeywords = title
      .split(/[\s,，、|/]+/)
      .map((item) => item.trim())
      .filter((item) => item.length >= 2 && item.length <= 12);

    for (const titleKeyword of titleKeywords) {
      candidates.add(titleKeyword);
    }

    return Array.from(candidates).slice(0, 5);
  }

  private async findFirstVisibleLocator(page: Page, selectors: string[]) {
    for (const selector of selectors) {
      const locator = page.locator(selector).first();
      const count = await locator.count();

      if (count === 0) {
        continue;
      }

      if (await locator.isVisible().catch(() => false)) {
        return locator;
      }
    }

    return null;
  }

  private async clickFirstVisibleLocator(page: Page, selectors: string[]) {
    const locator = await this.findFirstVisibleLocator(page, selectors);

    if (!locator) {
      return false;
    }

    await locator.click();

    return true;
  }

  private async clickFirstVisibleButton(page: Page, labels: RegExp[]) {
    for (const label of labels) {
      const locator = page
        .locator('button, [role="button"]')
        .filter({
          hasText: label,
        })
        .first();
      const count = await locator.count();

      if (count === 0) {
        continue;
      }

      if (!(await locator.isVisible().catch(() => false))) {
        continue;
      }

      await locator.click();

      return true;
    }

    return false;
  }

  private async hasVisibleText(page: Page, texts: string[]) {
    for (const text of texts) {
      const locator = page.getByText(text, {
        exact: false,
      });
      const count = await locator.count();

      if (count === 0) {
        continue;
      }

      if (await locator.first().isVisible().catch(() => false)) {
        return true;
      }
    }

    return false;
  }

  private async closeSession(session: BrowserSession | null) {
    if (!session) {
      return;
    }

    await session.context.close().catch(() => undefined);
    await session.browser.close().catch(() => undefined);
  }

  private async launchBrowser() {
    const executablePath =
      this.resolveConfiguredExecutablePath() ??
      this.resolveSystemChromeExecutablePath();

    return chromium.launch({
      headless: true,
      executablePath: executablePath ?? undefined,
    });
  }

  private resolveConfiguredExecutablePath() {
    const configuredPath =
      process.env.ZHIHU_BROWSER_EXECUTABLE_PATH?.trim() ||
      process.env.X_BROWSER_EXECUTABLE_PATH?.trim();

    if (!configuredPath) {
      return null;
    }

    if (!existsSync(configuredPath)) {
      throw new Error(
        `Configured browser executable path does not exist: ${configuredPath}`,
      );
    }

    return configuredPath;
  }

  private resolveSystemChromeExecutablePath() {
    for (const candidate of DEFAULT_SYSTEM_CHROME_PATHS) {
      if (existsSync(candidate)) {
        return candidate;
      }
    }

    return null;
  }

  private ensureBrowserCredentialPayload(payload: PublishCredentialPayload) {
    const normalizedPayload = payload as ZhihuCredentialPayload;

    if (!this.hasBrowserCredential(normalizedPayload)) {
      throw new BadRequestException(
        '知乎真实发布需要 cookie 或 cookies 字段来恢复浏览器登录态',
      );
    }

    return normalizedPayload;
  }

  private hasBrowserCredential(payload: ZhihuCredentialPayload) {
    return Boolean(
      this.getTrimmedString(payload.cookie) ||
        (Array.isArray(payload.cookies) && payload.cookies.length > 0),
    );
  }

  private normalizeCookies(payload: ZhihuCredentialPayload) {
    if (Array.isArray(payload.cookies) && payload.cookies.length > 0) {
      const normalizedCookies: BrowserCookie[] = [];

      for (const item of payload.cookies) {
        const normalizedCookie = this.normalizeCookieObject(item);

        if (normalizedCookie) {
          normalizedCookies.push(normalizedCookie);
        }
      }

      return normalizedCookies;
    }

    const rawCookieHeader = this.getTrimmedString(payload.cookie);

    if (!rawCookieHeader) {
      throw new BadRequestException('Missing Zhihu cookie payload');
    }

    const normalizedCookies: BrowserCookie[] = [];

    for (const item of rawCookieHeader
      .split(';')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)) {
        const separatorIndex = item.indexOf('=');
        const name =
          separatorIndex === -1 ? item : item.slice(0, separatorIndex).trim();
        const value =
          separatorIndex === -1 ? '' : item.slice(separatorIndex + 1).trim();

        if (name.length === 0) {
          continue;
        }

        normalizedCookies.push({
          name,
          value,
          domain: '.zhihu.com',
          path: '/',
          httpOnly: false,
          secure: true,
          sameSite: 'Lax',
        });
    }

    return normalizedCookies;
  }

  private normalizeCookieObject(
    value: Record<string, unknown>,
  ): BrowserCookie | null {
    const name = this.getTrimmedString(value.name);
    const cookieValue = this.getTrimmedString(value.value);

    if (!name || cookieValue === null) {
      return null;
    }

    return {
      name,
      value: cookieValue,
      domain: this.getTrimmedString(value.domain) ?? '.zhihu.com',
      path: this.getTrimmedString(value.path) ?? '/',
      ...(typeof value.expires === 'number'
        ? { expires: value.expires }
        : {}),
      httpOnly: typeof value.httpOnly === 'boolean' ? value.httpOnly : false,
      secure: typeof value.secure === 'boolean' ? value.secure : true,
      sameSite:
        value.sameSite === 'Strict' ||
        value.sameSite === 'None' ||
        value.sameSite === 'Lax'
          ? value.sameSite
          : 'Lax',
    };
  }

  private isSigninUrl(url: string) {
    return url.includes(ZHIHU_SIGNIN_PATH);
  }

  private normalizeArticleUrl(value: string | null | undefined) {
    if (!value) {
      return null;
    }

    const matchedValue = value.match(ZHIHU_ARTICLE_URL_PATTERN);

    return matchedValue?.[0] ?? null;
  }

  private extractArticleId(value: string | null | undefined) {
    if (!value) {
      return null;
    }

    const matchedValue = value.match(ZHIHU_ARTICLE_URL_PATTERN);

    return matchedValue?.[1] ?? null;
  }

  private findStringValueByPattern(value: unknown, pattern: RegExp): string | null {
    if (typeof value === 'string') {
      const matchedValue = value.match(pattern);

      return matchedValue?.[0] ?? null;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const matchedValue = this.findStringValueByPattern(item, pattern);

        if (matchedValue) {
          return matchedValue;
        }
      }

      return null;
    }

    if (value && typeof value === 'object') {
      for (const nestedValue of Object.values(value)) {
        const matchedValue = this.findStringValueByPattern(nestedValue, pattern);

        if (matchedValue) {
          return matchedValue;
        }
      }
    }

    return null;
  }

  private findStringValueByKey(value: unknown, keys: string[]): string | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    for (const [nestedKey, nestedValue] of Object.entries(value)) {
      if (
        keys.includes(nestedKey) &&
        (typeof nestedValue === 'string' || typeof nestedValue === 'number')
      ) {
        return String(nestedValue);
      }

      const deepValue = this.findStringValueByKey(nestedValue, keys);

      if (deepValue) {
        return deepValue;
      }
    }

    return null;
  }

  private getTrimmedString(value: unknown) {
    return typeof value === 'string' && value.trim().length > 0
      ? value.trim()
      : null;
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
      const url =
        trimmedValue.startsWith('http://') ||
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
}
