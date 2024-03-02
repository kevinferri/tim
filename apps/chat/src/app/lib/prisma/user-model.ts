import { prismaClient } from "./client";
import { getLoggedInUserId } from "../session";
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
