import { PrismaClient } from "@prisma/client";
import { userModel } from "@/lib/prisma/user-model";
import { circleModel } from "@/lib/prisma/circle-model";
import { topicModel } from "@/lib/prisma/topic-model";
import { messageModel } from "@/lib/prisma/message-model";

let prismaClient: PrismaClient;

const prismaClientSingleton = () => {
  if (prismaClient) return prismaClient;

  // @ts-expect-error
  prismaClient = new PrismaClient({
    log: ["error"],
  }).$extends({
    model: {
      user: userModel,
      circle: circleModel,
      topic: topicModel,
      message: messageModel,
    },
  });

  return prismaClient;
};

declare const globalThis: {
  prismaClient: PrismaClient | undefined;
} & typeof global;

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaClient = globalThis.prismaClient ?? prismaClientSingleton();
} else {
  prismaClient = prismaClientSingleton();
}

export { prismaClient };
