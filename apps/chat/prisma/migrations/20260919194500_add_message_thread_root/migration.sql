-- AlterTable
ALTER TABLE "messages" ADD COLUMN "threadRootId" TEXT;

-- Backfill: existing one-level replies treat replyToId as the thread root.
UPDATE "messages"
SET "threadRootId" = "replyToId"
WHERE "replyToId" IS NOT NULL AND "threadRootId" IS NULL;

-- CreateIndex
CREATE INDEX "messages_threadRootId_createdAt_idx" ON "messages"("threadRootId", "createdAt");

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_threadRootId_fkey" FOREIGN KEY ("threadRootId") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
