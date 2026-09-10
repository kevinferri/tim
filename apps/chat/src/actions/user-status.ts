"use server";

import { prismaClient } from "@/lib/prisma/client";
import { getLoggedInUserId } from "@/lib/session";

export async function updateUserStatus(status: string | null) {
  const userId = await getLoggedInUserId();

  return await prismaClient.user.updateStatus({ userId, status });
}
