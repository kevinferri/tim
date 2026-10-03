import { prismaClient } from "@/lib/prisma/client";
import type { CommandName } from "@tim/commands";
import type { MemberActivity } from "@/lib/profile-badges";

// Everything for one member's profile, scoped to the circle. Each query starts from that member's
// own messages or highlights (indexed by userId), so cost tracks their activity, not the circle's.
export async function getMemberStats({
  circleId,
  userId,
}: {
  circleId: string;
  userId: string;
}): Promise<MemberActivity> {
  const [
    [activity],
    [received],
    [{ given }],
    [{ repliesReceived }],
    commandRows,
    recentSelfHighlights,
    dayRows,
    topicsCreated,
  ] = await Promise.all([
    prismaClient.$queryRaw<
      {
        messages: number;
        repliesGiven: number;
        lastMessageAt: Date | null;
        activeDaysTotal: number;
      }[]
    >`
      SELECT
        COUNT(*)::int AS messages,
        (COUNT(*) FILTER (WHERE parent."userId" <> m."userId"))::int AS "repliesGiven",
        MAX(m."createdAt") AS "lastMessageAt",
        COUNT(DISTINCT m."createdAt"::date)::int AS "activeDaysTotal"
      FROM messages m
      JOIN topics t ON t.id = m."topicId"
      LEFT JOIN messages parent ON parent.id = m."replyToId"
      WHERE m."userId" = ${userId} AND t."circleId" = ${circleId}
    `,
    prismaClient.$queryRaw<{ total: number; top: number }[]>`
      SELECT COALESCE(SUM(n), 0)::int AS total, COALESCE(MAX(n), 0)::int AS top
      FROM (
        SELECT COUNT(*) AS n
        FROM messages m
        JOIN topics t ON t.id = m."topicId"
        JOIN highlights h ON h."messageId" = m.id
        WHERE m."userId" = ${userId} AND t."circleId" = ${circleId}
          AND h."userId" <> ${userId}
        GROUP BY m.id
      ) per_message
    `,
    prismaClient.$queryRaw<{ given: number }[]>`
      SELECT COUNT(*)::int AS given
      FROM highlights h
      JOIN messages m ON m.id = h."messageId"
      JOIN topics t ON t.id = m."topicId"
      WHERE h."userId" = ${userId} AND m."userId" <> ${userId}
        AND t."circleId" = ${circleId}
    `,
    prismaClient.$queryRaw<{ repliesReceived: number }[]>`
      SELECT COUNT(*)::int AS "repliesReceived"
      FROM messages parent
      JOIN topics t ON t.id = parent."topicId"
      JOIN messages reply ON reply."replyToId" = parent.id
      WHERE parent."userId" = ${userId} AND t."circleId" = ${circleId}
        AND reply."userId" <> ${userId}
    `,
    prismaClient.$queryRaw<{ command: CommandName; n: number }[]>`
      SELECT m.command, COUNT(*)::int AS n
      FROM messages m
      JOIN topics t ON t.id = m."topicId"
      WHERE m."userId" = ${userId} AND m.command IS NOT NULL
        AND t."circleId" = ${circleId}
      GROUP BY m.command
    `,
    prismaClient.highlight.count({
      where: {
        userId,
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        message: { userId, topic: { circleId } },
      },
    }),
    // Enough history for the longest streak tier; createdAt is tz-less UTC.
    prismaClient.$queryRaw<{ day: string }[]>`
      SELECT DISTINCT to_char(m."createdAt"::date, 'YYYY-MM-DD') AS day
      FROM messages m
      JOIN topics t ON t.id = m."topicId"
      WHERE m."userId" = ${userId}
        AND t."circleId" = ${circleId}
        AND m."createdAt" > (now() AT TIME ZONE 'UTC') - interval '60 days'
      ORDER BY day DESC
    `,
    prismaClient.topic.count({ where: { circleId, userId } }),
  ]);

  return {
    ...activity,
    highlightsReceived: received.total,
    highlightsGiven: given,
    topMessageHighlights: received.top,
    repliesReceived,
    commandCounts: Object.fromEntries(commandRows.map((r) => [r.command, r.n])),
    recentSelfHighlights,
    recentActiveDays: dayRows.map((r) => r.day),
    topicsCreated,
  };
}
