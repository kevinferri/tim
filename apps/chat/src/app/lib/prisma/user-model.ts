import { prismaClient } from "@/lib/prisma/client";
import { getLoggedInUserId } from "@/lib/session";
import { Prisma } from "@prisma/client";

export const userModel = {
  async getLoggedIn({ select }: { select: Prisma.UserSelect }) {
    const id = await getLoggedInUserId();
    if (!id) return undefined;

    return await prismaClient.user.findUnique({
      where: { id },
      select,
    });
  },
};
