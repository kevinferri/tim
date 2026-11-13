import { NextRequest, NextResponse } from "next/server";
import { prismaClient } from "@/lib/prisma/client";
import { DEFAULT_MESSAGE_SELECT } from "@/lib/prisma/message-model";
import { ApiError, apiRoute, requireUserId } from "@/lib/api";

type Route = { params: Promise<{ topicId: string }> };

export const GET = apiRoute(async (req: NextRequest, { params }: Route) => {
  const userId = await requireUserId();
  const { topicId } = await params;
  const before = new URL(req.url).searchParams.get("before") ?? undefined;

  const isInTopic = await prismaClient.topic.isUserInTopic({
    userId,
    topicId,
  });
  if (!isInTopic) throw new ApiError(404);

  const messages = await prismaClient.message.getMessagesForTopic({
    requestingUserId: userId,
    topicId,
    before,
    select: DEFAULT_MESSAGE_SELECT,
  });

  return NextResponse.json(messages, { status: 200 });
});
