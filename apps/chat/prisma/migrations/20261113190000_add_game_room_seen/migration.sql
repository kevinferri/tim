-- CreateTable
CREATE TABLE "game_room_seen" (
    "userId" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "badgeKeys" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_room_seen_pkey" PRIMARY KEY ("userId","circleId")
);

-- AddForeignKey
ALTER TABLE "game_room_seen" ADD CONSTRAINT "game_room_seen_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_room_seen" ADD CONSTRAINT "game_room_seen_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "circles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
