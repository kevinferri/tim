import { badRequest, notFound, unauthorized } from "@/api/error-responses";
import { getLoggedInUserId } from "@/lib/session";
import { prismaClient } from "@/lib/prisma/client";
import { NextResponse } from "next/server";
import { DEFAULT_MESSAGE_SELECT } from "@/lib/prisma/message-model";

export async function GET(
  req: Request,
  route: { params: { topicId: string; userId: string } }
) {
  const userId = await getLoggedInUserId();
  const topicId = route.params.topicId;
  const url = new URL(req.url);
  const after = url.searchParams.get("after") ?? undefined;

  if (!userId) return unauthorized;

  try {
    const topicWithCircleMembers = await prismaClient.topic.findFirst({
      where: { id: topicId },
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

    const messages = await prismaClient.message.getMessagesForTopic({
      topicId,
      after,
      select: DEFAULT_MESSAGE_SELECT,
    });

    return NextResponse.json(messages, { status: 200 });
  } catch (e) {
    return badRequest;
  }
}
