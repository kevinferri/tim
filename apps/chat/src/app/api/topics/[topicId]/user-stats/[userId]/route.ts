import { badRequest, unauthorized, notFound } from "@/app/api/error-responses";
import { getLoggedInUserId } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";
import { prismaClient } from "@/lib/prisma/client";
import { DEFAULT_MESSAGE_SELECT } from "@/lib/prisma/message-model";
import { MessageData } from "@/components/topics/message";

export type UserStatsForTopicResponse = {
  topicName: string;
  highlightScore: number;
  messagesSent: number;
  highlightsGiven: number;
  highlightsRecieved: number;
  topHighlights: Array<MessageData>;
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
    ];

    const [topHighlights, messagesSent, highlightsGiven, highlightsRecieved] =
      await Promise.all(queries);

    const highlightScore = Math.round(
      (Number(highlightsRecieved) / Number(messagesSent)) * 100,
    );

    return NextResponse.json(
      {
        topicName: topic.name,
        highlightScore: highlightScore || 0,
        messagesSent,
        highlightsGiven,
        highlightsRecieved,
        topHighlights,
      } as unknown as UserStatsForTopicResponse,
      { status: 200 },
    );
  } catch (e) {
    return badRequest;
  }
}
