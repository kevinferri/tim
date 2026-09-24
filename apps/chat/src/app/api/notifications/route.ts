import { badRequest, unauthorized } from "@/app/api/error-responses";
import { getLoggedInUserId } from "@/lib/session";
import { prismaClient } from "@/lib/prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const userId = await getLoggedInUserId();

  if (!userId) return unauthorized;

  const url = new URL(req.url);
  const before = url.searchParams.get("before") ?? undefined;

  try {
    const notifications = await prismaClient.notification.getForUser({
      userId,
      before,
    });

    return NextResponse.json(notifications, { status: 200 });
  } catch (e) {
    return badRequest;
  }
}
