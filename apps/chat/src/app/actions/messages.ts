"use server";

import { prismaClient } from "@/lib/prisma/client";
import { DEFAULT_MESSAGE_SELECT } from "@/lib/prisma/message-model";

export async function getTopHighlightsAction(topicId: string) {
  return await prismaClient.message.getTopHighlightedMessagesForTopic({
    topicId,
    select: DEFAULT_MESSAGE_SELECT,
  });
}
