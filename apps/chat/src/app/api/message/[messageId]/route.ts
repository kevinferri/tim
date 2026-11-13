import { NextRequest, NextResponse } from "next/server";
import { prismaClient } from "@/lib/prisma/client";
import {
  DEFAULT_MESSAGE_SELECT,
  normalizeMessages,
} from "@/lib/prisma/message-model";
import { ApiError, apiRoute, requireUserId } from "@/lib/api";

type Route = { params: Promise<{ messageId: string }> };

export const GET = apiRoute(async (_req: NextRequest, { params }: Route) => {
  const userId = await requireUserId();
  const { messageId } = await params;
  if (!messageId) throw new ApiError(400);

  const message = await prismaClient.message.getById({
    messageId,
    select: {
      ...DEFAULT_MESSAGE_SELECT,
      topic: {
        select: {
          id: true,
        },
      },
    },
  });
  if (!message) throw new ApiError(404);

  const isInTopic = await prismaClient.topic.isUserInTopic({
    userId,
    topicId: message.topic.id,
  });
  if (!isInTopic) throw new ApiError(404);

  return NextResponse.json(normalizeMessages([message])[0], { status: 200 });
});
