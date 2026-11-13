-- CreateTable
CREATE TABLE "wordsmith_plays" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "gameDate" TEXT NOT NULL,
    "guesses" TEXT[],
    "solved" BOOLEAN NOT NULL DEFAULT false,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "wordsmith_plays_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wordsmith_plays_userId_gameDate_key" ON "wordsmith_plays"("userId", "gameDate");

-- AddForeignKey
ALTER TABLE "wordsmith_plays" ADD CONSTRAINT "wordsmith_plays_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
