-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "command" TEXT;

-- CreateIndex
CREATE INDEX "messages_userId_command_idx" ON "messages"("userId", "command");

