-- CreateTable
CREATE TABLE "same_page_rounds" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "circleId" TEXT NOT NULL,
    "gameDate" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "revealedAt" TIMESTAMP(3),

    CONSTRAINT "same_page_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "same_page_answers" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "roundId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "matchKey" TEXT NOT NULL,
    "calledUserId" TEXT,

    CONSTRAINT "same_page_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "same_page_socks" (
    "circleId" TEXT NOT NULL,
    "holderUserId" TEXT,
    "heldSince" TIMESTAMP(3),

    CONSTRAINT "same_page_socks_pkey" PRIMARY KEY ("circleId")
);

-- CreateTable
CREATE TABLE "same_page_player_stats" (
    "circleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "played" INTEGER NOT NULL DEFAULT 0,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "bestStreak" INTEGER NOT NULL DEFAULT 0,
    "matchedRounds" INTEGER NOT NULL DEFAULT 0,
    "correctCalls" INTEGER NOT NULL DEFAULT 0,
    "callAttempts" INTEGER NOT NULL DEFAULT 0,
    "samePageDays" INTEGER NOT NULL DEFAULT 0,
    "socksEarned" INTEGER NOT NULL DEFAULT 0,
    "sockDaysHeld" INTEGER NOT NULL DEFAULT 0,
    "matchDist0" INTEGER NOT NULL DEFAULT 0,
    "matchDist1" INTEGER NOT NULL DEFAULT 0,
    "matchDist2" INTEGER NOT NULL DEFAULT 0,
    "matchDist3Plus" INTEGER NOT NULL DEFAULT 0,
    "resultsViewedGameDate" TEXT,

    CONSTRAINT "same_page_player_stats_pkey" PRIMARY KEY ("circleId","userId")
);

-- CreateIndex
CREATE INDEX "same_page_rounds_circleId_gameDate_idx" ON "same_page_rounds"("circleId", "gameDate");

-- CreateIndex
CREATE UNIQUE INDEX "same_page_rounds_circleId_gameDate_key" ON "same_page_rounds"("circleId", "gameDate");

-- CreateIndex
CREATE INDEX "same_page_answers_roundId_matchKey_idx" ON "same_page_answers"("roundId", "matchKey");

-- CreateIndex
CREATE INDEX "same_page_answers_userId_idx" ON "same_page_answers"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "same_page_answers_roundId_userId_key" ON "same_page_answers"("roundId", "userId");

-- AddForeignKey
ALTER TABLE "same_page_rounds" ADD CONSTRAINT "same_page_rounds_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "circles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "same_page_answers" ADD CONSTRAINT "same_page_answers_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "same_page_rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "same_page_answers" ADD CONSTRAINT "same_page_answers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "same_page_answers" ADD CONSTRAINT "same_page_answers_calledUserId_fkey" FOREIGN KEY ("calledUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "same_page_socks" ADD CONSTRAINT "same_page_socks_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "circles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "same_page_socks" ADD CONSTRAINT "same_page_socks_holderUserId_fkey" FOREIGN KEY ("holderUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "same_page_player_stats" ADD CONSTRAINT "same_page_player_stats_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "circles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "same_page_player_stats" ADD CONSTRAINT "same_page_player_stats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
