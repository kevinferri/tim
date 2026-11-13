-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "circleId" TEXT,
ALTER COLUMN "actorId" DROP NOT NULL,
ALTER COLUMN "messageId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "notifications_circleId_idx" ON "notifications"("circleId");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "circles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

