import { PrismaClient } from "@prisma/client";
import { userModel } from "@/lib/prisma/user-model";
import { circleModel } from "@/lib/prisma/circle-model";
import { topicModel } from "@/lib/prisma/topic-model";
import { messageModel } from "@/lib/prisma/message-model";
import { highlightModel } from "@/lib/prisma/highlight-model";
import { topicHistoryModel } from "@/lib/prisma/topic-history-model";

declare global {
  var prismaClient: ReturnType<typeof createClient> | undefined;
}

const createClient = () => {
  const baseClient = new PrismaClient({
    log: ["error"],
  });

  return baseClient.$extends({
    model: {
      user: userModel,
      circle: circleModel,
      topic: topicModel,
      message: messageModel,
      highlight: highlightModel,
      topicHistory: topicHistoryModel,
    },
  });
};

if (!global.prismaClient) {
  global.prismaClient = createClient();
}

const prismaClient = global.prismaClient;

export { prismaClient };

const cleanup = async () => {
  if (prismaClient) {
    await prismaClient.$disconnect();
    process.exit(0);
  }
};

process.on("SIGTERM", cleanup);
process.on("SIGINT", cleanup);
