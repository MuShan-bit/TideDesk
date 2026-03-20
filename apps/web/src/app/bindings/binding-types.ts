export type CrawlProfileRecord = {
  enabled: boolean;
  id: string;
  intervalMinutes: number;
  language: string | null;
  lastRunAt: string | null;
  maxPosts: number;
  mode: "RECOMMENDED" | "HOT" | "SEARCH";
  nextRunAt: string | null;
  queryText: string | null;
  region: string | null;
  scheduleCron: string | null;
  scheduleKind: "INTERVAL" | "CRON";
};

export type BindingRecord = {
  crawlProfiles: CrawlProfileRecord[];
  id: string;
  xUserId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  status: "ACTIVE" | "DISABLED" | "INVALID" | "PENDING";
  credentialSource: "COOKIE_IMPORT" | "EXTENSION" | "WEB_LOGIN";
  crawlEnabled: boolean;
  crawlIntervalMinutes: number;
  lastValidatedAt: string | null;
  lastCrawledAt: string | null;
  nextCrawlAt: string | null;
  lastErrorMessage: string | null;
  updatedAt: string;
  crawlJob: {
    enabled: boolean;
    intervalMinutes: number;
    lastRunAt: string | null;
    nextRunAt: string | null;
  } | null;
};
