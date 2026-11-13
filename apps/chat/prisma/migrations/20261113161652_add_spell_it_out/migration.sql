-- CreateTable
CREATE TABLE "spell_it_out_plays" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "gameDate" TEXT NOT NULL,
    "guesses" TEXT[],
    "solved" BOOLEAN NOT NULL DEFAULT false,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "spell_it_out_plays_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "spell_it_out_plays_userId_gameDate_key" ON "spell_it_out_plays"("userId", "gameDate");

-- AddForeignKey
ALTER TABLE "spell_it_out_plays" ADD CONSTRAINT "spell_it_out_plays_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
