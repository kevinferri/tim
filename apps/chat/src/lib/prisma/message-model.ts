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

type ReplyToShape = {
  id: string;
  text?: string | null;
  createdAt?: Date | string | null;
} | null | undefined;

export const normalizeMessages = <
  T extends {
    id: string;
    text?: string | null;
    createdAt?: Date | string | null;
    replyTo?: ReplyToShape;
    replyToId?: string | null;
    threadRootId?: string | null;
  },
>(
  messages: T[],
) =>
  messages.map((message) => {
    const replyTo = message.replyTo
      ? {
          ...message.replyTo,
          text: getReadableMessage(message.replyTo.text, message.replyTo.id),
        }
      : message.replyTo;

    // Drop "time-travel" quotes: a reply must not predate its parent. Bad
    // local/seed data can end up with that shape and the UI looks absurd.
    const parentCreatedAt = replyTo?.createdAt
      ? new Date(replyTo.createdAt).getTime()
      : NaN;
    const childCreatedAt = message.createdAt
      ? new Date(message.createdAt).getTime()
      : NaN;
    const replyIsValid =
      !replyTo ||
      Number.isNaN(parentCreatedAt) ||
      Number.isNaN(childCreatedAt) ||
      childCreatedAt >= parentCreatedAt;

    return {
      ...message,
      text: getReadableMessage(message.text, message.id),
      replyTo: replyIsValid ? replyTo : null,
      replyToId: replyIsValid ? message.replyToId : null,
      threadRootId: replyIsValid
        ? message.threadRootId
        : message.threadRootId === message.replyToId
          ? null
          : message.threadRootId,
    };
  });

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

async function attachReplyCounts<
  T extends { id: string; threadRootId?: string | null },
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
    // Thread root first (the message being discussed), then replies oldest →
    // newest. createdAt ties break on ctid so rapid-fire order matches insert
    // order, not UUID lexicographic order.
    const orderedIds = await prismaClient.$queryRaw<{ id: string }[]>`
      SELECT id FROM messages
      WHERE "topicId" = ${topicId}
        AND (id = ${threadRootId} OR "threadRootId" = ${threadRootId})
      ORDER BY
        CASE WHEN id = ${threadRootId} THEN 0 ELSE 1 END,
        "createdAt" ASC,
        ctid ASC
    `;

    if (orderedIds.length === 0) return [];

    const messages = await prismaClient.message.findMany({
      select,
      where: { id: { in: orderedIds.map((row) => row.id) } },
    });

    const byId = new Map(messages.map((m) => [m.id, m]));
    const ordered = orderedIds
      .map(({ id }) => byId.get(id))
      .filter((m): m is NonNullable<typeof m> => Boolean(m));

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

  async getMostRecentTimestampsByTopic({ topicIds }: { topicIds: string[] }) {
    if (!topicIds.length) return [];

    return await prismaClient.$queryRaw<{ topicId: string; createdAt: Date }[]>`
      SELECT "topicId", "createdAt" FROM (
        SELECT "topicId", "createdAt", ROW_NUMBER() OVER (PARTITION BY "topicId" ORDER BY "createdAt" DESC) as row_num
        FROM "messages"
        WHERE "topicId" IN (${Prisma.join(topicIds)})
      ) AS latest_messages
      WHERE row_num = 1;
    `;
  },
};
