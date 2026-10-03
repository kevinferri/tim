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

// Circle-wide stats scan the whole circle's messages and highlights, which is slow on big circles,
// so serve them stale-while-revalidate: fresh for 5 min, then served instantly while one refresh runs.
const CIRCLE_STATS_FRESH_MS = 5 * 60_000;
const CIRCLE_STATS_MAX_STALE_MS = 60 * 60_000;
const circleStatsCache = new Map<
  string,
  { loadedAt: number; stats: Promise<CircleStats>; refreshing: boolean }
>();

export function getCircleStats(circleId: string): Promise<CircleStats> {
  const cached = circleStatsCache.get(circleId);
  const age = cached ? Date.now() - cached.loadedAt : Infinity;

  if (cached && age < CIRCLE_STATS_MAX_STALE_MS) {
    if (age > CIRCLE_STATS_FRESH_MS && !cached.refreshing) {
      cached.refreshing = true;
      loadCircleStats(circleId)
        .then((stats) =>
          circleStatsCache.set(circleId, {
            loadedAt: Date.now(),
            stats: Promise.resolve(stats),
            refreshing: false,
          }),
        )
        // Keep serving the stale copy; the next request retries.
        .catch(() => (cached.refreshing = false));
    }
    return cached.stats;
  }

  const stats = loadCircleStats(circleId);
  circleStatsCache.set(circleId, {
    loadedAt: Date.now(),
    stats,
    refreshing: false,
  });
  // Don't cache a failure.
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

// highlightsReceived comes from getCircleStats, so callers merge it in; keeping it out lets both run in parallel.
export async function getMemberActivity({
  circleId,
  userId,
}: {
  circleId: string;
  userId: string;
}): Promise<Omit<MemberActivity, "highlightsReceived">> {
  const [[activity], recentSelfHighlights, dayRows, topicsCreated] =
    await Promise.all([
      // createdAt is tz-less UTC, so compare against now() in UTC.
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
      WHERE t."circleId" = ${circleId} AND m."userId" = ${userId}
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
      WHERE t."circleId" = ${circleId}
        AND m."userId" = ${userId}
        AND m."createdAt" > (now() AT TIME ZONE 'UTC') - interval '60 days'
      ORDER BY day DESC
    `,
      prismaClient.topic.count({ where: { circleId, userId } }),
    ]);

  return {
    ...activity,
    recentSelfHighlights,
    recentActiveDays: dayRows.map((r) => r.day),
    topicsCreated,
  };
}
