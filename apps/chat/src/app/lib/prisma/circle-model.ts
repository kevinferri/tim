import { getLoggedInUserId } from "@/lib/session";
import { prismaClient } from "@/lib/prisma/client";
import { Prisma } from "@prisma/client";

export const circleModel = {
  async getMeCircles({
    select,
    orderBy,
  }: {
    select: Prisma.CircleSelect;
    orderBy?: Prisma.CircleOrderByWithRelationInput;
  }) {
    const userId = await getLoggedInUserId();
    if (!userId) return undefined;

    return prismaClient.circle.findMany({
      orderBy,
      select,
      where: {
        members: {
          some: {
            id: userId,
          },
        },
      },
    });
  },

  async getMeCircleById({
    circleId,
    select,
  }: {
    circleId?: string;
    select: Prisma.CircleSelect;
  }) {
    const userId = await getLoggedInUserId();
    if (!userId) return undefined;

    return await prismaClient.circle.findUnique({
      where: {
        id: circleId,
        members: {
          some: {
            id: userId,
          },
        },
      },
      select,
    });
  },
};
