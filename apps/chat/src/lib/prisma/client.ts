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

const withPoolLimits = (databaseUrl: string) => {
  const url = new URL(databaseUrl);
  if (!url.searchParams.has("connection_limit")) {
    url.searchParams.set(
      "connection_limit",
      process.env.DB_CONNECTION_LIMIT ?? "5",
    );
  }
  if (!url.searchParams.has("pool_timeout")) {
    url.searchParams.set("pool_timeout", process.env.DB_POOL_TIMEOUT ?? "10");
  }
  return url.toString();
};

const createClient = () => {
  const databaseUrl = process.env.DATABASE_URL;

  const baseClient = new PrismaClient({
    log: ["error"],
    ...(databaseUrl && {
      datasources: { db: { url: withPoolLimits(databaseUrl) } },
    }),
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
