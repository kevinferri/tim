import { prismaClient } from "@/lib/prisma/client";

export const highlightModel = {
  async countGivenByUser({ userId }: { userId?: string }) {
    if (!userId) return 0;

    return await prismaClient.highlight.count({ where: { userId } });
  },

  async countReceivedByUser({ userId }: { userId?: string }) {
    if (!userId) return 0;

    return await prismaClient.highlight.count({
      where: { message: { userId } },
    });
  },
};
