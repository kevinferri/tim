import { prismaClient } from "@/lib/prisma/client";
import type { MemberHighlightCounts } from "@/lib/highlight-score";

export const highlightModel = {
  // Per member active in the circle: messages sent, and highlights received from / given to others.
  async countsByMemberInCircle({
    circleId,
  }: {
    circleId: string;
  }): Promise<MemberHighlightCounts[]> {
    return await prismaClient.$queryRaw<MemberHighlightCounts[]>`
      WITH circle_messages AS (
        SELECT m.id, m."userId"
        FROM messages m
        JOIN topics t ON t.id = m."topicId"
        WHERE t."circleId" = ${circleId}
      ),
      others_highlights AS (
        SELECT h."userId" AS giver, cm."userId" AS author
        FROM highlights h
        JOIN circle_messages cm ON cm.id = h."messageId"
        WHERE h."userId" <> cm."userId"
      ),
      posted AS (
        SELECT "userId", COUNT(*)::int AS n FROM circle_messages GROUP BY "userId"
      ),
      received AS (
        SELECT author AS "userId", COUNT(*)::int AS n FROM others_highlights GROUP BY author
      ),
      given AS (
        SELECT giver AS "userId", COUNT(*)::int AS n FROM others_highlights GROUP BY giver
      )
      SELECT
        members."userId",
        COALESCE(posted.n, 0) AS messages,
        COALESCE(received.n, 0) AS highlights,
        COALESCE(given.n, 0) AS given
      FROM (SELECT "userId" FROM posted UNION SELECT "userId" FROM given) members
      LEFT JOIN posted ON posted."userId" = members."userId"
      LEFT JOIN received ON received."userId" = members."userId"
      LEFT JOIN given ON given."userId" = members."userId"
    `;
  },

  async countGivenByUser({ userId }: { userId?: string }) {
    if (!userId) return 0;

    // Highlights on your own messages aren't "given".
    return await prismaClient.highlight.count({
      where: { userId, message: { userId: { not: userId } } },
    });
  },

  async countReceivedByUser({ userId }: { userId?: string }) {
    if (!userId) return 0;

    // Self-highlights don't count as received.
    return await prismaClient.highlight.count({
      where: { message: { userId }, userId: { not: userId } },
    });
  },
};
