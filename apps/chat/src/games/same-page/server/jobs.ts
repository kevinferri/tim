import { Prisma } from "@prisma/client";
import { NotificationType } from "@tim/socket-types";
import { prismaClient } from "@/lib/prisma/client";
import { getEstGameDate, getEstHour, getSamePagePhase } from "../lib/est-day";
import { SAME_PAGE_GAME_ID } from "../lib/game-id";
import { SAME_PAGE_NUDGE_HOUR } from "../lib/schedule";
import { ensureTodayRound, revealRound } from "./model";
import { getCircleIdsWithGame } from "@/games/game-room/server";

type EnabledCircle = { id: string; memberIds: string[] };
type NotifyFlag = "promptNotifiedAt" | "nudgeNotifiedAt" | "revealNotifiedAt";

/**
 * Does whatever Same Page work is due at `now`: reveals (including rounds
 * missed on earlier days), today's prompt, and the afternoon nudge.
 * Idempotent, so the cron and the startup catch-up can both call it freely.
 */
export async function runSamePageJobs(now = new Date()) {
  const circles = await getEnabledCircles();
  await revealDueRounds(circles, now);

  if (getSamePagePhase(now) !== "play") return;
  const nudgeDue = getEstHour(now) >= SAME_PAGE_NUDGE_HOUR;

  for (const circle of circles) {
    if (circle.memberIds.length === 0) continue;

    await perCircle(circle.id, "prompt", async () => {
      const round = await ensureTodayRound(circle.id, now);
      if (!round) return;

      const promptSentNow = await claimAndNotify({
        roundId: round.id,
        flag: "promptNotifiedAt",
        circleId: circle.id,
        recipientIds: circle.memberIds,
        type: NotificationType.SamePagePrompt,
        now,
      });
      // A late start (e.g. after downtime) shouldn't send the prompt and the nudge together.
      if (!nudgeDue || promptSentNow) return;

      const answers = await prismaClient.samePageAnswer.findMany({
        where: { roundId: round.id },
        select: { userId: true },
      });
      const answered = new Set(answers.map((a) => a.userId));
      await claimAndNotify({
        roundId: round.id,
        flag: "nudgeNotifiedAt",
        circleId: circle.id,
        recipientIds: circle.memberIds.filter((id) => !answered.has(id)),
        type: NotificationType.SamePageNudge,
        now,
      });
    });
  }
}

async function getEnabledCircles(): Promise<EnabledCircle[]> {
  const circles = await prismaClient.circle.findMany({
    where: { id: { in: await getCircleIdsWithGame(SAME_PAGE_GAME_ID) } },
    select: { id: true, members: { select: { id: true } } },
  });
  return circles.map((circle) => ({
    id: circle.id,
    memberIds: circle.members.map((m) => m.id),
  }));
}

async function revealDueRounds(circles: EnabledCircle[], now: Date) {
  const today = getEstGameDate(now);
  const rounds = await prismaClient.samePageRound.findMany({
    where: {
      circleId: { in: circles.map((c) => c.id) },
      revealNotifiedAt: null,
      gameDate:
        getSamePagePhase(now) === "results" ? { lte: today } : { lt: today },
    },
    select: { id: true, circleId: true, revealedAt: true },
    // Oldest first, so streaks are applied in order.
    orderBy: { gameDate: "asc" },
  });

  const circlesById = new Map(circles.map((c) => [c.id, c]));
  const failedCircleIds = new Set<string>();

  for (const round of rounds) {
    const circle = circlesById.get(round.circleId);
    if (!circle || failedCircleIds.has(circle.id)) continue;

    const ok = await perCircle(circle.id, "reveal", async () => {
      // The round may already be revealed by someone opening the game after close.
      if (!round.revealedAt) await revealRound(round.id, now);
      await claimAndNotify({
        roundId: round.id,
        flag: "revealNotifiedAt",
        circleId: circle.id,
        recipientIds: circle.memberIds,
        type: NotificationType.SamePageReveal,
        now,
      });
    });
    if (!ok) failedCircleIds.add(circle.id);
  }
}

/** Claims the flag and writes the notifications in one transaction; false if already claimed. */
async function claimAndNotify({
  roundId,
  flag,
  circleId,
  recipientIds,
  type,
  now,
}: {
  roundId: string;
  flag: NotifyFlag;
  circleId: string;
  recipientIds: string[];
  type: NotificationType;
  now: Date;
}) {
  return prismaClient.$transaction(async (tx) => {
    const claimed = await tx.samePageRound.updateMany({
      where: { id: roundId, [flag]: null } as Prisma.SamePageRoundWhereInput,
      data: { [flag]: now },
    });
    if (claimed.count === 0) return false;

    if (recipientIds.length > 0) {
      await tx.notification.createMany({
        data: recipientIds.map((recipientId) => ({
          type,
          recipientId,
          circleId,
        })),
      });
    }
    return true;
  });
}

async function perCircle(
  circleId: string,
  job: string,
  fn: () => Promise<void>,
) {
  try {
    await fn();
    return true;
  } catch (err) {
    console.error(`[same-page] ${job} failed for circle ${circleId}`, err);
    return false;
  }
}
