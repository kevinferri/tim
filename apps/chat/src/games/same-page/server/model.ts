import { Prisma } from "@prisma/client";
import { prismaClient } from "@/lib/prisma/client";
import { getEstGameDate, getSamePagePhase } from "../lib/est-day";
import {
  clusterMatchKeys,
  isValidAnswerText,
  toMatchKey,
} from "../lib/matching";
import { pickPrompt } from "../lib/prompts";
import { pickSockWinner } from "../lib/sock";
import { SAME_PAGE_GAME_ID } from "../lib/game-id";
import {
  isCircleAdmin,
  isGameEnabled,
  setGameEnabled,
} from "@/games/game-room/server";

export type GamesBadge = "play" | "results" | null;

// What every Same Page view shows about a person.
const MEMBER_SELECT = {
  id: true,
  displayName: true,
  name: true,
  imageUrl: true,
} as const;

/** User-facing Same Page errors safe to return as HTTP 400 bodies. */
export class SamePageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SamePageValidationError";
  }
}

export { isCircleAdmin };

export function isSamePageEnabled(circleId: string) {
  return isGameEnabled(circleId, SAME_PAGE_GAME_ID);
}

/** Caller must have checked isCircleAdmin. Turning it off keeps all history. */
export async function setSamePageEnabled(
  circleId: string,
  enabled: boolean,
  now = new Date(),
) {
  if (enabled && !(await isSamePageEnabled(circleId))) {
    // Rounds left open on earlier days while the game was off are abandoned:
    // never scored or announced, so turning it back on can't revive a stale prompt.
    await prismaClient.samePageRound.updateMany({
      where: {
        circleId,
        revealNotifiedAt: null,
        gameDate: { lt: getEstGameDate(now) },
      },
      data: { revealNotifiedAt: now },
    });
  }
  await setGameEnabled(circleId, SAME_PAGE_GAME_ID, enabled);
}

type AnswerRow = {
  id: string;
  userId: string;
  text: string;
  matchKey: string;
  calledUserId: string | null;
};

function clusterAnswers(answers: AnswerRow[]) {
  const clusterByText = clusterMatchKeys(answers.map((a) => a.text));
  const byCluster = new Map<string, AnswerRow[]>();
  for (const a of answers) {
    const key = clusterByText.get(a.text) ?? a.matchKey;
    const list = byCluster.get(key) ?? [];
    list.push(a);
    byCluster.set(key, list);
  }
  return byCluster;
}

async function ensureRound(circleId: string, now = new Date()) {
  const phase = getSamePagePhase(now);
  if (phase === "closed") return null;

  const gameDate = getEstGameDate(now);
  const where = { circleId_gameDate: { circleId, gameDate } };

  // Rounds are only created while answers are open. Creating one after close
  // would reveal it empty and reset everyone's streak.
  if (phase === "results") {
    const round = await prismaClient.samePageRound.findUnique({ where });
    if (!round || round.revealedAt) return round;
    const revealed = await revealRound(round.id, now);
    return revealed?.round ?? round;
  }

  // Upsert so concurrent 6am openers don't race on @@unique([circleId, gameDate]).
  return prismaClient.samePageRound.upsert({
    where,
    create: {
      circleId,
      gameDate,
      prompt: pickPrompt(circleId, gameDate),
      revealedAt: null,
    },
    update: {},
  });
}

/**
 * Apply reveal once: cluster matches, award Sock, update lifetime stats/streaks.
 * Idempotent via revealedAt. `newlyRevealed` is true only for the caller that claimed it.
 */
