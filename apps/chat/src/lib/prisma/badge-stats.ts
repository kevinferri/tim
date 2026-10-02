import { prismaClient } from "@/lib/prisma/client";
import type { CommandName } from "@tim/commands";
import type { MemberHighlightCounts } from "@/lib/highlight-score";
import type {
  CircleBadgeAggregates,
  MemberActivity,
} from "@/lib/profile-badges";

export type CircleStats = CircleBadgeAggregates & {
  members: MemberHighlightCounts[];
};

// Circle-wide scans are shared by every profile opened in the circle, so cache them briefly.
const CIRCLE_STATS_TTL_MS = 60_000;
const circleStatsCache = new Map<
  string,
  { expiresAt: number; stats: Promise<CircleStats> }
>();

export function getCircleStats(circleId: string): Promise<CircleStats> {
  const cached = circleStatsCache.get(circleId);
  if (cached && cached.expiresAt > Date.now()) return cached.stats;

  const stats = loadCircleStats(circleId);
  circleStatsCache.set(circleId, {
    expiresAt: Date.now() + CIRCLE_STATS_TTL_MS,
    stats,
  });
  // Don't cache a failure for the whole TTL.
  stats.catch(() => circleStatsCache.delete(circleId));
  return stats;
}

async function loadCircleStats(circleId: string): Promise<CircleStats> {
  const [members, commandRows, replyRows, topMessageRows] = await Promise.all([
    prismaClient.highlight.countsByMemberInCircle({ circleId }),
    prismaClient.$queryRaw<
      { userId: string; command: CommandName; n: number }[]
    >`
        SELECT m."userId", m.command, COUNT(*)::int AS n
        FROM messages m
        JOIN topics t ON t.id = m."topicId"
        WHERE t."circleId" = ${circleId} AND m.command IS NOT NULL
        GROUP BY m."userId", m.command
      `,
    prismaClient.$queryRaw<{ userId: string; n: number }[]>`
        SELECT parent."userId", COUNT(*)::int AS n
        FROM messages reply
        JOIN messages parent ON parent.id = reply."replyToId"
        JOIN topics t ON t.id = parent."topicId"
        WHERE t."circleId" = ${circleId} AND reply."userId" <> parent."userId"
        GROUP BY parent."userId"
      `,
    prismaClient.$queryRaw<{ userId: string; n: number }[]>`
        SELECT per_message.author AS "userId", MAX(per_message.n)::int AS n
        FROM (
          SELECT m."userId" AS author, COUNT(*) AS n
          FROM highlights h
          JOIN messages m ON m.id = h."messageId"
          JOIN topics t ON t.id = m."topicId"
          WHERE t."circleId" = ${circleId} AND h."userId" <> m."userId"
          GROUP BY m.id, m."userId"
        ) per_message
        GROUP BY per_message.author
      `,
  ]);

  const commandCounts: CircleStats["commandCounts"] = {};
  for (const row of commandRows) {
    (commandCounts[row.userId] ??= {})[row.command] = row.n;
  }

  return {
    members,
    commandCounts,
    repliesReceived: Object.fromEntries(replyRows.map((r) => [r.userId, r.n])),
    topMessageHighlights: Object.fromEntries(
      topMessageRows.map((r) => [r.userId, r.n]),
    ),
    highlightsGiven: Object.fromEntries(
      members.map((m) => [m.userId, m.given]),
    ),
  };
}

export async function getMemberActivity({
  circleId,
  userId,
  highlightsReceived,
}: {
  circleId: string;
  userId: string;
  highlightsReceived: number;
}): Promise<MemberActivity> {
  const [
    [activity],
    [fan],
    recentSelfHighlights,
    user,
    dayRows,
    topicsCreated,
  ] = await Promise.all([
    // createdAt is tz-less UTC, so compare against now() in UTC.
    prismaClient.$queryRaw<
      {
        messages: number;
        repliesSent: number;
        repliesGiven: number;
        lastMessageAt: Date | null;
        activeDaysLast30: number;
        activeDaysTotal: number;
      }[]
    >`
      SELECT
        COUNT(*)::int AS messages,
        (COUNT(*) FILTER (WHERE m."replyToId" IS NOT NULL))::int AS "repliesSent",
        (COUNT(*) FILTER (WHERE parent."userId" <> m."userId"))::int AS "repliesGiven",
        MAX(m."createdAt") AS "lastMessageAt",
        (COUNT(DISTINCT m."createdAt"::date) FILTER (
          WHERE m."createdAt" > (now() AT TIME ZONE 'UTC') - interval '30 days'
        ))::int AS "activeDaysLast30",
        COUNT(DISTINCT m."createdAt"::date)::int AS "activeDaysTotal"
      FROM messages m
      JOIN topics t ON t.id = m."topicId"
      LEFT JOIN messages parent ON parent.id = m."replyToId"
      WHERE t."circleId" = ${circleId} AND m."userId" = ${userId}
    `,
    prismaClient.$queryRaw<{ name: string | null; highlights: number }[]>`
      SELECT u.name, COUNT(*)::int AS highlights
      FROM highlights h
      JOIN messages m ON m.id = h."messageId"
      JOIN topics t ON t.id = m."topicId"
      JOIN users u ON u.id = h."userId"
      WHERE t."circleId" = ${circleId}
        AND m."userId" = ${userId}
        AND h."userId" <> ${userId}
      GROUP BY u.id, u.name
      ORDER BY highlights DESC
      LIMIT 1
    `,
    prismaClient.highlight.count({
      where: {
        userId,
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        message: { userId, topic: { circleId } },
      },
    }),
    prismaClient.user.findUnique({
      where: { id: userId },
      select: { createdAt: true },
    }),
    // Enough history for the longest streak tier; createdAt is tz-less UTC.
    prismaClient.$queryRaw<{ day: string }[]>`
      SELECT DISTINCT to_char(m."createdAt"::date, 'YYYY-MM-DD') AS day
      FROM messages m
      JOIN topics t ON t.id = m."topicId"
      WHERE t."circleId" = ${circleId}
        AND m."userId" = ${userId}
        AND m."createdAt" > (now() AT TIME ZONE 'UTC') - interval '60 days'
      ORDER BY day DESC
    `,
    prismaClient.topic.count({ where: { circleId, userId } }),
  ]);

  return {
    ...activity,
    highlightsReceived,
    recentSelfHighlights,
    recentActiveDays: dayRows.map((r) => r.day),
    topicsCreated,
    joinedAt: user?.createdAt ?? new Date(0),
    biggestFan: fan?.name
      ? { name: fan.name, highlights: fan.highlights }
      : null,
  };
}
