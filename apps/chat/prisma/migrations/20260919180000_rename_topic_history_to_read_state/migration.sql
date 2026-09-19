-- topic_histories -> topic_read_states, hand-written as renames so existing
-- rows and their values are kept (Prisma would generate drop + create).

ALTER TABLE "topic_histories" RENAME TO "topic_read_states";

-- updatedAt was the read cursor; it's now lastReadAt and no longer a generic
-- audit column.
ALTER TABLE "topic_read_states" RENAME COLUMN "updatedAt" TO "lastReadAt";
ALTER TABLE "topic_read_states" DROP COLUMN "createdAt";

-- (userId, topicId) is already unique, so it becomes the primary key and the
-- surrogate id (and its separate unique index) goes away.
ALTER TABLE "topic_read_states" DROP CONSTRAINT "topic_histories_pkey";
ALTER TABLE "topic_read_states" DROP COLUMN "id";
DROP INDEX "topic_histories_userId_topicId_key";
ALTER TABLE "topic_read_states" ADD CONSTRAINT "topic_read_states_pkey" PRIMARY KEY ("userId", "topicId");

ALTER INDEX "topic_histories_userId_updatedAt_idx" RENAME TO "topic_read_states_userId_lastReadAt_idx";
ALTER TABLE "topic_read_states" RENAME CONSTRAINT "topic_histories_userId_fkey" TO "topic_read_states_userId_fkey";
ALTER TABLE "topic_read_states" RENAME CONSTRAINT "topic_histories_topicId_fkey" TO "topic_read_states_topicId_fkey";
