"use server";

import { getLoggedInUserId } from "@/lib/session";
import { prismaClient } from "@/lib/prisma/client";

export async function deleteMessage(messageId: string) {
  const userId = await getLoggedInUserId();
  const message = await prismaClient.message.findUnique({
    where: {
      id: messageId,
      userId,
    },
    select: {
      id: true,
      userId: true,
      topicId: true,
    },
  });

  if (!message) return false;

  const data = await prismaClient.message.delete({
    where: {
      id: messageId,
    },
    select: {
      id: true,
    },
  });

  return { data };
}
