"use server";

import { getLoggedInUserId } from "@/lib/session";
import { prismaClient } from "@/lib/prisma/client";

export async function updateUserStatus(status: string | null) {
  const userId = await getLoggedInUserId();
  if (!userId) return false;

  const user = await prismaClient.user.update({
    where: { id: userId },
    data: { status, lastStatusUpdate: new Date() },
    select: {
      id: true,
      status: true,
      name: true,
      lastStatusUpdate: true,
    },
  });

  return { data: user };
}
