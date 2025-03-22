"use server";

import { prismaClient } from "@/lib/prisma/client";

export async function updateUserStatus(status: string | null) {
  const user = await prismaClient.user.getLoggedIn({
    select: {
      id: true,
      status: true,
    },
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
}
