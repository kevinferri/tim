import { NextRequest, NextResponse } from "next/server";
import { prismaClient } from "@/lib/prisma/client";
import { apiRoute, requireUserId } from "@/lib/api";

export const GET = apiRoute(async (req: NextRequest) => {
  const userId = await requireUserId();
  const before = new URL(req.url).searchParams.get("before") ?? undefined;

  const notifications = await prismaClient.notification.getForUser({
    userId,
    before,
  });

  return NextResponse.json(notifications, { status: 200 });
});
