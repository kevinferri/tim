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
import { getCircleStats, getMemberActivity } from "@/lib/prisma/badge-stats";

export type UserStatsForTopicResponse = {
  topicName: string;
  circleName: string;
  // Within this circle; null if they haven't posted or nobody's been highlighted yet.
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
    const topic = await prismaClient.topic.getNameWithMemberIds({ topicId });

    if (!topic) return badRequest;
    if (!topic.memberIds.includes(loggedInUserId)) return notFound;
    if (!topic.memberIds.includes(userId)) return notFound;

    const where = { userId };

    const queries = [
      prismaClient.message.getTopHighlightedMessagesForTopic({
        requestingUserId: loggedInUserId,
        topicId: topicId,
        select: DEFAULT_MESSAGE_SELECT,
        ...where,
      }),
      prismaClient.message.count({ where }),
      prismaClient.highlight.countGivenByUser({ userId }),
      prismaClient.highlight.countReceivedByUser({ userId }),
      prismaClient.message.countRepliesReceivedByUser({ userId }),
      prismaClient.message.countRepliesGivenByUser({ userId }),
      prismaClient.message.countActiveDaysByUser({ userId }),
      prismaClient.notification.countMentionsReceivedByUser({ userId }),
      prismaClient.notification.countMentionsSentByUser({ userId }),
      getCircleStats(topic.circleId),
    ];

    const [
      topHighlights,
      messagesSent,
      highlightsGiven,
      highlightsReceived,
      repliesReceived,
      repliesGiven,
      activeDays,
      mentionsReceived,
      mentionsSent,
      circleStatsResult,
    ] = await Promise.all(queries);
    const circleStats = circleStatsResult as Awaited<
      ReturnType<typeof getCircleStats>
    >;
    const member = circleStats.members.find((m) => m.userId === userId);
    const highlightScore = computeHighlightScore(circleStats.members, userId);
    const activity = await getMemberActivity({
      circleId: topic.circleId,
      userId,
      highlightsReceived: member?.highlights ?? 0,
    });

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
          givingTag: computeGivingTag(circleStats.members, userId),
          circle: circleStats,
          activity,
          now: new Date(),
        }),
        messagesSent,
        highlightsGiven,
        highlightsReceived,
        topHighlights,
        repliesReceived,
        repliesGiven,
        activeDays,
        mentionsReceived,
        mentionsSent,
      } as unknown as UserStatsForTopicResponse,
      { status: 200 },
    );
  } catch (e) {
    return badRequest;
  }
}
