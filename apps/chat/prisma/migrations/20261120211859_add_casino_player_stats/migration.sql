-- CreateTable
CREATE TABLE "casino_player_stats" (
    "circleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "game" TEXT NOT NULL,
    "net" INTEGER NOT NULL DEFAULT 0,
    "wagered" INTEGER NOT NULL DEFAULT 0,
    "handsPlayed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "casino_player_stats_pkey" PRIMARY KEY ("circleId","userId","game")
);

-- CreateIndex
CREATE INDEX "casino_player_stats_circleId_idx" ON "casino_player_stats"("circleId");

-- CreateIndex
CREATE INDEX "casino_player_stats_userId_idx" ON "casino_player_stats"("userId");

-- AddForeignKey
ALTER TABLE "casino_player_stats" ADD CONSTRAINT "casino_player_stats_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "circles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "casino_player_stats" ADD CONSTRAINT "casino_player_stats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
