-- CreateTable
CREATE TABLE "table_chat_lines" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "circleId" TEXT NOT NULL,
    "game" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "table_chat_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "table_chat_lines_circleId_game_createdAt_idx" ON "table_chat_lines"("circleId", "game", "createdAt");

-- CreateIndex
CREATE INDEX "table_chat_lines_createdAt_idx" ON "table_chat_lines"("createdAt");

-- CreateIndex
CREATE INDEX "table_chat_lines_userId_idx" ON "table_chat_lines"("userId");

-- AddForeignKey
ALTER TABLE "table_chat_lines" ADD CONSTRAINT "table_chat_lines_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "circles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "table_chat_lines" ADD CONSTRAINT "table_chat_lines_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
