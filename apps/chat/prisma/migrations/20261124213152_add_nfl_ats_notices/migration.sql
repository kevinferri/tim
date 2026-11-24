-- CreateTable
CREATE TABLE "nfl_ats_notices" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weekId" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,

    CONSTRAINT "nfl_ats_notices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "nfl_ats_notices_circleId_idx" ON "nfl_ats_notices"("circleId");

-- CreateIndex
CREATE UNIQUE INDEX "nfl_ats_notices_weekId_circleId_kind_key" ON "nfl_ats_notices"("weekId", "circleId", "kind");

-- AddForeignKey
ALTER TABLE "nfl_ats_notices" ADD CONSTRAINT "nfl_ats_notices_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "nfl_ats_weeks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nfl_ats_notices" ADD CONSTRAINT "nfl_ats_notices_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "circles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
