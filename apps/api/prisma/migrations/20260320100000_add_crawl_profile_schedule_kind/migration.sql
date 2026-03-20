CREATE TYPE "CrawlScheduleKind" AS ENUM ('INTERVAL', 'CRON');

ALTER TABLE "crawl_profiles"
ADD COLUMN "schedule_kind" "CrawlScheduleKind" NOT NULL DEFAULT 'INTERVAL',
ADD COLUMN "schedule_cron" TEXT;
