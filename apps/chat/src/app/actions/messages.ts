"use server";

import { prismaClient } from "@/lib/prisma/client";
import { DEFAULT_MESSAGE_SELECT } from "@/lib/prisma/message-model";
import { getLoggedInUserId } from "@/lib/session";
import urlMetadata from "url-metadata";

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

export async function generatePreviewForLink(url: string) {
  const userId = await getLoggedInUserId();
  if (!userId) return;

  try {
    const metadata = await urlMetadata(url);

    return {
      ogDescription: metadata.description || metadata["og:description"],
      ogTitle: metadata.title || metadata["og:title"],
      ogImage: metadata.image || metadata["og:image"],
    };
  } catch (err) {
    return false;
  }
}
