import { badRequest, notFound, unauthorized } from "@/app/api/error-responses";
import { getLoggedInUserId } from "@/lib/session";
import { prismaClient } from "@/lib/prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_MESSAGE_SELECT } from "@/lib/prisma/message-model";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ topicId: string }> },
) {
  const userId = await getLoggedInUserId();
  const { topicId } = await params;
  const url = new URL(req.url);
  const before = url.searchParams.get("before") ?? undefined;

  if (!userId) return unauthorized;

  try {
    const isInTopic = await prismaClient.topic.isUserInTopic({
      userId,
      topicId,
    });

    if (!isInTopic) return notFound;

    const messages = await prismaClient.message.getMessagesForTopic({
      requestingUserId: userId,
      topicId,
      before,
      select: DEFAULT_MESSAGE_SELECT,
    });

    return NextResponse.json(messages, { status: 200 });
  } catch (e) {
    return badRequest;
  }
}
