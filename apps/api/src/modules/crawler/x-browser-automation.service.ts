import { spawn, type ChildProcess } from 'child_process';
import { existsSync } from 'fs';
import { mkdtemp, rm } from 'fs/promises';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createServer } from 'net';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  chromium,
  type Browser,
  type BrowserContext,
  type Cookie,
  type Page,
  type Response,
} from 'playwright';
import type { MediaType } from '@prisma/client';
import type {
  BindingProfile,
  PostEntities,
  RawFeedResponse,
} from './crawler.types';
import {
  CrawlerAuthError,
  CrawlerStructureChangedError,
} from './errors/crawler-adapter.error';
import type {
  AuthenticatedPageSession,
  InteractiveLoginRuntime,
  InteractiveLoginState,
  RealBrowserCredentialPayload,
  XCookiePayload,
  XBrowserAutomationPort,
} from './x-browser.types';
import {
  extractResolvedVideoMediaFromGraphqlPayload,
  extractResolvedVideoMediaFromNetworkRequests,
  filterDuplicateVideoPosterImages,
  matchResolvedVideoMedia,
  needsResolvedVideoSource,
  type ResolvedVideoMediaSource,
} from './x-video-media';
import {
  detectPostType,
  inferRelations,
  type PostDetectionSnapshot,
  type StatusLinkCandidate,
} from './x-post-detection';

const HOME_URL = 'https://x.com/home';
const EXPLORE_TRENDING_URL = 'https://x.com/explore/tabs/trending';
const LOGIN_URL = 'https://x.com/i/flow/login';
const DESKTOP_VIEWPORT = {
  width: 1440,
  height: 1024,
} as const;
const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36';
const BROWSER_CLOSE_TIMEOUT_MS = 3000;
const CDP_CONNECT_TIMEOUT_MS = 15000;
const DEFAULT_SYSTEM_CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
] as const;
type ScrapedRawFeedPost = RawFeedResponse['posts'][number];
type ScrapedVisiblePostSnapshot = Omit<
  ScrapedRawFeedPost,
  'postType' | 'relations'
> & {
  detection: PostDetectionSnapshot;
};

@Injectable()
export class XBrowserAutomationService implements XBrowserAutomationPort {
  constructor(private readonly configService: ConfigService) {}

  async launchInteractiveLogin(loginUrl = LOGIN_URL) {
    const systemChromeExecutablePath =
      this.resolveInteractiveLoginExecutablePath();

    if (systemChromeExecutablePath) {
      return this.launchInteractiveLoginWithSystemChrome(
        systemChromeExecutablePath,
        loginUrl,
      );
    }

    const browser = await this.launchBrowser(false);
    const context = await browser.newContext({
      viewport: DESKTOP_VIEWPORT,
      userAgent: DEFAULT_USER_AGENT,
    });
    const page = await context.newPage();

    await page.goto(loginUrl, {
      waitUntil: 'domcontentloaded',
    });
    await page.bringToFront();

    return {
      browser,
      context,
      page,
    } satisfies InteractiveLoginRuntime;
  }

  async inspectInteractiveLogin(
    runtime: InteractiveLoginRuntime,
    loginUrl: string,
  ): Promise<InteractiveLoginState> {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const page = this.resolveInteractiveLoginPage(runtime);

      if (!page) {
        return {
          status: 'CLOSED',
        };
      }

      try {
        const cookies = await runtime.context.cookies();
        const authToken = cookies.find((item) => item.name === 'auth_token');

        if (!authToken) {
          return {
            status: 'WAITING_LOGIN',
          };
        }

        const pageUrl = page.url();

        if (this.isLoginUrl(pageUrl)) {
          return {
            status: 'WAITING_LOGIN',
          };
        }

        await this.navigateToAuthenticatedHome(page);

        const authenticatedPage = this.resolveInteractiveLoginPage(runtime);

        if (!authenticatedPage) {
          return {
            status: 'CLOSED',
          };
        }

        await this.ensureAuthenticatedShell(authenticatedPage);

        const payload = await this.buildCredentialPayload(
          runtime.context,
          authenticatedPage,
          loginUrl,
        );

        return {
          status: 'AUTHENTICATED',
          payload,
          profile: {
            xUserId: payload.xUserId,
            username: payload.username,
            displayName: payload.displayName,
            avatarUrl: payload.avatarUrl,
          },
        };
      } catch (error) {
        if (this.isTargetClosedError(error)) {
          continue;
        }

        return {
          status: 'FAILED',
          errorMessage:
            error instanceof Error
              ? error.message
              : 'Browser binding inspection failed',
        };
      }
    }

