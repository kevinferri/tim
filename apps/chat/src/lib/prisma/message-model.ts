import { Prisma } from "@prisma/client";
import { prismaClient } from "@/lib/prisma/client";
import { decrypt, DecryptionError } from "@/lib/decryption";

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
  replyToId: true,
  threadRootId: true,
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
  replyTo: {
    select: {
      id: true,
      text: true,
      mediaUrl: true,
      createdAt: true,
      sentBy: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
};

type ReplyToShape =
  | {
      id: string;
      text?: string | null;
    }
  | null
  | undefined;

export const normalizeMessages = <
  T extends {
    id: string;
    text?: string | null;
    replyTo?: ReplyToShape;
  },
>(
  messages: T[],
) =>
  messages.map((message) => ({
    ...message,
    text: getReadableMessage(message.text, message.id),
    replyTo: message.replyTo
      ? {
          ...message.replyTo,
          text: getReadableMessage(message.replyTo.text, message.replyTo.id),
        }
      : message.replyTo,
  }));

// One undecryptable row shouldn't take down the whole list it's part of -- degrade that single message instead of throwing out of the .map().
function getReadableMessage(
  text: string | null | undefined,
  messageId: string,
) {
  if (!text) return undefined;

  try {
    return decrypt(text, messageId);
  } catch (err) {
    if (err instanceof DecryptionError) {
      console.error(`[message ${messageId}] failed to decrypt:`, err);
      return "";
    }
    throw err;
  }
}

// `threadRootId` is required (not optional) so a caller whose `select` omits
// it fails to typecheck rather than silently reporting every count as 0.
async function attachReplyCounts<
  T extends { id: string; threadRootId: string | null },
>(messages: T[]): Promise<(T & { replyCount: number })[]> {
  if (messages.length === 0) {
    return messages.map((m) => ({ ...m, replyCount: 0 }));
  }

  // Counts are keyed by thread root. A visible root uses its own id; a
  // visible reply uses its threadRootId.
  const rootIds = Array.from(
    new Set(
      messages.map((m) => m.threadRootId ?? m.id).filter(Boolean) as string[],
    ),
  );

  const groups = await prismaClient.message.groupBy({
    by: ["threadRootId"],
    where: { threadRootId: { in: rootIds } },
    _count: { _all: true },
  });

  const counts = new Map(
    groups
      .filter((g) => g.threadRootId)
      .map((g) => [g.threadRootId!, g._count._all]),
  );

  return messages.map((m) => ({
    ...m,
    replyCount: counts.get(m.threadRootId ?? m.id) ?? 0,
  }));
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

    const chronological = [...messages].reverse();
    const withCounts = await attachReplyCounts(chronological);
    return normalizeMessages(withCounts);
  },

  async getThreadMessages({
    topicId,
    threadRootId,
    select,
  }: {
    topicId: string;
    threadRootId: string;
    select: Prisma.MessageSelect;
  }) {
    // Root first (the message being discussed), then replies oldest -> newest.
    // `id` breaks createdAt ties so the order is stable across requests.
    const messages = await prismaClient.message.findMany({
      select,
      where: {
        topicId,
        OR: [{ id: threadRootId }, { threadRootId }],
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });

    const root = messages.find((m) => m.id === threadRootId);
    const replies = messages.filter((m) => m.id !== threadRootId);
    const ordered = root ? [root, ...replies] : replies;

    return normalizeMessages(ordered);
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
};