export async function revealRound(roundId: string, now = new Date()) {
  const round = await prismaClient.samePageRound.findUnique({
    where: { id: roundId },
    include: {
      answers: true,
      circle: { select: { members: { select: { id: true } } } },
    },
  });
  if (!round) return null;
  if (round.revealedAt) return { round, newlyRevealed: false };

  const answers = round.answers as AnswerRow[];
  const byCluster = clusterAnswers(answers);
  const aloneClusters = [...byCluster.values()].filter((c) => c.length === 1);
  const samePage = answers.length > 0 && byCluster.size === 1;

  const newSockHolderId = pickSockWinner({
    answerCount: answers.length,
    aloneUserIds: aloneClusters.map((c) => c[0].userId),
  });

  const memberIds = round.circle.members.map((m) => m.id);

  let newlyRevealed = false;
  await prismaClient.$transaction(async (tx) => {
    // Claim reveal first so concurrent callers don't double-apply stats.
    const claimed = await tx.samePageRound.updateMany({
      where: { id: round.id, revealedAt: null },
      data: { revealedAt: now },
    });
    if (claimed.count === 0) return;
    newlyRevealed = true;

    const currentSock = await tx.samePageSock.findUnique({
      where: { circleId: round.circleId },
    });

    if (newSockHolderId) {
      const alreadyHolding = currentSock?.holderUserId === newSockHolderId;
      await tx.samePageSock.upsert({
        where: { circleId: round.circleId },
        create: {
          circleId: round.circleId,
          holderUserId: newSockHolderId,
          heldSince: now,
        },
        update: alreadyHolding
          ? {}
          : { holderUserId: newSockHolderId, heldSince: now },
      });

      await tx.samePagePlayerStats.upsert({
        where: {
          circleId_userId: {
            circleId: round.circleId,
            userId: newSockHolderId,
          },
        },
        create: {
          circleId: round.circleId,
          userId: newSockHolderId,
          socksEarned: alreadyHolding ? 0 : 1,
          sockDaysHeld: 1,
        },
        update: alreadyHolding
          ? { sockDaysHeld: { increment: 1 } }
          : {
              socksEarned: { increment: 1 },
              sockDaysHeld: { increment: 1 },
            },
      });
    } else if (currentSock?.holderUserId) {
      await tx.samePagePlayerStats.upsert({
        where: {
          circleId_userId: {
            circleId: round.circleId,
            userId: currentSock.holderUserId,
          },
        },
        create: {
          circleId: round.circleId,
          userId: currentSock.holderUserId,
          sockDaysHeld: 1,
        },
        update: { sockDaysHeld: { increment: 1 } },
      });
    }

    for (const userId of memberIds) {
      const mine = answers.find((a) => a.userId === userId);
      if (!mine) {
        const existing = await tx.samePagePlayerStats.findUnique({
          where: {
            circleId_userId: { circleId: round.circleId, userId },
          },
        });
        if (existing && existing.currentStreak > 0) {
          await tx.samePagePlayerStats.update({
            where: {
              circleId_userId: { circleId: round.circleId, userId },
            },
            data: { currentStreak: 0 },
          });
        }
        continue;
      }

      const cluster = [...byCluster.values()].find((c) =>
        c.some((a) => a.userId === userId),
      )!;
      const matchedOthers = cluster.length - 1;
      const calledIt = !!(
        mine.calledUserId && cluster.some((a) => a.userId === mine.calledUserId)
      );

      const existing = await tx.samePagePlayerStats.findUnique({
        where: { circleId_userId: { circleId: round.circleId, userId } },
      });
      const nextStreak = (existing?.currentStreak ?? 0) + 1;
      const bestStreak = Math.max(existing?.bestStreak ?? 0, nextStreak);

      await tx.samePagePlayerStats.upsert({
        where: { circleId_userId: { circleId: round.circleId, userId } },
        create: {
          circleId: round.circleId,
          userId,
          played: 1,
          currentStreak: 1,
          bestStreak: 1,
          matchedRounds: matchedOthers > 0 ? 1 : 0,
          correctCalls: calledIt ? 1 : 0,
          callAttempts: mine.calledUserId ? 1 : 0,
          samePageDays: samePage ? 1 : 0,
          matchDist0: matchedOthers === 0 ? 1 : 0,
          matchDist1: matchedOthers === 1 ? 1 : 0,
          matchDist2: matchedOthers === 2 ? 1 : 0,
          matchDist3Plus: matchedOthers >= 3 ? 1 : 0,
        },
        update: {
          played: { increment: 1 },
          currentStreak: nextStreak,
          bestStreak,
          ...(matchedOthers > 0 ? { matchedRounds: { increment: 1 } } : {}),
          ...(calledIt ? { correctCalls: { increment: 1 } } : {}),
          ...(mine.calledUserId ? { callAttempts: { increment: 1 } } : {}),
          ...(samePage ? { samePageDays: { increment: 1 } } : {}),
          ...(matchedOthers === 0
            ? { matchDist0: { increment: 1 } }
            : matchedOthers === 1
              ? { matchDist1: { increment: 1 } }
              : matchedOthers === 2
                ? { matchDist2: { increment: 1 } }
                : { matchDist3Plus: { increment: 1 } }),
        },
      });
    }
  });

  const updated = await prismaClient.samePageRound.findUnique({
    where: { id: roundId },
  });
  if (!updated) return null;
  return { round: updated, newlyRevealed };
}

