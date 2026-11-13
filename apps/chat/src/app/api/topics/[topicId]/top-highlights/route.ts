import { NextRequest, NextResponse } from "next/server";
import { prismaClient } from "@/lib/prisma/client";
import { DEFAULT_MESSAGE_SELECT } from "@/lib/prisma/message-model";
import { ApiError, apiRoute, requireUserId } from "@/lib/api";

type Route = {
  params: Promise<{ topicId: string }>;
};

export const GET = apiRoute(async (req: NextRequest, { params }: Route) => {
  const userId = await requireUserId();
  const { topicId } = await params;

  const sinceParam = req.nextUrl.searchParams.get("since");
  const since = sinceParam ? new Date(sinceParam) : undefined;
  if (since && Number.isNaN(since.getTime())) throw new ApiError(400);

  const isInTopic = await prismaClient.topic.isUserInTopic({
    userId,
    topicId,
  });
  if (!isInTopic) throw new ApiError(404);

  const highlights =
    await prismaClient.message.getTopHighlightedMessagesForTopic({
      requestingUserId: userId,
      topicId,
      select: DEFAULT_MESSAGE_SELECT,
      since,
    });

  return NextResponse.json(highlights, { status: 200 });
});
