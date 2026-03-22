ALTER TABLE "publish_channel_bindings"
ADD COLUMN IF NOT EXISTS "last_validated_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "last_validation_error" TEXT;