export async function getGamesBadge({
  circleId,
  userId,
  now = new Date(),
}: {
  circleId: string;
  userId: string;
  now?: Date;
}): Promise<GamesBadge> {
  const phase = getSamePagePhase(now);
  if (phase === "closed") return null;
  if (!(await isSamePageEnabled(circleId))) return null;

  const gameDate = getEstGameDate(now);
  const round = await prismaClient.samePageRound.findUnique({
    where: { circleId_gameDate: { circleId, gameDate } },
    include: {
      answers: { where: { userId }, select: { id: true } },
    },
  });

  if (phase === "play" && round?.answers.length) return null;
  // No round today (e.g. turned on after close): no results to see.
  if (phase === "results" && !round) return null;

  const stats = await prismaClient.samePagePlayerStats.findUnique({
    where: { circleId_userId: { circleId, userId } },
    select: { promptViewedGameDate: true, resultsViewedGameDate: true },
  });
  if (phase === "play") {
    return stats?.promptViewedGameDate === gameDate ? null : "play";
  }
  return stats?.resultsViewedGameDate === gameDate ? null : "results";
}

export async function getSamePageState({
  circleId,
  userId,
  now = new Date(),
}: {
  circleId: string;
  userId: string;
  now?: Date;
}) {
  const [enabled, isAdmin] = await Promise.all([
    isSamePageEnabled(circleId),
    isCircleAdmin(circleId, userId),
  ]);
  if (!enabled) return { enabled: false as const, isAdmin };

  const phase = getSamePagePhase(now);
  const gameDate = getEstGameDate(now);
  const round = await ensureRound(circleId, now);

  const [myAnswer, sock, stats, memberCount] = await Promise.all([
    round
      ? prismaClient.samePageAnswer.findUnique({
          where: {
            roundId_userId: { roundId: round.id, userId },
          },
          include: {
            calledUser: {
              select: MEMBER_SELECT,
            },
          },
        })
      : null,
    getSockStatus(circleId),
    prismaClient.samePagePlayerStats.findUnique({
      where: { circleId_userId: { circleId, userId } },
    }),
    prismaClient.circle
      .findUnique({
        where: { id: circleId },
        select: { members: { select: { id: true } } },
      })
      .then((c) => c?.members.length ?? 0),
  ]);

  const answeredCount = round
    ? await prismaClient.samePageAnswer.count({ where: { roundId: round.id } })
    : 0;

  let results: Awaited<ReturnType<typeof buildResults>> | null = null;
  if (phase === "results" && round?.revealedAt) {
    results = await buildResults(round.id, userId);
  }

  const circleMembers = await prismaClient.circle.findUnique({
    where: { id: circleId },
    select: {
      members: {
        select: MEMBER_SELECT,
        orderBy: { displayName: "asc" },
      },
    },
  });

  return {
    enabled: true as const,
    isAdmin,
    phase,
    gameDate,
    prompt: round?.prompt ?? null,
    answeredCount,
    memberCount,
    myAnswer: myAnswer
      ? {
          text: myAnswer.text,
          calledUser: myAnswer.calledUser,
          createdAt: myAnswer.createdAt,
        }
      : null,
    sock: sock?.holder
      ? {
          holder: sock.holder,
          heldSince: sock.heldSince,
        }
      : null,
    stats,
    results,
    members: (circleMembers?.members ?? []).filter((m) => m.id !== userId),
    badge: await getGamesBadge({ circleId, userId, now }),
  };
}

