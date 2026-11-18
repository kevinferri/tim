import { cache } from "react";
import { prismaClient } from "@/lib/prisma/client";

/** The signed-in user's circles. Cached per request: the root and (app) layouts both need them. */
export const getUserCircles = cache((userId: string | undefined) =>
  prismaClient.circle.getForUser({
    userId,
    select: {
      id: true,
      name: true,
      defaultTopicId: true,
      imageUrl: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  }),
);
