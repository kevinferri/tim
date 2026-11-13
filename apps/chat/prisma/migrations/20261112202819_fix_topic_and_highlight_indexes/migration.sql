-- DropIndex
DROP INDEX "topics_userId_circleId_idx";

-- DropIndex
DROP INDEX "highlights_userId_idx";

-- CreateIndex
CREATE INDEX "topics_circleId_userId_idx" ON "topics"("circleId", "userId");

