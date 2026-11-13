import { NextRequest, NextResponse } from "next/server";
import { prismaClient } from "@/lib/prisma/client";
import { DEFAULT_MESSAGE_SELECT } from "@/lib/prisma/message-model";
import { ApiError, apiRoute, requireUserId } from "@/lib/api";

type Route = {
  params: Promise<{ topicId: string; threadRootId: string }>;
};

export const GET = apiRoute(async (_req: NextRequest, { params }: Route) => {
  const userId = await requireUserId();
  const { topicId, threadRootId } = await params;
  if (!topicId || !threadRootId) throw new ApiError(400);

  const isInTopic = await prismaClient.topic.isUserInTopic({
    userId,
    topicId,
  });
  if (!isInTopic) throw new ApiError(404);

  const messages = await prismaClient.message.getThreadMessages({
    topicId,
    threadRootId,
    select: DEFAULT_MESSAGE_SELECT,
  });

  // Must be a real root in this topic -- a bad/cross-topic id returns nothing,
  // and a *reply* id would otherwise return a degenerate one-message thread.
  const root = messages.find((m) => m.id === threadRootId);
  if (!root || root.threadRootId) throw new ApiError(404);

  return NextResponse.json(messages, { status: 200 });
});