    return this.browserStillOpen(runtime)
      ? {
          status: 'WAITING_LOGIN',
        }
      : {
          status: 'CLOSED',
        };
  }

  async closeInteractiveLoginRuntime(runtime: InteractiveLoginRuntime) {
    if (runtime.page && !runtime.page.isClosed()) {
      await this.runWithTimeout(
        runtime.page.close().catch(() => undefined),
        BROWSER_CLOSE_TIMEOUT_MS,
      );
    }

    await this.runWithTimeout(
      runtime.context.close().catch(() => undefined),
      BROWSER_CLOSE_TIMEOUT_MS,
    );
    await this.runWithTimeout(
      runtime.browser.close().catch(() => undefined),
      BROWSER_CLOSE_TIMEOUT_MS,
    );

    if (runtime.chromeProcess) {
      await this.terminateChromeProcess(runtime.chromeProcess);
    }

    if (runtime.userDataDir) {
      await rm(runtime.userDataDir, {
        recursive: true,
        force: true,
      }).catch(() => undefined);
    }
  }

  async validateCredential(payload: RealBrowserCredentialPayload) {
    const session = await this.createAuthenticatedSession(payload);

    try {
      return session.profile;
    } finally {
      await session.context.close().catch(() => undefined);
      await session.browser.close().catch(() => undefined);
    }
  }

  async createAuthenticatedSession(
    payload: RealBrowserCredentialPayload,
  ): Promise<AuthenticatedPageSession> {
    const browser = await this.launchBrowser(true);
    const context = await browser.newContext({
      viewport: DESKTOP_VIEWPORT,
      userAgent: DEFAULT_USER_AGENT,
    });

    await context.addCookies(this.normalizeCookies(payload.cookies));

    const page = await context.newPage();
    await page.goto(HOME_URL, {
      waitUntil: 'domcontentloaded',
    });
    await this.ensureAuthenticatedShell(page);

    const profile = await this.extractProfile(page, payload);

    return {
      browser,
      context,
      page,
      profile,
    };
  }

  async fetchRecommendedFeed(payload: RealBrowserCredentialPayload) {
    return this.fetchTimelineFeed(payload, {
      diagnosticsLabel: 'X home timeline',
      metadataSource: HOME_URL,
      prepare: (page) =>
        this.prepareFeedPageForScraping(page, {
          selectPrimaryTimelineTab: true,
          url: HOME_URL,
        }),
    });
  }

  async fetchHotFeed(payload: RealBrowserCredentialPayload) {
    return this.fetchTimelineFeed(payload, {
      diagnosticsLabel: 'X explore trending timeline',
      metadataSource: EXPLORE_TRENDING_URL,
      prepare: (page) =>
        this.prepareFeedPageForScraping(page, {
          selectPrimaryTimelineTab: false,
          url: EXPLORE_TRENDING_URL,
        }),
    });
  }

  async fetchSearchFeed(
    payload: RealBrowserCredentialPayload,
    queryText: string,
  ) {
    const searchUrl = this.buildSearchUrl(queryText);

    return this.fetchTimelineFeed(payload, {
      diagnosticsLabel: `X search timeline for "${queryText}"`,
      metadataSource: searchUrl,
      prepare: (page) =>
        this.prepareFeedPageForScraping(page, {
          selectPrimaryTimelineTab: false,
          url: searchUrl,
        }),
    });
  }

  async resolvePostVideoMedia(
    payload: RealBrowserCredentialPayload,
    postUrl: string,
    xPostId: string,
  ) {
    const session = await this.createAuthenticatedSession(payload);

    try {
      return await this.resolvePostVideoMediaInContext(
        session.context,
        postUrl,
        xPostId,
      );
    } finally {
      await session.context.close().catch(() => undefined);
      await session.browser.close().catch(() => undefined);
    }
  }

  private async fetchTimelineFeed(
    payload: RealBrowserCredentialPayload,
    input: {
      diagnosticsLabel: string;
      metadataSource: string;
      prepare: (page: Page) => Promise<void>;
    },
  ) {
    const session = await this.createAuthenticatedSession(payload);
    const maxPosts =
      this.configService.get<number>('REAL_CRAWLER_MAX_POSTS') ?? 20;

    try {
      await input.prepare(session.page);

      const postsById = new Map<string, RawFeedResponse['posts'][number]>();

      for (let iteration = 0; iteration < 4; iteration += 1) {
        const batch = await this.scrapeVisiblePosts(session.page, maxPosts);

        for (const item of batch) {
          postsById.set(item.xPostId, item);
        }

        if (postsById.size >= maxPosts) {
          break;
        }

        await this.advanceHomeTimeline(
          session.page,
          input.metadataSource,
          iteration,
          batch.length === 0,
        );
      }

      const posts = Array.from(postsById.values()).slice(0, maxPosts);

      await this.hydrateResolvedVideoMediaSources(session.context, posts);

      if (posts.length === 0) {
        const diagnostics = await this.capturePageDiagnostics(session.page);

        throw new CrawlerStructureChangedError(
          `No visible posts were captured from the ${input.diagnosticsLabel} (${diagnostics})`,
        );
      }

      return {
        adapter: 'real',
        fetchedAt: new Date().toISOString(),
        metadata: {
          source: input.metadataSource,
          profileUsername: session.profile.username,
          scrapedCount: posts.length,
        },
        posts,
      } satisfies RawFeedResponse;
    } finally {
      await session.context.close().catch(() => undefined);
      await session.browser.close().catch(() => undefined);
    }
  }

  private async launchInteractiveLoginWithSystemChrome(
    executablePath: string,
    loginUrl: string,
  ) {
    const debugPort = await this.reserveDebugPort();
    const userDataDir = await mkdtemp(
      join(tmpdir(), 'auto-x-to-wechat-login-'),
    );
    const chromeProcess = spawn(
      executablePath,
      [
        '--new-window',
        `--remote-debugging-port=${debugPort}`,
        `--user-data-dir=${userDataDir}`,
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-default-apps',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--lang=en-US,en',
        '--window-size=1440,1024',
        'about:blank',
      ],
      {
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    const chromeProcessOutput = this.captureChildProcessOutput(chromeProcess);

    chromeProcess.unref();

    try {
      const browser = await this.connectToSystemChrome(
        debugPort,
        chromeProcess,
        chromeProcessOutput.read,
      );
      const context = await this.waitForBrowserContext(browser);
      const page = await this.waitForContextPage(context);

      await context.addInitScript(() => {
        Object.defineProperty(window.navigator, 'webdriver', {
          configurable: true,
          get: () => undefined,
        });
      });
      await page.setViewportSize(DESKTOP_VIEWPORT).catch(() => undefined);
      await page.goto(loginUrl, {
        waitUntil: 'domcontentloaded',
      });
      await page.bringToFront();

      return {
        browser,
        chromeProcess,
        context,
        page,
        userDataDir,
      } satisfies InteractiveLoginRuntime;
    } catch (error) {
      await this.terminateChromeProcess(chromeProcess);
      await rm(userDataDir, {
        recursive: true,
        force: true,
      }).catch(() => undefined);
      throw error;
    }
  }

  private async launchBrowser(headless: boolean) {
    const configuredExecutablePath = this.configService.get<string>(
      'X_BROWSER_EXECUTABLE_PATH',
    );
    const autoDetectedExecutablePath = configuredExecutablePath
      ? undefined
      : this.resolveSystemChromeExecutablePath();
    const executablePath =
      configuredExecutablePath || autoDetectedExecutablePath;
    const channel = this.configService.get<string>('X_BROWSER_CHANNEL');

    try {
      return await chromium.launch({
        headless,
        executablePath: executablePath || undefined,
        channel: executablePath ? undefined : channel || undefined,
      });
    } catch (error) {
      if (configuredExecutablePath || channel) {
        throw error;
      }

      if (autoDetectedExecutablePath) {
        return chromium.launch({ headless });
      }

      throw error;
    }
  }

  private resolveSystemChromeExecutablePath() {
    const configuredPath = this.configService.get<string>(
      'X_BROWSER_EXECUTABLE_PATH',
    );

    if (configuredPath) {
      if (!existsSync(configuredPath)) {
        throw new Error(
          `Configured X_BROWSER_EXECUTABLE_PATH does not exist: ${configuredPath}`,
        );
      }

      return configuredPath;
    }

    for (const candidate of DEFAULT_SYSTEM_CHROME_PATHS) {
      if (existsSync(candidate)) {
        return candidate;
      }
    }

    return undefined;
  }

  private resolveInteractiveLoginExecutablePath() {
    const configuredPath = this.resolveSystemChromeExecutablePath();

    if (configuredPath) {
      return configuredPath;
    }

    const bundledChromiumExecutablePath = chromium.executablePath();

    if (
      bundledChromiumExecutablePath &&
      existsSync(bundledChromiumExecutablePath)
    ) {
      return bundledChromiumExecutablePath;
    }

    return undefined;
  }

  private async connectToSystemChrome(
    debugPort: number,
    chromeProcess: ChildProcess,
    readProcessOutput?: () => string,
  ) {
    const cdpEndpoint = await this.waitForCdpEndpoint(
      debugPort,
      chromeProcess,
      readProcessOutput,
    );

    return chromium.connectOverCDP(cdpEndpoint);
  }

  private async waitForCdpEndpoint(
    debugPort: number,
    chromeProcess: ChildProcess,
    readProcessOutput?: () => string,
  ) {
    const startedAt = Date.now();
    const endpoint = `http://127.0.0.1:${debugPort}`;

    while (Date.now() - startedAt < CDP_CONNECT_TIMEOUT_MS) {
      if (chromeProcess.exitCode !== null) {
        const processOutput = readProcessOutput?.();
        throw new Error(
          processOutput
            ? `System Chrome exited before CDP became available (exit code: ${chromeProcess.exitCode}). Output: ${processOutput}`
            : `System Chrome exited before CDP became available (exit code: ${chromeProcess.exitCode})`,
        );
      }

      try {
        const response = await fetch(`${endpoint}/json/version`);

        if (response.ok) {
          return endpoint;
        }
      } catch {
        // Wait for Chrome to finish booting.
      }

      await this.sleep(200);
    }

    throw new Error('Timed out while waiting for system Chrome CDP endpoint');
  }

  private captureChildProcessOutput(chromeProcess: ChildProcess) {
    let output = '';

    const appendChunk = (chunk: string | Buffer) => {
      output = `${output}${chunk.toString()}`.slice(-4000);
    };

    chromeProcess.stdout?.setEncoding('utf8');
    chromeProcess.stderr?.setEncoding('utf8');
    chromeProcess.stdout?.on('data', appendChunk);
    chromeProcess.stderr?.on('data', appendChunk);

    return {
      read: () => output.replace(/\s+/g, ' ').trim(),
    };
  }

  private async waitForBrowserContext(browser: Browser) {
    const startedAt = Date.now();

    while (Date.now() - startedAt < CDP_CONNECT_TIMEOUT_MS) {
      const context = browser.contexts()[0];

      if (context) {
        return context;
      }

      await this.sleep(100);
    }

    throw new Error(
      'Timed out while waiting for system Chrome browser context',
    );
  }

  private async waitForContextPage(context: BrowserContext) {
    const startedAt = Date.now();

    while (Date.now() - startedAt < CDP_CONNECT_TIMEOUT_MS) {
      const page = context.pages()[0];

      if (page) {
        return page;
      }

      await this.sleep(100);
    }

    throw new Error('Timed out while waiting for system Chrome page');
  }

  private browserStillOpen(runtime: InteractiveLoginRuntime) {
    return (
      runtime.browser.isConnected() &&
      this.listInteractiveLoginPages(runtime).length > 0
    );
  }

  private listInteractiveLoginPages(runtime: InteractiveLoginRuntime) {
    if (!runtime.browser.isConnected()) {
      return [] as Page[];
    }

    return runtime.context.pages().filter((page) => !page.isClosed());
  }

  private resolveInteractiveLoginPage(runtime: InteractiveLoginRuntime) {
    const pages = this.listInteractiveLoginPages(runtime);

    if (pages.length === 0) {
      return null;
    }

    const currentPage =
      runtime.page && !runtime.page.isClosed() ? runtime.page : null;
    const candidates = currentPage
      ? [currentPage, ...pages.filter((page) => page !== currentPage)]
      : pages;
    const preferredPage = candidates.reduce(
      (best, candidate) => {
        if (!best) {
          return candidate;
        }

        return this.scoreInteractiveLoginPage(candidate) >=
          this.scoreInteractiveLoginPage(best)
          ? candidate
          : best;
      },
      null as Page | null,
    );

    if (!preferredPage) {
      return null;
    }

    runtime.page = preferredPage;
    return preferredPage;
  }

  private scoreInteractiveLoginPage(page: Page) {
    const url = page.url();

    if (url.startsWith(HOME_URL)) {
      return 5;
    }

    if (url.includes('x.com') || url.includes('twitter.com')) {
      return 4;
    }

    if (url.includes('accounts.google.com')) {
      return 3;
    }

    if (url && url !== 'about:blank') {
      return 2;
    }

    return 1;
  }

  private isTargetClosedError(error: unknown) {
    if (!(error instanceof Error)) {
      return false;
    }

    return (
      error.message.includes(
        'Target page, context or browser has been closed',
      ) ||
      error.message.includes('Target closed') ||
      error.message.includes('Browser has been closed')
    );
  }

  private async terminateChromeProcess(chromeProcess: ChildProcess) {
    if (chromeProcess.killed || chromeProcess.exitCode !== null) {
      return;
    }

    chromeProcess.kill('SIGTERM');

    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        if (chromeProcess.exitCode === null) {
          chromeProcess.kill('SIGKILL');
        }

        resolve();
      }, BROWSER_CLOSE_TIMEOUT_MS);

      chromeProcess.once('exit', () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }

  private async reserveDebugPort() {
    return new Promise<number>((resolve, reject) => {
      const server = createServer();

      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => {
        const address = server.address();

        if (!address || typeof address === 'string') {
          server.close(() => reject(new Error('Unable to reserve debug port')));
          return;
        }

        const { port } = address;
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(port);
        });
      });
    });
  }

  private async runWithTimeout<T>(promise: Promise<T>, timeoutMs: number) {
    return Promise.race([
      promise,
      this.sleep(timeoutMs).then(() => undefined as T | undefined),
    ]);
  }

  private sleep(ms: number) {
    return new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  private async prepareFeedPageForScraping(
    page: Page,
    input: {
      selectPrimaryTimelineTab: boolean;
      url: string;
    },
  ) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      if (input.selectPrimaryTimelineTab) {
        await this.selectPrimaryTimelineTab(page);
      }

      if (await this.waitForVisibleTweets(page, 7000)) {
        return;
      }

      await page.mouse.wheel(0, 1600).catch(() => undefined);
      await page.waitForTimeout(1200);

      if (await this.waitForVisibleTweets(page, 4000)) {
        return;
      }

      await page
        .goto(input.url, {
          waitUntil: 'domcontentloaded',
        })
        .catch(() => undefined);
      await page.waitForLoadState('domcontentloaded').catch(() => undefined);
      await page.waitForTimeout(1500);
      if (input.selectPrimaryTimelineTab) {
        await this.ensureAuthenticatedShell(page);
      }
    }
  }

  private async ensureAuthenticatedShell(page: Page) {
    if (this.isLoginUrl(page.url())) {
      throw new CrawlerAuthError('X login session is not authenticated');
    }

    await Promise.race([
      page.waitForSelector('article[data-testid="tweet"]', {
        timeout: 15000,
      }),
      page.waitForSelector('a[data-testid="AppTabBar_Profile_Link"]', {
        timeout: 15000,
      }),
      page.waitForSelector('a[data-testid="AppTabBar_Home_Link"]', {
        timeout: 15000,
      }),
      page.waitForSelector('[data-testid="SideNav_AccountSwitcher_Button"]', {
        timeout: 15000,
      }),
      page.waitForSelector('[data-testid="primaryColumn"]', {
        timeout: 15000,
      }),
    ]).catch(() => undefined);

    if (this.isLoginUrl(page.url())) {
      throw new CrawlerAuthError(
        'X login session expired and redirected to login',
      );
    }

    await this.selectPrimaryTimelineTab(page);

    const hasAuthenticatedShell = await page
      .evaluate(() => {
        return Boolean(
          document.querySelector('article[data-testid="tweet"]') ||
          document.querySelector('a[data-testid="AppTabBar_Profile_Link"]') ||
          document.querySelector('a[data-testid="AppTabBar_Home_Link"]') ||
          document.querySelector(
            '[data-testid="SideNav_AccountSwitcher_Button"]',
          ) ||
          document.querySelector('[data-testid="primaryColumn"]'),
        );
      })
      .catch(() => false);

    if (!hasAuthenticatedShell) {
      const diagnostics = await this.capturePageDiagnostics(page);

      throw new CrawlerAuthError(
        `Unable to confirm an authenticated X home timeline session (${diagnostics})`,
      );
    }
  }

  private async selectPrimaryTimelineTab(page: Page) {
    try {
      const tabs = page.locator('[role="tablist"] [role="tab"]');

      if ((await tabs.count()) === 0) {
        return;
      }

      const firstTab = tabs.first();
      const isSelected = await firstTab.getAttribute('aria-selected');

      if (isSelected !== 'true') {
        await firstTab.click({
          timeout: 2500,
        });
        await page.waitForTimeout(900);
      }
    } catch {
      // Ignore tab switching failures. The timeline may already be visible.
    }
  }

  private async navigateToAuthenticatedHome(page: Page) {
    const pageUrl = page.url();

    if (pageUrl.startsWith(HOME_URL)) {
      return;
    }

    await page
      .goto(HOME_URL, {
        waitUntil: 'domcontentloaded',
      })
      .catch(() => undefined);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    await page.waitForTimeout(1200);
  }

  private async buildCredentialPayload(
    context: BrowserContext,
    page: Page,
    loginUrl: string,
  ) {
    const cookies = await context.cookies();
    const authToken = cookies.find((item) => item.name === 'auth_token')?.value;
    const ct0 = cookies.find((item) => item.name === 'ct0')?.value;

    if (!authToken) {
      throw new CrawlerAuthError('Missing auth_token cookie after X login');
    }

    const profile = await this.extractProfile(page);

    return {
      adapter: 'real',
      capturedAt: new Date().toISOString(),
      loginUrl,
      cookies: this.serializeCookies(cookies),
      authToken,
      ct0,
      xUserId: profile.xUserId ?? profile.username,
      username: profile.username,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
    } satisfies RealBrowserCredentialPayload;
  }

  private async extractProfile(
    page: Page,
    payload?: Partial<RealBrowserCredentialPayload>,
  ): Promise<BindingProfile> {
    const profileFromDom = await page.evaluate(() => {
      const profileLink = document.querySelector(
        'a[data-testid="AppTabBar_Profile_Link"]',
      );
      const profileHref = profileLink?.getAttribute('href') ?? '';
      const username = profileHref.startsWith('/')
        ? profileHref.slice(1).split('/')[0]
        : undefined;
      const avatarUrl =
        (profileLink?.querySelector('img') as HTMLImageElement | null)?.src ??
        undefined;
      const accountSwitcher = document.querySelector(
        '[data-testid="SideNav_AccountSwitcher_Button"]',
      );
      const textContent = accountSwitcher?.textContent?.trim() ?? '';
      const usernameMarker = username ? `@${username}` : '';
      const displayName =
        usernameMarker && textContent.includes(usernameMarker)
          ? textContent.replace(usernameMarker, '').trim() || undefined
          : undefined;

      return {
        avatarUrl,
        displayName,
        username,
      };
    });

    const html = await page.content().catch(() => '');
    const username = profileFromDom.username ?? payload?.username;
    const profileFromHtml = this.extractProfileFromHtml(html, username);

    return {
      xUserId:
        profileFromHtml.xUserId ?? payload?.xUserId ?? username ?? undefined,
      username: username ?? payload?.username,
      displayName:
        profileFromDom.displayName ??
        profileFromHtml.displayName ??
        payload?.displayName,
      avatarUrl:
        profileFromDom.avatarUrl ??
        profileFromHtml.avatarUrl ??
        payload?.avatarUrl,
    };
  }

  private extractProfileFromHtml(html: string, username?: string) {
    if (!html || !username) {
      return {};
    }

    const escapedUsername = username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const patterns = [
      new RegExp(
        `"screen_name":"${escapedUsername}".{0,400}?"id_str":"(\\d+)".{0,400}?"name":"([^"]+)".{0,800}?"profile_image_url_https":"([^"]+)"`,
      ),
      new RegExp(
        `"id_str":"(\\d+)".{0,400}?"name":"([^"]+)".{0,400}?"screen_name":"${escapedUsername}".{0,800}?"profile_image_url_https":"([^"]+)"`,
      ),
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);

      if (match) {
        return {
          xUserId: match[1],
          displayName: this.decodeHtmlEscapes(match[2]),
          avatarUrl: this.decodeHtmlEscapes(match[3]).replaceAll('\\/', '/'),
        };
      }
    }

    return {};
  }

  private async scrapeVisiblePosts(page: Page, maxPosts: number) {
    const rawPostsUnknown: unknown = await page.evaluate((limit: number) => {
      function textValue(node: Element | null | undefined) {
        return node?.textContent?.trim() ?? '';
      }

      function normalizeCount(text: string) {
        if (!text) {
          return undefined;
        }

        const normalized = text.replaceAll(',', '').trim();
        const match = normalized.match(/([\d.]+)\s*([KMB])?/i);

        if (!match) {
          return undefined;
        }

        const value = Number(match[1]);

        if (Number.isNaN(value)) {
          return undefined;
        }

        const unit = match[2]?.toUpperCase();
        const multiplier =
          unit === 'B'
            ? 1_000_000_000
            : unit === 'M'
              ? 1_000_000
              : unit === 'K'
                ? 1_000
                : 1;

        return Math.round(value * multiplier);
      }

      function parseMetric(article: Element, selector: string) {
        const target = article.querySelector(selector);
        const ariaLabel = target?.getAttribute('aria-label') ?? '';
        const text = `${ariaLabel} ${textValue(target)}`.trim();

        return normalizeCount(text);
      }

      function inferEntities(rawText: string) {
        const mentions: Array<{
          username: string;
          start: number;
          end: number;
        }> = [];
        const hashtags: Array<{ tag: string; start: number; end: number }> = [];
        const urls: Array<{
          displayUrl?: string;
          end: number;
          start: number;
          url: string;
        }> = [];
        const urlRegex = /https?:\/\/\S+/g;
        const mentionRegex = /(^|[^A-Za-z0-9_])@([A-Za-z0-9_]{1,15})/g;
        const hashtagRegex = /(^|[^\p{L}\p{N}_])#([\p{L}\p{N}_]+)/gu;

        for (const match of rawText.matchAll(urlRegex)) {
          const start = match.index ?? 0;
          const url = match[0];

          urls.push({
            url,
            displayUrl: url,
            start,
            end: start + url.length,
          });
        }

        for (const match of rawText.matchAll(mentionRegex)) {
          const fullMatch = match[0];
          const prefix = match[1] ?? '';
          const username = match[2];
          const start = (match.index ?? 0) + prefix.length;

          mentions.push({
            username,
            start,
            end: start + fullMatch.length - prefix.length,
          });
        }

        for (const match of rawText.matchAll(hashtagRegex)) {
          const fullMatch = match[0];
          const prefix = match[1] ?? '';
          const tag = match[2];
          const start = (match.index ?? 0) + prefix.length;

          hashtags.push({
            tag,
            start,
            end: start + fullMatch.length - prefix.length,
          });
        }

        return {
          mentions,
          hashtags,
          urls,
        };
      }

      return Array.from(
        document.querySelectorAll('article[data-testid="tweet"]'),
      )
        .slice(0, limit)
        .map((article) => {
          const permalinkAnchor = article.querySelector(
            'a[href*="/status/"] time',
          )?.parentElement as HTMLAnchorElement | null;
          const permalink = permalinkAnchor?.href;

          if (!permalink) {
            return null;
          }

          const xPostId = permalink.match(/status\/([^/?]+)/)?.[1];

          if (!xPostId) {
            return null;
          }

          const rawText =
            textValue(article.querySelector('[data-testid="tweetText"]')) ||
            textValue(article.querySelector('[lang]'));
          const userNameBlock = article.querySelector(
            '[data-testid="User-Name"]',
          );
          const usernameText = Array.from(
            userNameBlock?.querySelectorAll('span') ?? [],
          )
            .map((item) => item.textContent?.trim() ?? '')
            .find((item) => item.startsWith('@'));
          const username = usernameText?.slice(1) ?? 'unknown';
          const displayName = Array.from(
            userNameBlock?.querySelectorAll('span') ?? [],
          )
            .map((item) => item.textContent?.trim() ?? '')
            .find(
              (item) =>
                item.length > 0 &&
                !item.startsWith('@') &&
                item !== '·' &&
                item !== 'Verified account',
            );
          const sourceCreatedAt =
            article.querySelector('time')?.getAttribute('datetime') ??
            new Date().toISOString();
          const authorAvatar = article.querySelector<HTMLImageElement>(
            '[data-testid="Tweet-User-Avatar"] img',
          );
          const authorAvatarUrl = authorAvatar?.src || undefined;
          const imageMedia = Array.from(
            article.querySelectorAll('div[data-testid="tweetPhoto"] img'),
          ).map((item) => ({
            mediaType: 'IMAGE' as MediaType,
            sourceUrl: (item as HTMLImageElement).src,
            previewUrl: (item as HTMLImageElement).src,
            width: (item as HTMLImageElement).naturalWidth || undefined,
            height: (item as HTMLImageElement).naturalHeight || undefined,
          }));
          const videoMedia = Array.from(article.querySelectorAll('video')).map(
            (item) => ({
              mediaType: 'VIDEO' as MediaType,
              sourceUrl: item.currentSrc || item.src,
              previewUrl: item.poster || undefined,
            }),
          );
          const videoPosterUrls = new Set(
            videoMedia
              .map((item) => item.previewUrl)
              .filter((item): item is string => Boolean(item)),
          );
          const deduplicatedImageMedia = imageMedia.filter(
            (item) => !videoPosterUrls.has(item.sourceUrl),
          );
          const entities = inferEntities(rawText);
          const statusLinkCandidates = Array.from(
            article.querySelectorAll('a[href*="/status/"]'),
          ).map((item) => ({
            href: item.getAttribute('href') ?? '',
            resolvedUrl:
              item instanceof HTMLAnchorElement ? item.href : undefined,
            hasTimeElement: Boolean(item.querySelector('time')),
            isInNestedTweet:
              Boolean(item.closest('article[data-testid="tweet"]')) &&
              item.closest('article[data-testid="tweet"]') !== article,
          })) satisfies StatusLinkCandidate[];

          return {
            xPostId,
            postUrl: permalink,
            author: {
              username,
              displayName,
              avatarUrl: authorAvatarUrl,
            },
            rawText,
            sourceCreatedAt,
            language:
              article.querySelector('[lang]')?.getAttribute('lang') ??
              undefined,
            entities,
            media: [...deduplicatedImageMedia, ...videoMedia],
            metrics: {
              replyCount: parseMetric(article, '[data-testid="reply"]'),
              repostCount:
                parseMetric(article, '[data-testid="retweet"]') ??
                parseMetric(article, '[data-testid="unretweet"]'),
              favoriteCount:
                parseMetric(article, '[data-testid="like"]') ??
                parseMetric(article, '[data-testid="unlike"]'),
              viewCount: parseMetric(article, 'a[href$="/analytics"]'),
            },
            rawPayload: {
              permalink,
              capturedAt: new Date().toISOString(),
            },
            detection: {
              hasSocialContext: Boolean(
                article.querySelector('[data-testid="socialContext"]'),
              ),
              permalink,
              rawText,
              statusLinkCandidates,
              timeElementCount: article.querySelectorAll('time').length,
              tweetTextCount: article.querySelectorAll(
                '[data-testid="tweetText"]',
              ).length,
              userNameBlockCount: article.querySelectorAll(
                '[data-testid="User-Name"]',
              ).length,
              xPostId,
            },
          };
        })
        .filter(Boolean);
    }, maxPosts);

    const rawPosts =
      rawPostsUnknown as Array<ScrapedVisiblePostSnapshot | null>;

    return rawPosts
      .filter((item): item is ScrapedVisiblePostSnapshot => item !== null)
      .map((item) => {
        const postType = detectPostType(item.detection);
        const { detection, ...post } = item;

        return {
          ...post,
          postType,
          relations: inferRelations({
            entities: item.entities as PostEntities,
            permalink: item.postUrl,
            postType,
            snapshot: detection,
            username: item.author.username,
            xPostId: item.xPostId,
          }),
          entities: item.entities as PostEntities,
          media: filterDuplicateVideoPosterImages(item.media ?? []),
        };
      }) satisfies ScrapedRawFeedPost[];
  }

  private async hydrateResolvedVideoMediaSources(
    context: BrowserContext,
    posts: RawFeedResponse['posts'],
  ) {
    for (const post of posts) {
      if (
        !post.media?.some(
          (item) =>
            item.mediaType === 'VIDEO' &&
            needsResolvedVideoSource(item.sourceUrl),
        )
      ) {
        post.media = filterDuplicateVideoPosterImages(post.media ?? []);
        continue;
      }

      const resolvedMedia = await this.resolvePostVideoMediaInContext(
        context,
        post.postUrl,
        post.xPostId,
      ).catch(() => [] as ResolvedVideoMediaSource[]);

      post.media = filterDuplicateVideoPosterImages(
        matchResolvedVideoMedia(post.media ?? [], resolvedMedia),
      );
    }
  }

  private async resolvePostVideoMediaInContext(
    context: BrowserContext,
    postUrl: string,
    xPostId: string,
  ) {
    const page = await context.newPage();
    const graphqlPayloads: unknown[] = [];
    const networkRequestUrls = new Set<string>();
    const responseListener = async (response: Response) => {
      const responseUrl = response.url();

      if (responseUrl.startsWith('https://video.twimg.com/')) {
        networkRequestUrls.add(responseUrl);
      }

      if (
        !responseUrl.includes('TweetResultByRestId') &&
        !responseUrl.includes('TweetDetail')
      ) {
        return;
      }

      try {
        graphqlPayloads.push(await response.json());
      } catch {
        // Ignore non-JSON responses and keep the network fallback.
      }
    };

    page.on('response', responseListener);

    try {
      await page.goto(postUrl, {
        waitUntil: 'domcontentloaded',
      });
      await page
        .waitForResponse(
          (response) =>
            response.ok() &&
            (response.url().includes('TweetResultByRestId') ||
              response.url().includes('TweetDetail')),
          {
            timeout: 8000,
          },
        )
        .catch(() => undefined);
      await page.waitForTimeout(1200);

      const videoLocator = page.locator('video').first();
      const videoCount = await videoLocator.count().catch(() => 0);

      if (videoCount > 0) {
        await videoLocator.scrollIntoViewIfNeeded().catch(() => undefined);
        await videoLocator
          .click({ force: true, timeout: 1500 })
          .catch(() => undefined);
        await page.waitForTimeout(1800);
      }

      const resolvedFromGraphql = graphqlPayloads.flatMap((payload) =>
        extractResolvedVideoMediaFromGraphqlPayload(payload, xPostId),
      );

      if (resolvedFromGraphql.length > 0) {
        return resolvedFromGraphql;
      }

      return extractResolvedVideoMediaFromNetworkRequests([
        ...networkRequestUrls,
      ]);
    } finally {
      page.off('response', responseListener);
      await page.close().catch(() => undefined);
    }
  }

  private serializeCookies(cookies: Cookie[]): XCookiePayload[] {
    return cookies.map((item) => ({
      name: item.name,
      value: item.value,
      domain: item.domain,
      path: item.path,
      expires: item.expires,
      httpOnly: item.httpOnly,
      secure: item.secure,
      sameSite: item.sameSite,
    }));
  }

  private normalizeCookies(cookies: RealBrowserCredentialPayload['cookies']) {
    return cookies.map((item) => ({
      name: item.name,
      value: item.value,
      domain: item.domain,
      path: item.path,
      expires: item.expires,
      httpOnly: item.httpOnly,
      secure: item.secure,
      sameSite: item.sameSite,
    }));
  }

  private isLoginUrl(url: string) {
    return url.includes('/i/flow/login') || url.includes('/login');
  }

  private async waitForVisibleTweets(page: Page, timeoutMs: number) {
    const deadline = Date.now() + timeoutMs;
    let attempt = 0;

    while (Date.now() < deadline) {
      const visibleTweetCount = await this.countVisibleTweets(page);

      if (visibleTweetCount > 0) {
        return true;
      }

      if (attempt === 1) {
        await this.selectPrimaryTimelineTab(page);
      } else if (attempt === 2) {
        await page.mouse.wheel(0, 1200).catch(() => undefined);
      } else if (attempt === 3) {
        await page.mouse.wheel(0, -800).catch(() => undefined);
      }

      await page.waitForTimeout(1000);
      attempt += 1;
    }

    return false;
  }

  private async advanceHomeTimeline(
    page: Page,
    sourceUrl: string,
    iteration: number,
    shouldAggressivelyWakeTimeline: boolean,
  ) {
    if (shouldAggressivelyWakeTimeline) {
      await this.selectPrimaryTimelineTab(page);

      if (iteration >= 1) {
        await page
          .goto(sourceUrl, {
            waitUntil: 'domcontentloaded',
          })
          .catch(() => undefined);
        await page.waitForLoadState('domcontentloaded').catch(() => undefined);
        await page.waitForTimeout(1400);
      }
    }

    await page.mouse
      .wheel(0, shouldAggressivelyWakeTimeline ? 1800 : 1400)
      .catch(() => undefined);
    await page.waitForTimeout(shouldAggressivelyWakeTimeline ? 1400 : 900);
  }

  private countVisibleTweets(page: Page) {
    return page
      .evaluate(() => {
        return Array.from(
          document.querySelectorAll('article[data-testid="tweet"]'),
        ).filter((item) => {
          const rect = item.getBoundingClientRect();
          const style = window.getComputedStyle(item);

          return (
            rect.width > 0 &&
            rect.height > 0 &&
            style.display !== 'none' &&
            style.visibility !== 'hidden'
          );
        }).length;
      })
      .catch(() => 0);
  }

  private decodeHtmlEscapes(value: string) {
    return value
      .replaceAll('&quot;', '"')
      .replaceAll('&#x2F;', '/')
      .replaceAll('&amp;', '&');
  }

  private buildSearchUrl(queryText: string) {
    return `https://x.com/search?q=${encodeURIComponent(queryText)}&src=typed_query&f=live`;
  }

  private async capturePageDiagnostics(page: Page) {
    try {
      const snapshot = await page.evaluate(() => {
        const tabs = Array.from(
          document.querySelectorAll('[role="tablist"] [role="tab"]'),
        ).map((item) => ({
          selected: item.getAttribute('aria-selected') === 'true',
          text: item.textContent?.trim() ?? '',
        }));

        return {
          bodyPreview: document.body.innerText
            .replace(/\s+/g, ' ')
            .slice(0, 240),
          title: document.title,
          href: window.location.href,
          hasPrimaryColumn: Boolean(
            document.querySelector('[data-testid="primaryColumn"]'),
          ),
          hasAccountSwitcher: Boolean(
            document.querySelector(
              '[data-testid="SideNav_AccountSwitcher_Button"]',
            ),
          ),
          hasProfileLink: Boolean(
            document.querySelector('a[data-testid="AppTabBar_Profile_Link"]'),
          ),
          hasHomeLink: Boolean(
            document.querySelector('a[data-testid="AppTabBar_Home_Link"]'),
          ),
          hasTweet: Boolean(
            document.querySelector('article[data-testid="tweet"]'),
          ),
          hasProgressBar: Boolean(
            document.querySelector('[role="progressbar"]'),
          ),
          tabSummary: tabs
            .map((item) => `${item.selected ? '*' : ''}${item.text}`)
            .join('|'),
          tweetCount: document.querySelectorAll('article[data-testid="tweet"]')
            .length,
        };
      });

      return `url=${snapshot.href}; title=${snapshot.title}; primaryColumn=${snapshot.hasPrimaryColumn}; accountSwitcher=${snapshot.hasAccountSwitcher}; profileLink=${snapshot.hasProfileLink}; homeLink=${snapshot.hasHomeLink}; tweet=${snapshot.hasTweet}; tweetCount=${snapshot.tweetCount}; progress=${snapshot.hasProgressBar}; tabs=${snapshot.tabSummary}; body=${snapshot.bodyPreview}`;
    } catch {
      return `url=${page.url()}`;
    }
  }
}
