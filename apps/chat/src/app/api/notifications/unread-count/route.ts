import { NextResponse } from "next/server";
import { prismaClient } from "@/lib/prisma/client";
import { apiRoute, requireUserId } from "@/lib/api";

export const GET = apiRoute(async () => {
  const userId = await requireUserId();
  const count = await prismaClient.notification.getUnreadCount({ userId });

  return NextResponse.json({ count }, { status: 200 });
});
