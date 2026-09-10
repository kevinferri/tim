import { Prisma } from "@prisma/client";
import { prismaClient } from "@/lib/prisma/client";
import { decrypt } from "@/lib/decryption";

type MessageArgs = {
  topicId?: string;
  before?: string;
  select: Prisma.MessageSelect;
};

export const MESSAGE_LIMIT = 30;
export const TOP_HIGHLIGHTS_LIMIT = 10;
export const DEFAULT_MESSAGE_SELECT = {
  id: true,
  text: true,
  createdAt: true,
  topicId: true,
  mediaUrl: true,
  highlights: {
    select: {
      id: true,
      userId: true,
      createdBy: {
        select: {
          imageUrl: true,
        },
      },
    },
  },
  sentBy: {
    select: {
      id: true,
      name: true,
      imageUrl: true,
      createdAt: true,
      status: true,
      lastStatusUpdate: true,
    },
  },
};

export const normalizeMessages = <T extends { text?: string | null }>(
  messages: T[],
): (Omit<T, "text"> & { text?: string })[] =>
  messages.map((message) => ({
    ...message,
    text: getReadableMessage(message.text),
  }));

function getReadableMessage(text?: string | null) {
  if (!text) return undefined;

  try {
    return decrypt(text);
  } catch {
    return "";
  }
}

export const messageModel = {
  async getById({
    messageId,
    select,
  }: {
    messageId?: string;
    select: Prisma.MessageSelect;
  }) {
    if (!messageId) return undefined;

    return await prismaClient.message.findUnique({
      where: { id: messageId },
      select,
    });
  },

  async getMessagesForTopic({
    requestingUserId,
    topicId,
    select,
    before,
  }: MessageArgs & { requestingUserId?: string }) {
    const cursor = before
      ? {
          createdAt: {
            lt: before,
          },
        }
      : undefined;

    if (!topicId || !requestingUserId) return [];

    const messages = await prismaClient.message.findMany({
      select,
      where: {
        topicId,
        ...cursor,
      },
      take: MESSAGE_LIMIT,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });

    return normalizeMessages([...messages].reverse());
  },

  async getTopHighlightedMessagesForTopic({
    requestingUserId,
    topicId,
    userId,
    select,
    since = "allTime",
  }: MessageArgs & {
    requestingUserId?: string;
    userId?: string;
    since?: "month" | "allTime";
  }) {
    if (!topicId || !requestingUserId) return [];

    let createdAt: { gte: Date } | undefined;

    let daysAgo: number | undefined;
    switch (since) {
      case "month":
        daysAgo = 30;
        break;
      case "allTime":
      default:
        daysAgo = undefined;
        break;
    }

    if (daysAgo !== undefined) {
      const from = new Date();
      from.setDate(from.getDate() - daysAgo);
      createdAt = {
        gte: from,
      };
    }

    const messages = await prismaClient.message.findMany({
      select,
      where: {
        topicId,
        userId,
        createdAt,
      },
      take: TOP_HIGHLIGHTS_LIMIT,
      orderBy: [
        {
          highlights: { _count: "desc" },
        },
        {
          createdAt: "desc",
        },
      ],
    });

    const filtered = messages.filter((m) => m.highlights.length > 0);

    return normalizeMessages(filtered);
  },

  async getMediaMessagesForTopic({
    requestingUserId,
    topicId,
    select,
  }: MessageArgs & { requestingUserId?: string }) {
    if (!topicId || !requestingUserId) return [];

    const messages = await prismaClient.message.findMany({
      select,
      take: TOP_HIGHLIGHTS_LIMIT,
      where: {
        topicId,
        NOT: {
          mediaUrl: null,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return normalizeMessages(messages);
  },

  async getMostRecentTimestampsByTopic({ topicIds }: { topicIds: string[] }) {
    if (!topicIds.length) return [];

    return await prismaClient.$queryRaw<
      { topicId: string; createdAt: Date }[]
    >`
      SELECT "topicId", "createdAt" FROM (
        SELECT "topicId", "createdAt", ROW_NUMBER() OVER (PARTITION BY "topicId" ORDER BY "createdAt" DESC) as row_num
        FROM "messages"
        WHERE "topicId" IN (${Prisma.join(topicIds)})
      ) AS latest_messages
      WHERE row_num = 1;
    `;
  },
};
