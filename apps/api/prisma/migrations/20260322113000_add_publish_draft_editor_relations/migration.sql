-- CreateTable
CREATE TABLE "publish_draft_tags" (
    "id" TEXT NOT NULL,
    "draft_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "publish_draft_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publish_draft_target_channels" (
    "id" TEXT NOT NULL,
    "draft_id" TEXT NOT NULL,
    "channel_binding_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "publish_draft_target_channels_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "publish_draft_tags_draft_id_tag_id_key" ON "publish_draft_tags"("draft_id", "tag_id");

-- CreateIndex
CREATE INDEX "publish_draft_tags_tag_id_created_at_idx" ON "publish_draft_tags"("tag_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "publish_draft_target_channels_draft_id_channel_binding_id_key" ON "publish_draft_target_channels"("draft_id", "channel_binding_id");

-- CreateIndex
CREATE INDEX "publish_draft_target_channels_channel_binding_id_created_at_idx" ON "publish_draft_target_channels"("channel_binding_id", "created_at");

-- AddForeignKey
ALTER TABLE "publish_draft_tags" ADD CONSTRAINT "publish_draft_tags_draft_id_fkey" FOREIGN KEY ("draft_id") REFERENCES "publish_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publish_draft_tags" ADD CONSTRAINT "publish_draft_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publish_draft_target_channels" ADD CONSTRAINT "publish_draft_target_channels_draft_id_fkey" FOREIGN KEY ("draft_id") REFERENCES "publish_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publish_draft_target_channels" ADD CONSTRAINT "publish_draft_target_channels_channel_binding_id_fkey" FOREIGN KEY ("channel_binding_id") REFERENCES "publish_channel_bindings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
