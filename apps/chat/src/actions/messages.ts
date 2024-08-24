"use server";

import { prismaClient } from "@/lib/prisma/client";
import { DEFAULT_MESSAGE_SELECT } from "@/lib/prisma/message-model";
import { getLoggedInUserId } from "@/lib/session";

export async function getTopHighlightsAction({
  topicId,
  circleId,
}: {
  topicId: string;
  circleId: string;
}) {
  const userId = await getLoggedInUserId();
  if (!userId) return;

  const isInCircle = await prismaClient.circle.isUserInCirle({
    userId,
    circleId,
  });

  if (!isInCircle) return false;

  return await prismaClient.message.getTopHighlightedMessagesForTopic({
    topicId,
    select: DEFAULT_MESSAGE_SELECT,
  });
}
