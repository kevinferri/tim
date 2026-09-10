import { prismaClient } from "@/lib/prisma/client";
import {
  DEFAULT_MESSAGE_SELECT,
  normalizeMessages,
} from "@/lib/prisma/message-model";
import { badRequest, notFound, unauthorized } from "../../error-responses";
import { getLoggedInUserId } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

type Route = { params: Promise<{ messageId: string }> };

export async function GET(req: NextRequest, { params }: Route) {
  try {
    const userId = await getLoggedInUserId();
    const { messageId } = await params;

    if (!userId) return unauthorized;
    if (!messageId) return badRequest;

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

    if (!message) return notFound;

    const isInTopic = await prismaClient.topic.isUserInTopic({
      userId,
      topicId: message.topic.id,
    });

    if (!isInTopic) return notFound;

    return NextResponse.json(normalizeMessages([message])[0], { status: 200 });
  } catch (e) {
    return badRequest;
  }
}
