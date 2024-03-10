import { Prisma } from "@prisma/client";
import { getLoggedInUserId } from "@/lib/session";
import { prismaClient } from "@/lib/prisma/client";
import { decrypt } from "@/lib/decryption";

function getReadableMessage(text?: string | null) {
  if (!text) return undefined;

  try {
    return decrypt(text);
  } catch {
    return "";
  }
}

export const messageModel = {
  async getMessagesForTopic({
    topicId,
    select,
  }: {
    topicId?: string;
    select: Prisma.MessageSelect;
  }) {
    const userId = getLoggedInUserId();
    if (!topicId || !userId) return [];

    const messages = await prismaClient.message.findMany({
      where: {
        topicId: topicId,
      },
      select,
    });

    return messages.map((message) => {
      return {
        ...message,
        text: getReadableMessage(message.text),
      };
    });
  },
};