async function buildResults(roundId: string, userId: string) {
  const answers = await prismaClient.samePageAnswer.findMany({
    where: { roundId },
    include: {
      user: {
        select: MEMBER_SELECT,
      },
      calledUser: {
        select: MEMBER_SELECT,
      },
    },
  });

  const byCluster = clusterAnswers(answers);
  const clusterOf = new Map<string, (typeof answers)[number][]>();
  for (const [, cluster] of byCluster) {
    for (const a of cluster) {
      // Map each answer id to its cluster (with full includes)
      const full = answers.filter((x) =>
        cluster.some((c) => c.userId === x.userId),
      );
      clusterOf.set(a.userId, full);
    }
  }

  const mine = answers.find((a) => a.userId === userId);
  const myCluster = mine ? (clusterOf.get(mine.userId) ?? [mine]) : [];
  const othersMatched = myCluster.filter((a) => a.userId !== userId).length;
  const othersTotal = answers.length - (mine ? 1 : 0);
  const calledIt = !!(
    mine?.calledUserId && myCluster.some((a) => a.userId === mine.calledUserId)
  );
  const alone = !!mine && myCluster.length === 1;
  const samePage = answers.length > 0 && byCluster.size === 1;

  const aloneClusters = [...byCluster.values()].filter((c) => c.length === 1);
  const sockWinnerId = pickSockWinner({
    answerCount: answers.length,
    aloneUserIds: aloneClusters.map((c) => c[0].userId),
  });
  const sockAwardedTo =
    sockWinnerId != null
      ? (answers.find((a) => a.userId === sockWinnerId)?.user ?? null)
      : null;

  return {
    answers: answers.map((a) => {
      const cluster = clusterOf.get(a.userId) ?? [a];
      return {
        user: a.user,
        text: a.text,
        calledUser: a.calledUser,
        matchCount: cluster.length - 1,
        calledIt: !!(
          a.calledUserId && cluster.some((x) => x.userId === a.calledUserId)
        ),
        alone: cluster.length === 1,
        gotSock: a.userId === sockWinnerId,
      };
    }),
    summary: mine
      ? {
          matched: othersMatched,
          of: othersTotal,
          calledIt,
          alone,
          samePage,
        }
      : null,
    aloneCount: aloneClusters.length,
    sockAwardedTo,
  };
}

/** Create-only submit that refuses changes once locked. */
export async function submitSamePageAnswer({
  circleId,
  userId,
  text,
  calledUserId,
  now = new Date(),
}: {
  circleId: string;
  userId: string;
  text: string;
  calledUserId?: string | null;
  now?: Date;
}) {
  if (getSamePagePhase(now) !== "play") {
    throw new SamePageValidationError(
      "Same Page is not open for answers right now",
    );
  }
  if (!isValidAnswerText(text)) {
    throw new SamePageValidationError("Answer must be 1–3 words");
  }
  if (!(await isSamePageEnabled(circleId))) {
    throw new SamePageValidationError(
      "Same Page isn't turned on for this circle",
    );
  }

  const round = await ensureRound(circleId, now);
  if (!round) throw new SamePageValidationError("No round today");

  const existing = await prismaClient.samePageAnswer.findUnique({
    where: { roundId_userId: { roundId: round.id, userId } },
  });
  if (existing) {
    throw new SamePageValidationError("Answer is locked and cannot be changed");
  }

  if (calledUserId) {
    if (calledUserId === userId) {
      throw new SamePageValidationError("Cannot call yourself");
    }
    const isMember = await prismaClient.circle.isUserInCircle({
      circleId,
      userId: calledUserId,
    });
    if (!isMember) {
      throw new SamePageValidationError("Called match must be a circle member");
    }
  }

  try {
    return await prismaClient.samePageAnswer.create({
      data: {
        roundId: round.id,
        userId,
        text: text.trim(),
        matchKey: toMatchKey(text),
        calledUserId: calledUserId ?? null,
      },
      include: {
        calledUser: {
          select: MEMBER_SELECT,
        },
      },
    });
  } catch (err) {
    // Concurrent double-submit loses the unique race — treat as locked.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new SamePageValidationError(
        "Answer is locked and cannot be changed",
      );
    }
    throw err;
  }
}

type ViewedArgs = { circleId: string; userId: string; now?: Date };

async function markViewed(
  field: "promptViewedGameDate" | "resultsViewedGameDate",
  { circleId, userId, now = new Date() }: ViewedArgs,
) {
  const data = { [field]: getEstGameDate(now) };
  await prismaClient.samePagePlayerStats.upsert({
    where: { circleId_userId: { circleId, userId } },
    create: { circleId, userId, ...data },
    update: data,
  });
}

/** Opening the game during play clears the "play" badge, answered or not. */
export function markPromptViewed(args: ViewedArgs) {
  return markViewed("promptViewedGameDate", args);
}

export function markResultsViewed(args: ViewedArgs) {
  return markViewed("resultsViewedGameDate", args);
}

export function getSockStatus(circleId: string) {
  return prismaClient.samePageSock.findUnique({
    where: { circleId },
    include: { holder: { select: MEMBER_SELECT } },
  });
}

export async function getStandings(circleId: string) {
  return prismaClient.samePagePlayerStats.findMany({
    where: { circleId },
    include: {
      user: {
        select: MEMBER_SELECT,
      },
    },
    orderBy: [{ played: "desc" }, { matchedRounds: "desc" }],
  });
}

/** Ensure today's round exists for a circle during the play window (6am create). */
export async function ensureTodayRound(circleId: string, now = new Date()) {
  return ensureRound(circleId, now);
}
