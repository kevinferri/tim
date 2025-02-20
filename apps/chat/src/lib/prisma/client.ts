import { PrismaClient } from "@prisma/client";
import { userModel } from "@/lib/prisma/user-model";
import { circleModel } from "@/lib/prisma/circle-model";
import { topicModel } from "@/lib/prisma/topic-model";
import { messageModel } from "@/lib/prisma/message-model";
import { cacheQuery, invalidateCache } from "@/lib/prisma/cache";

declare global {
  var prismaClient: ReturnType<typeof createClient> | undefined;
}

const createClient = () => {
  const baseClient = new PrismaClient({
    log: ["error"],
  });

  const cachedModels = ["user", "topic", "circle"] as const;

  return baseClient.$extends({
    model: {
      user: userModel,
      circle: circleModel,
      topic: topicModel,
      message: messageModel,
    },
    query: Object.fromEntries(
      cachedModels.flatMap((model) => [
        [
          model,
          {
            async findUnique({ args, query }: unknown) {
              return cacheQuery(model, args, query);
            },
            async findFirst({ args, query }: unknown) {
              return cacheQuery(model, args, query);
            },
            async findMany({ args, query }: unknown) {
              return cacheQuery(model, args, query);
            },
            async create({ args, query }: unknown) {
              invalidateCache(model);
              return query(args);
            },
            async upsert({ args, query }: unknown) {
              invalidateCache(model);
              return query(args);
            },
            async update({ args, query }: unknown) {
              invalidateCache(model);
              return query(args);
            },
            async delete({ args, query }: unknown) {
              invalidateCache(model);
              return query(args);
            },
          },
        ],
      ])
    ) as Record<(typeof cachedModels)[number], any>,
  });
};

let prismaClient: ReturnType<typeof createClient>;

if (process.env.NODE_ENV === "production") {
  prismaClient = createClient();
} else {
  if (!global.prismaClient) {
    global.prismaClient = createClient();
  }
  prismaClient = global.prismaClient;
}

export { prismaClient };

const cleanup = async () => {
  if (prismaClient) {
    await prismaClient.$disconnect();
    process.exit(0);
  }
};

process.on("SIGTERM", cleanup);
process.on("SIGINT", cleanup);
