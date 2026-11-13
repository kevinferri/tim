-- CreateTable
CREATE TABLE "circle_games" (
    "circleId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "enabledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "circle_games_pkey" PRIMARY KEY ("circleId","gameId")
);

-- CreateIndex
CREATE INDEX "circle_games_gameId_idx" ON "circle_games"("gameId");

-- AddForeignKey
ALTER TABLE "circle_games" ADD CONSTRAINT "circle_games_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "circles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
