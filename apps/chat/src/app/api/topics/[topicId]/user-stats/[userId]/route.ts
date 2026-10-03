import { badRequest, unauthorized, notFound } from "@/app/api/error-responses";
import { getLoggedInUserId } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";
import { prismaClient } from "@/lib/prisma/client";
import { DEFAULT_MESSAGE_SELECT } from "@/lib/prisma/message-model";
import { MessageData } from "@/components/topics/message";
import {
  computeGivingTag,
  computeHighlightScore,
  HighlightScore,
} from "@/lib/highlight-score";
import { computeProfileBadges, ProfileBadge } from "@/lib/profile-badges";
import { getMemberStats } from "@/lib/prisma/badge-stats";

export type UserStatsForTopicResponse = {
  topicName: string;
  circleName: string;
  // Within this circle; null if they haven't posted there.
  highlightScore: HighlightScore | null;
  // Score rank, giving tag and performance badges within this circle, in display order.
  badges: ProfileBadge[];
  messagesSent: number;
  highlightsGiven: number;
  highlightsReceived: number;
  topHighlights: Array<MessageData>;
  repliesReceived: number;
  repliesGiven: number;
  activeDays: number;
  mentionsReceived: number;
  mentionsSent: number;
};

type Route = {
  params: Promise<{
    topicId: string;
    userId: string;
  }>;
};

export async function GET(req: NextRequest, { params }: Route) {
  const loggedInUserId = await getLoggedInUserId();
  if (!loggedInUserId) return unauthorized;

  const { topicId, userId } = await params;

  try {
    const timings: string[] = [];
    // Server-Timing entries per query group, visible in DevTools' Network > Timing tab.
    const timed = async <T>(label: string, run: () => Promise<T>) => {
      const start = performance.now();
      const result = await run();
      timings.push(`${label};dur=${(performance.now() - start).toFixed(1)}`);
      return result;
    };

    const topic = await timed("topic", () =>
      prismaClient.topic.getNameWithMemberIds({ topicId }),
    );

    if (!topic) return badRequest;
    if (!topic.memberIds.includes(loggedInUserId)) return notFound;
    if (!topic.memberIds.includes(userId)) return notFound;

    const [topHighlights, activity, mentionsReceived, mentionsSent] =
      await Promise.all([
        timed("highlights", () =>
          prismaClient.message.getTopHighlightedMessagesForTopic({
            requestingUserId: loggedInUserId,
            topicId,
            userId,
            select: DEFAULT_MESSAGE_SELECT,
          }),
        ),
        timed("member", () =>
          getMemberStats({ circleId: topic.circleId, userId }),
        ),
        timed("mentions-in", () =>
          prismaClient.notification.countMentionsReceivedByUser({
            userId,
            circleId: topic.circleId,
          }),
        ),
        timed("mentions-out", () =>
          prismaClient.notification.countMentionsSentByUser({
            userId,
            circleId: topic.circleId,
          }),
        ),
      ]);
    const counts = {
      messages: activity.messages,
      received: activity.highlightsReceived,
      given: activity.highlightsGiven,
    };
    const highlightScore = computeHighlightScore(counts);

    // Everything is scoped to this circle: the viewer only shares this circle with them.
    const stats = {
      messages: activity.messages,
      activeDays: activity.activeDaysTotal,
      highlightsReceived: activity.highlightsReceived,
      highlightsGiven: activity.highlightsGiven,
      repliesReceived: activity.repliesReceived,
      repliesGiven: activity.repliesGiven,
      mentionsReceived,
      mentionsSent,
    };

    return NextResponse.json(
      {
        topicName: topic.name,
        circleName: topic.circleName,
        highlightScore,
        badges: computeProfileBadges({
          userId,
          circleName: topic.circleName,
          circleCreatorId: topic.circleCreatorId,
          score: highlightScore,
          givingTag: computeGivingTag(counts),
          activity,
          stats,
          now: new Date(),
        }),
        messagesSent: stats.messages,
        highlightsGiven: stats.highlightsGiven,
        highlightsReceived: stats.highlightsReceived,
        topHighlights,
        repliesReceived: stats.repliesReceived,
        repliesGiven: stats.repliesGiven,
        activeDays: stats.activeDays,
        mentionsReceived,
        mentionsSent,
      } as unknown as UserStatsForTopicResponse,
      { status: 200, headers: { "Server-Timing": timings.join(", ") } },
    );
  } catch (e) {
    return badRequest;
  }
}
