import { badRequest, notFound, unauthorized } from "@/app/api/error-responses";
import { getLoggedInUserId } from "@/lib/session";
import { prismaClient } from "@/lib/prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_MESSAGE_SELECT } from "@/lib/prisma/message-model";

type Route = {
  params: Promise<{ topicId: string; threadRootId: string }>;
};

export async function GET(_req: NextRequest, { params }: Route) {
  const userId = await getLoggedInUserId();
  const { topicId, threadRootId } = await params;

  if (!userId) return unauthorized;
  if (!topicId || !threadRootId) return badRequest;

  try {
    const isInTopic = await prismaClient.topic.isUserInTopic({
      userId,
      topicId,
    });

    if (!isInTopic) return notFound;

    const messages = await prismaClient.message.getThreadMessages({
      topicId,
      threadRootId,
      select: DEFAULT_MESSAGE_SELECT,
    });

    // Must be a real root in this topic -- a bad/cross-topic id returns nothing,
    // and a *reply* id would otherwise return a degenerate one-message thread.
    const root = messages.find((m) => m.id === threadRootId);
    if (!root || root.threadRootId) {
      return notFound;
    }

    return NextResponse.json(messages, { status: 200 });
  } catch {
    return badRequest;
  }
}
