import { prismaClient } from "@/lib/prisma/client";
import {
  DEFAULT_MESSAGE_SELECT,
  normalizeMessages,
} from "@/lib/prisma/message-model";
import { badRequest, notFound, unauthorized } from "../../error-responses";
import { getLoggedInUserId } from "@/lib/session";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  route: { params: { messageId: string } }
) {
  try {
    const userId = await getLoggedInUserId();
    const id = route.params.messageId;

    if (!userId) return unauthorized;
    if (!id) return badRequest;

    const message = await prismaClient.message.findUnique({
      where: {
        id,
      },
      select: {
        ...DEFAULT_MESSAGE_SELECT,
        topic: {
          select: {
            id: true,
            parentCircle: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (!message) return notFound;

    const isInCircle = await prismaClient.circle.isUserInCirle({
      userId,
      circleId: message.topic.parentCircle.id,
    });

    if (!isInCircle) return notFound;

    return NextResponse.json(normalizeMessages([message])[0], { status: 200 });
  } catch (e) {
    return badRequest;
  }
}
