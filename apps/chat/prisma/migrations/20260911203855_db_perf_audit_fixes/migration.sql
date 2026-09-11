-- Drop indexes that duplicated coverage already provided elsewhere:
-- * messages_id_idx duplicated the primary key index on messages.id
-- * messages_userId_idx was a strict prefix of messages_userId_topicId_idx
-- * users_email_idx duplicated the unique index backing users.email
-- * topic_histories_userId_createdAt_idx is superseded below by an
--   updatedAt-ordered index, now that topic history rows are upserted
--   in place instead of replaced on every visit (see below).
DROP INDEX "messages_id_idx";

-- DropIndex
DROP INDEX "messages_userId_idx";

-- DropIndex
DROP INDEX "topic_histories_userId_createdAt_idx";

-- DropIndex
DROP INDEX "users_email_idx";

-- Pre-migration cleanup: application code previously created highlights
-- and topic_histories via non-atomic check-then-write / delete-then-insert
-- sequences, which under concurrent requests could race into duplicate
-- (userId, messageId) / (userId, topicId) rows. Collapse any that exist
-- before the unique constraints below make such duplicates impossible,
-- keeping the newest row of each group.
DELETE FROM "highlights" h
USING "highlights" newer
WHERE h."userId" = newer."userId"
  AND h."messageId" = newer."messageId"
  AND (h."createdAt", h."id") < (newer."createdAt", newer."id");

DELETE FROM "topic_histories" h
USING "topic_histories" newer
WHERE h."userId" = newer."userId"
  AND h."topicId" = newer."topicId"
  AND (h."updatedAt", h."id") < (newer."updatedAt", newer."id");

-- CreateIndex
CREATE UNIQUE INDEX "highlights_userId_messageId_key" ON "highlights"("userId", "messageId");

-- CreateIndex
CREATE INDEX "topic_histories_userId_updatedAt_idx" ON "topic_histories"("userId", "updatedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "topic_histories_userId_topicId_key" ON "topic_histories"("userId", "topicId");
