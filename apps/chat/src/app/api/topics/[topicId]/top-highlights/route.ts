import { badRequest, notFound, unauthorized } from "@/app/api/error-responses";
import { getLoggedInUserId } from "@/lib/session";
import { prismaClient } from "@/lib/prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_MESSAGE_SELECT } from "@/lib/prisma/message-model";

type Route = {
  params: Promise<{ topicId: string }>;
};

export async function GET(req: NextRequest, { params }: Route) {
  const userId = await getLoggedInUserId();
  const { topicId } = await params;

  if (!userId) return unauthorized;

  try {
    const topic = await prismaClient.topic.findUnique({
      where: { id: topicId },
      select: {
        id: true,
        parentCircle: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!topic) return notFound;

    const isInCircle = await prismaClient.circle.isUserInCirle({
      userId,
      circleId: topic.parentCircle.id,
    });

    if (!isInCircle) return notFound;

    const highlights =
      await prismaClient.message.getTopHighlightedMessagesForTopic({
        topicId,
        select: DEFAULT_MESSAGE_SELECT,
        since: "month", // TODO when dynamic filtering is out, allow this to be passed in via query param
      });

    return NextResponse.json(highlights, { status: 200 });
  } catch (e) {
    return badRequest;
  }
}
