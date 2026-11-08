import { NextResponse } from "next/server";
import { prismaClient } from "@/lib/prisma/client";
import {
  getEstGameDate,
  getEstHour,
  getSamePagePhase,
  isSamePageActiveDay,
} from "@/lib/same-page/est-day";
import {
  ensureTodayRound,
  revealRound,
} from "@/lib/same-page/same-page-model";
import type { SamePageAlertPayload } from "@tim/socket-types";

/**
 * Called by realtime-server's Same Page scheduler once a minute.
 * Auth: Bearer JWT_SECRET (shared between the two apps).
 * Returns socket alert targets; the realtime server emits them.
 */
export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  const expected = process.env.JWT_SECRET?.trim();
  const token = auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : null;
  if (!expected || !token || token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  if (!isSamePageActiveDay(now)) {
    return NextResponse.json({ alerts: [] as SamePageAlertPayload[] });
  }

  const hour = getEstHour(now);
  const gameDate = getEstGameDate(now);
  const phase = getSamePagePhase(now);
  const alerts: Array<SamePageAlertPayload & { userIds: string[] }> = [];

  const circles = await prismaClient.circle.findMany({
    select: {
      id: true,
      members: { select: { id: true } },
    },
  });

  for (const circle of circles) {
    const memberIds = circle.members.map((m) => m.id);
    if (memberIds.length === 0) continue;

    // Play window: ensure round + one-shot prompt ping (catches late starts).
    if (phase === "play") {
      const round = await ensureTodayRound(circle.id, now);
      if (round && !round.promptNotifiedAt) {
        await prismaClient.samePageRound.update({
          where: { id: round.id },
          data: { promptNotifiedAt: now },
        });
        alerts.push({
          circleId: circle.id,
          kind: "prompt",
          gameDate,
          prompt: round.prompt,
          userIds: memberIds,
        });
      }
    }

    // From 2pm until reveal: one-shot nudge for anyone still unanswered.
    if (hour >= 14 && phase === "play") {
      const round = await prismaClient.samePageRound.findUnique({
        where: {
          circleId_gameDate: { circleId: circle.id, gameDate },
        },
        include: { answers: { select: { userId: true } } },
      });
      if (round && !round.nudgeNotifiedAt) {
        await prismaClient.samePageRound.update({
          where: { id: round.id },
          data: { nudgeNotifiedAt: now },
        });
        const answered = new Set(round.answers.map((a) => a.userId));
        const pending = memberIds.filter((id) => !answered.has(id));
        if (pending.length > 0) {
          alerts.push({
            circleId: circle.id,
            kind: "nudge",
            gameDate,
            prompt: round.prompt,
            userIds: pending,
          });
        }
      }
    }

    // 4pm+: reveal once + notify everyone.
    if (hour >= 16) {
      const round = await prismaClient.samePageRound.findUnique({
        where: {
          circleId_gameDate: { circleId: circle.id, gameDate },
        },
      });
      if (round && !round.revealedAt) {
        await revealRound(round.id, now);
        alerts.push({
          circleId: circle.id,
          kind: "reveal",
          gameDate,
          prompt: round.prompt,
          userIds: memberIds,
        });
      }
    }
  }

  return NextResponse.json({ alerts });
}
