ALTER TABLE "ai_model_configs"
ADD COLUMN IF NOT EXISTS "input_token_price_usd" DECIMAL(12, 6),
ADD COLUMN IF NOT EXISTS "output_token_price_usd" DECIMAL(12, 6);

ALTER TABLE "ai_task_records"
ADD COLUMN IF NOT EXISTS "provider_config_id" TEXT,
ADD COLUMN IF NOT EXISTS "rate_limit_scope" TEXT,
ADD COLUMN IF NOT EXISTS "input_tokens" INTEGER,
ADD COLUMN IF NOT EXISTS "output_tokens" INTEGER,
ADD COLUMN IF NOT EXISTS "total_tokens" INTEGER,
ADD COLUMN IF NOT EXISTS "estimated_cost_usd" DECIMAL(12, 6),
ADD COLUMN IF NOT EXISTS "started_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "finished_at" TIMESTAMP(3);

UPDATE "ai_task_records" atr
SET "provider_config_id" = amc."provider_config_id"
FROM "ai_model_configs" amc
WHERE atr."model_config_id" = amc."id"
  AND atr."provider_config_id" IS NULL;

CREATE INDEX IF NOT EXISTS "ai_task_records_user_id_task_type_created_at_idx"
ON "ai_task_records"("user_id", "task_type", "created_at");

CREATE INDEX IF NOT EXISTS "ai_task_records_provider_config_id_created_at_idx"
ON "ai_task_records"("provider_config_id", "created_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'ai_task_records_provider_config_id_fkey'
      AND table_name = 'ai_task_records'
  ) THEN
    ALTER TABLE "ai_task_records"
    ADD CONSTRAINT "ai_task_records_provider_config_id_fkey"
    FOREIGN KEY ("provider_config_id")
    REFERENCES "ai_provider_configs"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END $$;
