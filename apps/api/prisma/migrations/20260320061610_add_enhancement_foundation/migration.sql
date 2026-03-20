-- CreateEnum
CREATE TYPE "SourcePlatform" AS ENUM ('X', 'WECHAT', 'ZHIHU', 'CSDN', 'TELEGRAM');

-- CreateEnum
CREATE TYPE "CrawlMode" AS ENUM ('RECOMMENDED', 'HOT', 'SEARCH');

-- CreateEnum
CREATE TYPE "TaxonomySource" AS ENUM ('MANUAL', 'AI', 'RULE');

-- CreateEnum
CREATE TYPE "AIProviderType" AS ENUM ('OPENAI', 'ANTHROPIC', 'GEMINI', 'OPENAI_COMPATIBLE');

-- CreateEnum
CREATE TYPE "AITaskType" AS ENUM ('POST_CLASSIFY', 'REPORT_SUMMARY', 'DRAFT_REWRITE');

-- CreateEnum
CREATE TYPE "AITaskStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "PublishPlatformType" AS ENUM ('WECHAT', 'ZHIHU', 'CSDN');

-- CreateEnum
CREATE TYPE "PublishBindingStatus" AS ENUM ('PENDING', 'ACTIVE', 'INVALID', 'DISABLED');

-- CreateEnum
CREATE TYPE "PublishDraftSourceType" AS ENUM ('ARCHIVE', 'REPORT', 'MIXED');

-- CreateEnum
CREATE TYPE "PublishDraftStatus" AS ENUM ('DRAFT', 'READY', 'PUBLISHED_PARTIAL', 'PUBLISHED_ALL', 'FAILED');

-- CreateEnum
CREATE TYPE "PublishJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TelegramTargetType" AS ENUM ('ARCHIVE', 'REPORT');

