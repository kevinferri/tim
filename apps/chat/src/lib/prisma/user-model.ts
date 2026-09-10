import { prismaClient } from "@/lib/prisma/client";
import { Prisma } from "@prisma/client";

export const userModel = {
  async getById({
    userId,
    select,
  }: {
    userId?: string;
    select: Prisma.UserSelect;
  }) {
    if (!userId) return undefined;

    return await prismaClient.user.findUnique({
      where: { id: userId },
      select,
    });
  },

  async getMembersForCircle({
    userId,
    circleId,
    select,
  }: {
    userId?: string;
    circleId: string;
    select: Prisma.UserSelect;
  }) {
    if (!userId) return [];

    return (
      (await prismaClient.user.findMany({
        where: {
          circleMemberships: {
            some: {
              id: circleId,
            },
          },
        },
        select,
      })) ?? []
    );
  },

  async updateStatus({
    userId,
    status,
  }: {
    userId?: string;
    status: string | null;
  }) {
    if (!userId) return false;

    const user = await prismaClient.user.findUnique({
      where: { id: userId },
      select: { id: true, status: true },
    });

    if (!user || user.status === status) return false;

    const updatedUser = await prismaClient.user.update({
      where: { id: user.id },
      data: { status, lastStatusUpdate: Boolean(status) ? new Date() : null },
      select: {
        id: true,
        status: true,
        name: true,
        lastStatusUpdate: true,
      },
    });

    return { data: updatedUser };
  },
};
