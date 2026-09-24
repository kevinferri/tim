import { badRequest, unauthorized } from "@/app/api/error-responses";
import { getLoggedInUserId } from "@/lib/session";
import { prismaClient } from "@/lib/prisma/client";
import { NextResponse } from "next/server";

export async function GET() {
  const userId = await getLoggedInUserId();

  if (!userId) return unauthorized;

  try {
    const count = await prismaClient.notification.getUnreadCount({ userId });

    return NextResponse.json({ count }, { status: 200 });
  } catch (e) {
    return badRequest;
  }
}
