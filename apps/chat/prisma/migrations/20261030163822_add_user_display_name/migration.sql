-- AlterTable
ALTER TABLE "users" ADD COLUMN "displayName" TEXT;

-- Backfill: first word of the Google name, matching what sign-up now writes.
UPDATE "users" SET "displayName" = COALESCE(split_part("name", ' ', 1), '');

ALTER TABLE "users" ALTER COLUMN "displayName" SET NOT NULL;
