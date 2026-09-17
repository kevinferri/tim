-- CreateTable
CREATE TABLE "topic_preferences" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "order" DOUBLE PRECISION,
    "isMuted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "topic_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "topic_preferences_userId_idx" ON "topic_preferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "topic_preferences_userId_topicId_key" ON "topic_preferences"("userId", "topicId");

-- AddForeignKey
ALTER TABLE "topic_preferences" ADD CONSTRAINT "topic_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_preferences" ADD CONSTRAINT "topic_preferences_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
