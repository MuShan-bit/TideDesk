ALTER TABLE "archived_posts"
ADD COLUMN IF NOT EXISTS "primary_category_locked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "tag_assignments_locked" BOOLEAN NOT NULL DEFAULT false;

UPDATE "archived_posts"
SET "primary_category_locked" = true
WHERE "primary_category_source" = 'MANUAL';

UPDATE "archived_posts"
SET "tag_assignments_locked" = true
WHERE EXISTS (
  SELECT 1
  FROM "archived_post_tags" AS "apt"
  WHERE "apt"."archived_post_id" = "archived_posts"."id"
    AND "apt"."source" = 'MANUAL'
);
