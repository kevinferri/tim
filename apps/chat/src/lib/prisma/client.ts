import { PrismaClient } from "@prisma/client";
import { userModel } from "@/lib/prisma/user-model";
import { circleModel } from "@/lib/prisma/circle-model";
import { topicModel } from "@/lib/prisma/topic-model";
import { messageModel } from "@/lib/prisma/message-model";

const createClient = () => {
  return new PrismaClient({
    log: ["error"],
  }).$extends({
    model: {
      user: userModel,
      circle: circleModel,
      topic: topicModel,
      message: messageModel,
    },
  });
};

let prismaClient: ReturnType<typeof createClient>;

const prismaClientSingleton = () => {
  if (prismaClient) return prismaClient;
  prismaClient = createClient();

  return prismaClient;
};

declare const globalThis: {
  prismaClient: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaClient = globalThis.prismaClient ?? prismaClientSingleton();
} else {
  prismaClient = prismaClientSingleton();
}

export { prismaClient };

process.on("SIGTERM", async () => {
  await prismaClient.$disconnect();
  process.exit(0);
});
