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

const CSDN_CREATOR_URL = 'https://mp.csdn.net/mp_blog/manage/article';
const CSDN_WRITE_URL = 'https://mp.csdn.net/edit';
const CSDN_SIGNIN_HOST = 'passport.csdn.net';
const CSDN_ARTICLE_URL_PATTERN =
  /https:\/\/blog\.csdn\.net\/([^/?#]+)\/article\/details\/(\d+)/i;
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

type CsdnCredentialPayload = PublishCredentialPayload & {
  account?: string;
  accountId?: string;
  blog?: string;
  blogUrl?: string;
  cookie?: string;
  cookies?: Array<Record<string, unknown>>;
  csrfToken?: string;
  handle?: string;
  session?: string;
  userAgent?: string;
  username?: string;
  userToken?: string;
};

type BrowserSession = {
  browser: Browser;
  context: BrowserContext;
  page: Page;
};

type BrowserCookie = Parameters<BrowserContext['addCookies']>[0][number];

type CsdnNetworkCapture = Array<{
  payload: unknown;
  status: number;
  url: string;
}>;

@Injectable()
export class CsdnPublishingChannelAdapter extends BasePublishingChannelAdapter {
  readonly platformType = PublishPlatformType.CSDN;

  protected readonly validationRule = {
    label: 'CSDN',
    identifierKeys: [
      'accountIdentifier',
      'username',
      'blog',
      'account',
      'accountId',
      'handle',
      'userToken',
    ],
    requiredAnyKeys: ['cookie', 'cookies', 'userToken', 'csrfToken', 'account'],
  };

  async validateCredential(
    request: PublishingCredentialValidationRequest,
  ): Promise<PublishingCredentialValidationResult> {
    const normalizedPayload = this.parseCredentialPayload(
      request.credentialPayload,
    ) as CsdnCredentialPayload;

    if (!this.hasBrowserCredential(normalizedPayload)) {
      return super.validateCredential(request);
    }

    let session: BrowserSession | null = null;

    try {
      session = await this.createAuthenticatedSession(
        normalizedPayload,
        CSDN_CREATOR_URL,
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
          error instanceof Error ? error.message : 'CSDN 凭证校验失败',
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
    const tagCandidates = this.buildTagCandidates(
      request.draft.tags.map((item) => item.name),
      request.draft.title,
    );
    let session: BrowserSession | null = null;

    try {
      session = await this.createAuthenticatedSession(
        credentialPayload,
        CSDN_WRITE_URL,
      );
      await this.waitForEditorReady(session.page);
      await this.fillDraftTitle(session.page, request.draft.title);
      await this.fillDraftBody(session.page, bodyText);

      const networkCapture = this.attachNetworkCapture(session.page);

      await this.clickPrimaryPublishButton(session.page);
      await this.completeOptionalPublishDialog(session.page, tagCandidates);

      const publishResult = await this.waitForPublishedResult(
        session.page,
        networkCapture,
        request.binding.accountIdentifier,
      );

      return {
        remotePostId: publishResult.remotePostId,
        remotePostUrl: publishResult.remotePostUrl,
        status: publishResult.status ?? PublishJobStatus.SUCCESS,
        publishedAt: new Date(),
        metadataJson: {
          editorUrl: session.page.url(),
          title: request.draft.title,
          tagCandidates,
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
        ? this.buildArticleUrl(
            request.binding.accountIdentifier,
            request.remotePostId,
          )
        : null);

    if (!targetUrl) {
      return {
        remotePostId: request.remotePostId ?? null,
        remotePostUrl: request.remotePostUrl ?? null,
        status: PublishJobStatus.RUNNING,
        publishedAt: null,
        metadataJson: {
          reason: 'Missing remotePostUrl and remotePostId for CSDN sync',
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
            reason: 'Unable to confirm a published CSDN article page',
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
    payload: CsdnCredentialPayload,
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
      throw new Error('Unable to confirm an authenticated CSDN session');
    }

    await page.waitForLoadState('networkidle').catch(() => undefined);

    if (this.isSigninUrl(page.url())) {
      throw new Error('Unable to confirm an authenticated CSDN session');
    }

    if (await this.hasVisibleText(page, ['微信登录', '验证码登录', '登录可享更多权益'])) {
      throw new Error('Unable to confirm an authenticated CSDN session');
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
        const titleFields = Array.from(
          document.querySelectorAll('input, textarea'),
        ).filter((node) => {
          const element = node as HTMLElement;
          const placeholder =
            'placeholder' in element
              ? (element as HTMLInputElement | HTMLTextAreaElement).placeholder
              : '';
          const style = window.getComputedStyle(element);
          const rect = element.getBoundingClientRect();

          return (
            placeholder.includes('标题') &&
            style.visibility !== 'hidden' &&
            style.display !== 'none' &&
            rect.width > 120 &&
            rect.height > 24
          );
        });

        const editorFields = Array.from(
          document.querySelectorAll(
            'textarea, [contenteditable="true"], .monaco-editor, .CodeMirror, .bytemd-body',
          ),
        ).filter((node) => {
          const element = node as HTMLElement;
          const style = window.getComputedStyle(element);
          const rect = element.getBoundingClientRect();

          return (
            style.visibility !== 'hidden' &&
            style.display !== 'none' &&
            rect.width > 200 &&
            rect.height > 120
          );
        });

        return titleFields.length > 0 && editorFields.length > 0;
      },
      {
        timeout: 15000,
      },
    );
  }

  private async fillDraftTitle(page: Page, title: string) {
    const titleLocator = await this.findFirstVisibleLocator(page, [
      'input[placeholder*="标题"]',
      'textarea[placeholder*="标题"]',
      'input[name*="title"]',
      'input[type="text"]',
      'input',
    ]);

    if (!titleLocator) {
      throw new Error('Unable to locate the CSDN article title field');
    }

    await titleLocator.click();
    await titleLocator.fill(title.trim());
  }

  private async fillDraftBody(page: Page, bodyText: string) {
    const editorLocator = await this.findFirstVisibleLocator(page, [
      '.monaco-editor',
      '.CodeMirror',
      '.bytemd-body',
      'textarea[placeholder*="内容"]',
      'textarea[placeholder*="正文"]',
      '[contenteditable="true"][role="textbox"]',
      '[contenteditable="true"]',
      'textarea',
    ]);

    if (!editorLocator) {
      throw new Error('Unable to locate the CSDN article editor area');
    }

    const editorElement = await editorLocator.elementHandle();

    if (!editorElement) {
      throw new Error('Unable to access the CSDN article editor element');
    }

    const tagName = await editorElement.evaluate((element) => element.tagName);

    if (tagName === 'TEXTAREA') {
      await editorLocator.fill(bodyText);
      return;
    }

    await editorLocator.click();

    await page.keyboard.press('Meta+A').catch(() => undefined);
    await page.keyboard.press('Control+A').catch(() => undefined);
    await page.keyboard.press('Backspace').catch(() => undefined);
    await page.keyboard.insertText(bodyText);
  }

  private async clickPrimaryPublishButton(page: Page) {
    const clicked = await this.clickFirstVisibleButton(page, [
      /发布文章/,
      /^发布$/,
      /立即发布/,
      /下一步/,
    ]);

    if (!clicked) {
      throw new Error('Unable to locate the CSDN publish button');
    }
  }

  private async completeOptionalPublishDialog(
    page: Page,
    tagCandidates: string[],
  ) {
    const publishDialogVisible = await this.hasVisibleText(page, [
      '发布文章',
      '发布设置',
      '文章标签',
      '文章分类',
      '确认发布',
    ]);

    if (!publishDialogVisible) {
      return;
    }

    await this.trySelectOriginalType(page);
    await this.tryFillTagField(page, tagCandidates);
    await this.clickFirstVisibleButton(page, [
      /确认发布/,
      /发布文章/,
      /^发布$/,
      /立即发布/,
      /确定/,
    ]);
  }

  private async waitForPublishedResult(
    page: Page,
    networkCapture: CsdnNetworkCapture,
    accountIdentifier: string | null,
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

      const responseResult = this.extractPublishedResultFromNetwork(
        networkCapture,
        accountIdentifier,
      );

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

      if (await this.hasVisibleText(page, ['发布成功', '文章发布成功', '审核中'])) {
        return {
          remotePostId: articleIdFromPage ?? null,
          remotePostUrl: articleUrlFromPage ?? null,
          status: PublishJobStatus.RUNNING,
          metadataJson: {
            source: 'success-toast',
          },
        };
      }

      if (await this.hasVisibleText(page, ['微信登录', '验证码登录', '登录可享更多权益'])) {
        throw new Error('CSDN session expired during publishing');
      }

      await page.waitForTimeout(1000);
    }

    throw new Error('Timed out waiting for CSDN publish confirmation');
  }

  private attachNetworkCapture(page: Page): CsdnNetworkCapture {
    const entries: CsdnNetworkCapture = [];

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

    if (!url.includes('csdn.net')) {
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

  private extractPublishedResultFromNetwork(
    capture: CsdnNetworkCapture,
    accountIdentifier: string | null,
  ) {
    for (const entry of capture) {
      const stringifiedPayload = JSON.stringify(entry.payload);
      const matchedArticleUrl = stringifiedPayload.match(CSDN_ARTICLE_URL_PATTERN);

      if (matchedArticleUrl?.[0]) {
        return {
          remotePostId: matchedArticleUrl[2] ?? null,
          remotePostUrl: matchedArticleUrl[0],
          responseUrl: entry.url,
        };
      }

      const extractedArticleUrl = this.findStringValueByPattern(
        entry.payload,
        CSDN_ARTICLE_URL_PATTERN,
      );
      const extractedArticleId = this.findStringValueByKey(entry.payload, [
        'articleId',
        'article_id',
        'blogId',
        'blog_id',
        'id',
      ]);

      if (extractedArticleUrl) {
        return {
          remotePostId:
            this.extractArticleId(extractedArticleUrl) ?? extractedArticleId,
          remotePostUrl: extractedArticleUrl,
          responseUrl: entry.url,
        };
      }

      if (extractedArticleId) {
        const generatedArticleUrl = this.buildArticleUrl(
          accountIdentifier,
          extractedArticleId,
        );

        if (generatedArticleUrl) {
          return {
            remotePostId: extractedArticleId,
            remotePostUrl: generatedArticleUrl,
            responseUrl: entry.url,
          };
        }
      }
    }

    return null;
  }

  private async trySelectOriginalType(page: Page) {
    await this.clickFirstVisibleButton(page, [/^原创$/, /原创文章/]);
  }

  private async tryFillTagField(page: Page, tagCandidates: string[]) {
    if (tagCandidates.length === 0) {
      return;
    }

    const tagInput = await this.findFirstVisibleLocator(page, [
      'input[placeholder*="标签"]',
      'input[placeholder*="添加标签"]',
      'input[placeholder*="文章标签"]',
      'textarea[placeholder*="标签"]',
    ]);

    if (!tagInput) {
      return;
    }

    for (const tagCandidate of tagCandidates.slice(0, 3)) {
      await tagInput.click();
      await tagInput.fill(tagCandidate);
      await page.waitForTimeout(400);

      const selected = await this.clickFirstVisibleLocator(page, [
        '[role="option"]',
        '.el-select-dropdown__item',
        '.suggest-item',
        '.tag-item',
      ]);

      if (selected) {
        await page.waitForTimeout(250);
        continue;
      }

      await page.keyboard.press('Enter').catch(() => undefined);
      await page.waitForTimeout(250);
    }
  }

  private async isArticlePage(page: Page) {
    const pageUrl = page.url();

    if (this.extractArticleId(pageUrl)) {
      return true;
    }

    return this.hasVisibleText(page, ['原创', '阅读量', '收藏', '点赞']);
  }

  private async extractAuthenticatedAccountIdentifier(page: Page) {
    return page.evaluate(() => {
      const hrefCandidates = Array.from(document.querySelectorAll('a[href]'))
        .map((node) => node.getAttribute('href') ?? '')
        .filter((value) => value.includes('blog.csdn.net/'));

      for (const candidate of hrefCandidates) {
        const matchedValue = candidate.match(/blog\.csdn\.net\/([^/?#]+)/i);

        if (matchedValue?.[1]) {
          return matchedValue[1];
        }
      }

      const html = document.documentElement?.innerHTML ?? '';
      const htmlMatchedValue = html.match(/blog\.csdn\.net\/([^/"'#<]+)/i);

      return htmlMatchedValue?.[1] ?? null;
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

        return videoUrl ? `\n\n视频链接：${videoUrl}\n\n` : '\n\n';
      })
      .replace(IMG_TAG_PATTERN, (_match, _quote, src: string) => {
        const imageUrl = this.normalizeRemoteMediaUrl(src);

        return imageUrl ? `\n\n![image](${imageUrl})\n\n` : '\n\n';
      })
      .replace(LINK_TAG_PATTERN, (_match, _quote, href: string, text: string) => {
        const normalizedHref = this.normalizeRemoteMediaUrl(href) ?? href;
        const normalizedText = text.replace(/<[^>]+>/g, '').trim();

        if (normalizedText.length === 0) {
          return normalizedHref;
        }

        return `[${normalizedText}](${normalizedHref})`;
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

  private buildTagCandidates(tagNames: string[], title: string) {
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
      .filter((item) => item.length >= 2 && item.length <= 16);

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
        .locator('button, [role="button"], .btn')
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
      process.env.CSDN_BROWSER_EXECUTABLE_PATH?.trim() ||
      process.env.X_BROWSER_EXECUTABLE_PATH?.trim() ||
      process.env.ZHIHU_BROWSER_EXECUTABLE_PATH?.trim();

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
    const normalizedPayload = payload as CsdnCredentialPayload;

    if (!this.hasBrowserCredential(normalizedPayload)) {
      throw new BadRequestException(
        'CSDN 真实发布需要 cookie 或 cookies 字段来恢复浏览器登录态',
      );
    }

    return normalizedPayload;
  }

  private hasBrowserCredential(payload: CsdnCredentialPayload) {
    return Boolean(
      this.getTrimmedString(payload.cookie) ||
        (Array.isArray(payload.cookies) && payload.cookies.length > 0),
    );
  }

  private normalizeCookies(payload: CsdnCredentialPayload) {
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
      throw new BadRequestException('Missing CSDN cookie payload');
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
        domain: '.csdn.net',
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
      domain: this.getTrimmedString(value.domain) ?? '.csdn.net',
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
    try {
      const resolvedUrl = new URL(url);

      return resolvedUrl.hostname.includes(CSDN_SIGNIN_HOST);
    } catch {
      return url.includes(CSDN_SIGNIN_HOST);
    }
  }

  private normalizeArticleUrl(value: string | null | undefined) {
    if (!value) {
      return null;
    }

    const matchedValue = value.match(CSDN_ARTICLE_URL_PATTERN);

    return matchedValue?.[0] ?? null;
  }

  private buildArticleUrl(
    accountIdentifier: string | null | undefined,
    remotePostId: string | null | undefined,
  ) {
    if (!accountIdentifier || !remotePostId) {
      return null;
    }

    const normalizedAccountIdentifier = accountIdentifier.trim();
    const normalizedRemotePostId = remotePostId.trim();

    if (
      normalizedAccountIdentifier.length === 0 ||
      normalizedRemotePostId.length === 0
    ) {
      return null;
    }

    return `https://blog.csdn.net/${normalizedAccountIdentifier}/article/details/${normalizedRemotePostId}`;
  }

  private extractArticleId(value: string | null | undefined) {
    if (!value) {
      return null;
    }

    const matchedValue = value.match(CSDN_ARTICLE_URL_PATTERN);

    return matchedValue?.[2] ?? null;
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
