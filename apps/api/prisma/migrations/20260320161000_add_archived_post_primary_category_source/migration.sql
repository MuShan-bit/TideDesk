ALTER TABLE "archived_posts"
ADD COLUMN IF NOT EXISTS "primary_category_source" "TaxonomySource";
