"use server";

import { prismaClient } from "@/lib/prisma/client";
import { getLoggedInUserId } from "@/lib/session";

export async function markAllNotificationsRead() {
  const userId = await getLoggedInUserId();

  return await prismaClient.notification.markAllReadForUser({ userId });
}
