import { badRequest, notFound, unauthorized } from "@/app/api/error-responses";
import { getLoggedInUserId } from "@/lib/session";
import { prismaClient } from "@/lib/prisma/client";
import { NextResponse } from "next/server";
import { DEFAULT_MESSAGE_SELECT } from "@/lib/prisma/message-model";

export async function GET(
  req: Request,
  route: { params: { topicId: string } }
) {
  const userId = await getLoggedInUserId();
  const topicId = route.params.topicId;
  const url = new URL(req.url);
  const before = url.searchParams.get("before") ?? undefined;

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

    const messages = await prismaClient.message.getMessagesForTopic({
      topicId,
      before,
      select: DEFAULT_MESSAGE_SELECT,
    });

    return NextResponse.json(messages, { status: 200 });
  } catch (e) {
    return badRequest;
  }
}
