import { badRequest, unauthorized, notFound } from "@/app/api/error-responses";
import { getLoggedInUserId } from "@/lib/session";
import { NextResponse } from "next/server";
import { prismaClient } from "@/lib/prisma/client";
import { DEFAULT_MESSAGE_SELECT } from "@/lib/prisma/message-model";
import { MessageProps } from "@/components/topics/message";

export type UserStatsForTopicResponse = {
  topicName: string;
  highlightScore: number;
  messagesSent: number;
  highlightsGiven: number;
  highlightsRecieved: number;
  topHighlights: Array<MessageProps>;
};

export async function GET(
  req: Request,
  route: { params: { topicId: string; userId: string } }
) {
  const userId = await getLoggedInUserId();
  if (!userId) return unauthorized;

  try {
    const topicWithCircleMembers = await prismaClient.topic.findFirst({
      where: { id: route.params.topicId },
      select: {
        name: true,
        parentCircle: {
          select: {
            members: {
              select: { id: true },
            },
          },
        },
      },
    });

    if (!topicWithCircleMembers) return badRequest;

    const memberIds = topicWithCircleMembers.parentCircle.members.map(
      ({ id }) => id
    );
    if (!memberIds.includes(userId)) return notFound;
    if (!memberIds.includes(route.params.userId)) return notFound;

    const where = {
      userId: route.params.userId,
    };

    const queries = [
      // Top highlights for user
      prismaClient.message.getTopHighlightedMessagesForTopic({
        topicId: route.params.topicId,
        select: DEFAULT_MESSAGE_SELECT,
        ...where,
      }),

      // Total messages sent
      prismaClient.message.count({ where }),

      // Total highlights given
      prismaClient.highlight.count({ where }),

      // Total highlights recieved
      prismaClient.highlight.count({
        where: { message: where },
      }),
    ];

    const [topHighlights, messagesSent, highlightsGiven, highlightsRecieved] =
      await Promise.all(queries);

    const highlightScore = Math.round(
      (Number(highlightsRecieved) / Number(messagesSent)) * 100
    );

    return NextResponse.json(
      {
        topicName: topicWithCircleMembers.name,
        highlightScore: highlightScore || 0,
        messagesSent,
        highlightsGiven,
        highlightsRecieved,
        topHighlights,
      } as UserStatsForTopicResponse,
      { status: 200 }
    );
  } catch (e) {
    return badRequest;
  }
}
