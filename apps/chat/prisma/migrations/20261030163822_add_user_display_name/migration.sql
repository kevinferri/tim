-- AlterTable
ALTER TABLE "users" ADD COLUMN "displayName" TEXT;

-- Backfill: same as getInitialDisplayName (first word of the name, else email local part, max 32).
UPDATE "users" SET "displayName" = left(
  COALESCE(NULLIF(split_part(btrim("name"), ' ', 1), ''), split_part("email", '@', 1)),
  32
);

ALTER TABLE "users" ALTER COLUMN "displayName" SET NOT NULL;
