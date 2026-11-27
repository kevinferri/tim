-- CreateTable
CREATE TABLE "nfl_ats_weeks" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "season" INTEGER NOT NULL,
    "startsOn" TEXT NOT NULL,

    CONSTRAINT "nfl_ats_weeks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nfl_ats_games" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weekId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "homeTeam" TEXT NOT NULL,
    "awayTeam" TEXT NOT NULL,
    "kickoffAt" TIMESTAMP(3) NOT NULL,
    "spread" DOUBLE PRECISION NOT NULL,
    "homeScore" INTEGER,
    "awayScore" INTEGER,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "nfl_ats_games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nfl_ats_picks" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "result" TEXT,

    CONSTRAINT "nfl_ats_picks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "nfl_ats_weeks_season_startsOn_key" ON "nfl_ats_weeks"("season", "startsOn");

-- CreateIndex
CREATE UNIQUE INDEX "nfl_ats_games_eventId_key" ON "nfl_ats_games"("eventId");

-- CreateIndex
CREATE INDEX "nfl_ats_games_weekId_idx" ON "nfl_ats_games"("weekId");

-- CreateIndex
CREATE INDEX "nfl_ats_picks_gameId_idx" ON "nfl_ats_picks"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "nfl_ats_picks_userId_gameId_key" ON "nfl_ats_picks"("userId", "gameId");

-- AddForeignKey
ALTER TABLE "nfl_ats_games" ADD CONSTRAINT "nfl_ats_games_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "nfl_ats_weeks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nfl_ats_picks" ADD CONSTRAINT "nfl_ats_picks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nfl_ats_picks" ADD CONSTRAINT "nfl_ats_picks_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "nfl_ats_games"("id") ON DELETE CASCADE ON UPDATE CASCADE;