-- CreateEnum
CREATE TYPE "TelegramSubscriptionFrequency" AS ENUM ('REALTIME', 'DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "TelegramDeliveryStatus" AS ENUM ('SUCCESS', 'FAILED');

-- AlterTable
ALTER TABLE "archived_posts" ADD COLUMN     "ai_summary" TEXT,
ADD COLUMN     "primary_category_id" TEXT,
ADD COLUMN     "source_platform" "SourcePlatform" NOT NULL DEFAULT 'X',
ADD COLUMN     "source_post_id" TEXT,
ADD COLUMN     "user_id" TEXT;

-- AlterTable
ALTER TABLE "crawl_runs" ADD COLUMN     "crawl_profile_id" TEXT;

-- CreateTable
CREATE TABLE "crawl_profiles" (
    "id" TEXT NOT NULL,
    "binding_id" TEXT NOT NULL,
    "mode" "CrawlMode" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "interval_minutes" INTEGER NOT NULL,
    "query_text" TEXT,
    "region" TEXT,
    "language" TEXT,
    "max_posts" INTEGER NOT NULL DEFAULT 20,
    "last_run_at" TIMESTAMP(3),
    "next_run_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crawl_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "archive_occurrences" (
    "id" TEXT NOT NULL,
    "archived_post_id" TEXT NOT NULL,
    "binding_id" TEXT NOT NULL,
    "crawl_profile_id" TEXT,
    "crawl_run_id" TEXT,
    "source_post_id" TEXT NOT NULL,
    "query_text_snapshot" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "archive_occurrences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "color" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "archived_post_tags" (
    "id" TEXT NOT NULL,
    "archived_post_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,
    "source" "TaxonomySource" NOT NULL DEFAULT 'MANUAL',
    "confidence" DECIMAL(5,4),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "archived_post_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_provider_configs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider_type" "AIProviderType" NOT NULL,
    "name" TEXT NOT NULL,
    "base_url" TEXT,
    "api_key_encrypted" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_provider_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_model_configs" (
    "id" TEXT NOT NULL,
    "provider_config_id" TEXT NOT NULL,
    "model_code" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "task_type" "AITaskType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "parameters_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_model_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_task_records" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "task_type" "AITaskType" NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "model_config_id" TEXT,
    "status" "AITaskStatus" NOT NULL DEFAULT 'PENDING',
    "input_snapshot_json" JSONB,
    "output_snapshot_json" JSONB,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_task_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "report_type" "ReportType" NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "rich_text_json" JSONB NOT NULL,
    "rendered_html" TEXT,
    "summary_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_source_posts" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "archived_post_id" TEXT NOT NULL,
    "weight_score" DECIMAL(8,4),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_source_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publish_channel_bindings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "platform_type" "PublishPlatformType" NOT NULL,
    "display_name" TEXT NOT NULL,
    "account_identifier" TEXT,
    "auth_payload_encrypted" TEXT NOT NULL,
    "status" "PublishBindingStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publish_channel_bindings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publish_drafts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "source_type" "PublishDraftSourceType" NOT NULL,
    "status" "PublishDraftStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "source_ids_json" JSONB,
    "rich_text_json" JSONB NOT NULL,
    "rendered_html" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publish_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publish_jobs" (
    "id" TEXT NOT NULL,
    "draft_id" TEXT NOT NULL,
    "channel_binding_id" TEXT NOT NULL,
    "status" "PublishJobStatus" NOT NULL DEFAULT 'QUEUED',
    "remote_post_id" TEXT,
    "remote_post_url" TEXT,
    "error_message" TEXT,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "publish_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telegram_subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "chat_id" TEXT NOT NULL,
    "target_type" "TelegramTargetType" NOT NULL,
    "frequency" "TelegramSubscriptionFrequency" NOT NULL,
    "filter_json" JSONB,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "last_delivered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "telegram_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telegram_delivery_logs" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "target_type" "TelegramTargetType" NOT NULL,
    "target_id" TEXT NOT NULL,
    "status" "TelegramDeliveryStatus" NOT NULL,
    "error_message" TEXT,
    "delivered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_delivery_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "crawl_profiles_binding_id_idx" ON "crawl_profiles"("binding_id");

-- CreateIndex
CREATE INDEX "crawl_profiles_enabled_next_run_at_idx" ON "crawl_profiles"("enabled", "next_run_at");

-- CreateIndex
CREATE INDEX "archive_occurrences_archived_post_id_created_at_idx" ON "archive_occurrences"("archived_post_id", "created_at");

-- CreateIndex
CREATE INDEX "archive_occurrences_binding_id_created_at_idx" ON "archive_occurrences"("binding_id", "created_at");

-- CreateIndex
CREATE INDEX "archive_occurrences_crawl_profile_id_created_at_idx" ON "archive_occurrences"("crawl_profile_id", "created_at");

-- CreateIndex
CREATE INDEX "categories_user_id_sort_order_idx" ON "categories"("user_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "categories_user_id_slug_key" ON "categories"("user_id", "slug");

-- CreateIndex
CREATE INDEX "tags_user_id_name_idx" ON "tags"("user_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "tags_user_id_slug_key" ON "tags"("user_id", "slug");

-- CreateIndex
CREATE INDEX "archived_post_tags_tag_id_created_at_idx" ON "archived_post_tags"("tag_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "archived_post_tags_archived_post_id_tag_id_source_key" ON "archived_post_tags"("archived_post_id", "tag_id", "source");

-- CreateIndex
CREATE INDEX "ai_provider_configs_user_id_enabled_idx" ON "ai_provider_configs"("user_id", "enabled");

-- CreateIndex
CREATE INDEX "ai_model_configs_provider_config_id_task_type_enabled_idx" ON "ai_model_configs"("provider_config_id", "task_type", "enabled");

-- CreateIndex
CREATE INDEX "ai_task_records_user_id_created_at_idx" ON "ai_task_records"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "ai_task_records_target_type_target_id_idx" ON "ai_task_records"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "ai_task_records_status_created_at_idx" ON "ai_task_records"("status", "created_at");

-- CreateIndex
CREATE INDEX "reports_user_id_report_type_period_start_period_end_idx" ON "reports"("user_id", "report_type", "period_start", "period_end");

-- CreateIndex
CREATE INDEX "report_source_posts_archived_post_id_created_at_idx" ON "report_source_posts"("archived_post_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "report_source_posts_report_id_archived_post_id_key" ON "report_source_posts"("report_id", "archived_post_id");

-- CreateIndex
CREATE INDEX "publish_channel_bindings_user_id_platform_type_status_idx" ON "publish_channel_bindings"("user_id", "platform_type", "status");

-- CreateIndex
CREATE INDEX "publish_drafts_user_id_status_created_at_idx" ON "publish_drafts"("user_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "publish_jobs_draft_id_created_at_idx" ON "publish_jobs"("draft_id", "created_at");

-- CreateIndex
CREATE INDEX "publish_jobs_channel_binding_id_status_created_at_idx" ON "publish_jobs"("channel_binding_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "telegram_subscriptions_user_id_enabled_frequency_idx" ON "telegram_subscriptions"("user_id", "enabled", "frequency");

-- CreateIndex
CREATE INDEX "telegram_delivery_logs_subscription_id_created_at_idx" ON "telegram_delivery_logs"("subscription_id", "created_at");

-- CreateIndex
CREATE INDEX "telegram_delivery_logs_status_created_at_idx" ON "telegram_delivery_logs"("status", "created_at");

-- CreateIndex
CREATE INDEX "archived_posts_user_id_source_platform_source_post_id_idx" ON "archived_posts"("user_id", "source_platform", "source_post_id");

-- CreateIndex
CREATE INDEX "crawl_runs_crawl_profile_id_created_at_idx" ON "crawl_runs"("crawl_profile_id", "created_at");

-- AddForeignKey
ALTER TABLE "crawl_runs" ADD CONSTRAINT "crawl_runs_crawl_profile_id_fkey" FOREIGN KEY ("crawl_profile_id") REFERENCES "crawl_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archived_posts" ADD CONSTRAINT "archived_posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archived_posts" ADD CONSTRAINT "archived_posts_primary_category_id_fkey" FOREIGN KEY ("primary_category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crawl_profiles" ADD CONSTRAINT "crawl_profiles_binding_id_fkey" FOREIGN KEY ("binding_id") REFERENCES "x_account_bindings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archive_occurrences" ADD CONSTRAINT "archive_occurrences_archived_post_id_fkey" FOREIGN KEY ("archived_post_id") REFERENCES "archived_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archive_occurrences" ADD CONSTRAINT "archive_occurrences_binding_id_fkey" FOREIGN KEY ("binding_id") REFERENCES "x_account_bindings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archive_occurrences" ADD CONSTRAINT "archive_occurrences_crawl_profile_id_fkey" FOREIGN KEY ("crawl_profile_id") REFERENCES "crawl_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archive_occurrences" ADD CONSTRAINT "archive_occurrences_crawl_run_id_fkey" FOREIGN KEY ("crawl_run_id") REFERENCES "crawl_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archived_post_tags" ADD CONSTRAINT "archived_post_tags_archived_post_id_fkey" FOREIGN KEY ("archived_post_id") REFERENCES "archived_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archived_post_tags" ADD CONSTRAINT "archived_post_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_provider_configs" ADD CONSTRAINT "ai_provider_configs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_model_configs" ADD CONSTRAINT "ai_model_configs_provider_config_id_fkey" FOREIGN KEY ("provider_config_id") REFERENCES "ai_provider_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_task_records" ADD CONSTRAINT "ai_task_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_task_records" ADD CONSTRAINT "ai_task_records_model_config_id_fkey" FOREIGN KEY ("model_config_id") REFERENCES "ai_model_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_source_posts" ADD CONSTRAINT "report_source_posts_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_source_posts" ADD CONSTRAINT "report_source_posts_archived_post_id_fkey" FOREIGN KEY ("archived_post_id") REFERENCES "archived_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publish_channel_bindings" ADD CONSTRAINT "publish_channel_bindings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publish_drafts" ADD CONSTRAINT "publish_drafts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publish_jobs" ADD CONSTRAINT "publish_jobs_draft_id_fkey" FOREIGN KEY ("draft_id") REFERENCES "publish_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publish_jobs" ADD CONSTRAINT "publish_jobs_channel_binding_id_fkey" FOREIGN KEY ("channel_binding_id") REFERENCES "publish_channel_bindings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telegram_subscriptions" ADD CONSTRAINT "telegram_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telegram_delivery_logs" ADD CONSTRAINT "telegram_delivery_logs_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "telegram_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
