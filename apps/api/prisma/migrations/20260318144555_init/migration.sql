-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "BindingStatus" AS ENUM ('PENDING', 'ACTIVE', 'INVALID', 'DISABLED');

-- CreateEnum
CREATE TYPE "CredentialSource" AS ENUM ('WEB_LOGIN', 'COOKIE_IMPORT', 'EXTENSION');

-- CreateEnum
CREATE TYPE "CrawlTriggerType" AS ENUM ('MANUAL', 'SCHEDULED', 'RETRY');

-- CreateEnum
CREATE TYPE "CrawlRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCESS', 'PARTIAL_FAILED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CrawlActionType" AS ENUM ('CREATED', 'SKIPPED', 'FAILED');

-- CreateEnum
CREATE TYPE "PostType" AS ENUM ('POST', 'REPOST', 'QUOTE', 'REPLY');

-- CreateEnum
CREATE TYPE "ArchiveStatus" AS ENUM ('ACTIVE', 'HIDDEN', 'DELETED');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO', 'GIF');

-- CreateEnum
CREATE TYPE "RelationType" AS ENUM ('QUOTE', 'REPOST', 'REPLY');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "email_verified" TIMESTAMP(3),
    "image" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "x_account_bindings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "x_user_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "display_name" TEXT,
    "avatar_url" TEXT,
    "status" "BindingStatus" NOT NULL DEFAULT 'PENDING',
    "credential_source" "CredentialSource" NOT NULL,
    "auth_payload_encrypted" TEXT NOT NULL,
    "last_validated_at" TIMESTAMP(3),
    "crawl_enabled" BOOLEAN NOT NULL DEFAULT true,
    "crawl_interval_minutes" INTEGER NOT NULL DEFAULT 60,
    "last_crawled_at" TIMESTAMP(3),
    "next_crawl_at" TIMESTAMP(3),
    "last_error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "x_account_bindings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crawl_jobs" (
    "id" TEXT NOT NULL,
    "binding_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "interval_minutes" INTEGER NOT NULL,
    "last_run_at" TIMESTAMP(3),
    "next_run_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crawl_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crawl_runs" (
    "id" TEXT NOT NULL,
    "binding_id" TEXT NOT NULL,
    "crawl_job_id" TEXT,
    "trigger_type" "CrawlTriggerType" NOT NULL,
    "status" "CrawlRunStatus" NOT NULL DEFAULT 'QUEUED',
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "fetched_count" INTEGER NOT NULL DEFAULT 0,
    "new_count" INTEGER NOT NULL DEFAULT 0,
    "skipped_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "error_detail" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crawl_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crawl_run_posts" (
    "id" TEXT NOT NULL,
    "crawl_run_id" TEXT NOT NULL,
    "x_post_id" TEXT NOT NULL,
    "archived_post_id" TEXT,
    "action_type" "CrawlActionType" NOT NULL,
    "reason" TEXT,
    "raw_payload_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crawl_run_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "archived_posts" (
    "id" TEXT NOT NULL,
    "binding_id" TEXT NOT NULL,
    "first_crawl_run_id" TEXT,
    "x_post_id" TEXT NOT NULL,
    "post_url" TEXT NOT NULL,
    "post_type" "PostType" NOT NULL,
    "archive_status" "ArchiveStatus" NOT NULL DEFAULT 'ACTIVE',
    "author_x_user_id" TEXT,
    "author_username" TEXT NOT NULL,
    "author_display_name" TEXT,
    "author_avatar_url" TEXT,
    "language" TEXT,
    "raw_text" TEXT NOT NULL,
    "rich_text_json" JSONB NOT NULL,
    "rendered_html" TEXT,
    "raw_payload_json" JSONB NOT NULL,
    "source_created_at" TIMESTAMP(3) NOT NULL,
    "archived_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reply_count" INTEGER,
    "repost_count" INTEGER,
    "quote_count" INTEGER,
    "favorite_count" INTEGER,
    "view_count" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "archived_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "archived_post_media" (
    "id" TEXT NOT NULL,
    "archived_post_id" TEXT NOT NULL,
    "media_type" "MediaType" NOT NULL,
    "source_url" TEXT NOT NULL,
    "preview_url" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "duration_ms" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "archived_post_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "archived_post_relations" (
    "id" TEXT NOT NULL,
    "archived_post_id" TEXT NOT NULL,
    "relation_type" "RelationType" NOT NULL,
    "target_x_post_id" TEXT,
    "target_url" TEXT,
    "target_author_username" TEXT,
    "snapshot_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "archived_post_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE INDEX "x_account_bindings_user_id_idx" ON "x_account_bindings"("user_id");

-- CreateIndex
CREATE INDEX "x_account_bindings_status_idx" ON "x_account_bindings"("status");

-- CreateIndex
CREATE INDEX "x_account_bindings_next_crawl_at_idx" ON "x_account_bindings"("next_crawl_at");

-- CreateIndex
CREATE UNIQUE INDEX "crawl_jobs_binding_id_key" ON "crawl_jobs"("binding_id");

-- CreateIndex
CREATE INDEX "crawl_runs_binding_id_created_at_idx" ON "crawl_runs"("binding_id", "created_at");

-- CreateIndex
CREATE INDEX "crawl_runs_status_idx" ON "crawl_runs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "crawl_run_posts_crawl_run_id_x_post_id_key" ON "crawl_run_posts"("crawl_run_id", "x_post_id");

-- CreateIndex
CREATE INDEX "archived_posts_binding_id_archived_at_idx" ON "archived_posts"("binding_id", "archived_at");

-- CreateIndex
CREATE INDEX "archived_posts_binding_id_source_created_at_idx" ON "archived_posts"("binding_id", "source_created_at");

-- CreateIndex
CREATE INDEX "archived_posts_author_username_idx" ON "archived_posts"("author_username");

-- CreateIndex
CREATE INDEX "archived_posts_post_type_idx" ON "archived_posts"("post_type");

-- CreateIndex
CREATE UNIQUE INDEX "archived_posts_binding_id_x_post_id_key" ON "archived_posts"("binding_id", "x_post_id");

-- CreateIndex
CREATE INDEX "archived_post_media_archived_post_id_sort_order_idx" ON "archived_post_media"("archived_post_id", "sort_order");

-- CreateIndex
CREATE INDEX "archived_post_relations_archived_post_id_idx" ON "archived_post_relations"("archived_post_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "x_account_bindings" ADD CONSTRAINT "x_account_bindings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crawl_jobs" ADD CONSTRAINT "crawl_jobs_binding_id_fkey" FOREIGN KEY ("binding_id") REFERENCES "x_account_bindings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crawl_runs" ADD CONSTRAINT "crawl_runs_binding_id_fkey" FOREIGN KEY ("binding_id") REFERENCES "x_account_bindings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crawl_runs" ADD CONSTRAINT "crawl_runs_crawl_job_id_fkey" FOREIGN KEY ("crawl_job_id") REFERENCES "crawl_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crawl_run_posts" ADD CONSTRAINT "crawl_run_posts_crawl_run_id_fkey" FOREIGN KEY ("crawl_run_id") REFERENCES "crawl_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crawl_run_posts" ADD CONSTRAINT "crawl_run_posts_archived_post_id_fkey" FOREIGN KEY ("archived_post_id") REFERENCES "archived_posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archived_posts" ADD CONSTRAINT "archived_posts_binding_id_fkey" FOREIGN KEY ("binding_id") REFERENCES "x_account_bindings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archived_posts" ADD CONSTRAINT "archived_posts_first_crawl_run_id_fkey" FOREIGN KEY ("first_crawl_run_id") REFERENCES "crawl_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archived_post_media" ADD CONSTRAINT "archived_post_media_archived_post_id_fkey" FOREIGN KEY ("archived_post_id") REFERENCES "archived_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archived_post_relations" ADD CONSTRAINT "archived_post_relations_archived_post_id_fkey" FOREIGN KEY ("archived_post_id") REFERENCES "archived_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
