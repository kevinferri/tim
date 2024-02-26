import { PrismaClient } from "@prisma/client";
import { userModel } from "@/lib/prisma/user-model";
import { circleModel } from "@/lib/prisma/circle-model";
import { topicModel } from "@/lib/prisma/topic-model";

const prismaClientSingleton = () => {
  const client = new PrismaClient({ log: ["error"] }).$extends({
    model: {
      user: userModel,
      circle: circleModel,
      topic: topicModel,
    },
  });

  return client;
};

declare global {
  var prismaClient: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prismaClient = globalThis.prismaClient ?? prismaClientSingleton();

export { prismaClient };

if (process.env.NODE_ENV !== "production")
  globalThis.prismaClient = prismaClient;
