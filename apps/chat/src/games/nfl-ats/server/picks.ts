import { ApiError } from "@/lib/api";
import {
  isGameEnabled,
  isCircleAdmin,
  setGameEnabled,
} from "@/games/game-room/server";
import { prismaClient } from "@/lib/prisma/client";
import type { GameBadge } from "@/games/game-room";
import { NFL_ATS_GAME_ID } from "../lib/game-id";
import { isPickSide, type PickResult, type PickSide } from "../lib/grade";
import { getSeason, getWeekStart } from "../lib/week";

/** A message the panel shows as-is, rather than a generic failure. */
export class NflAtsValidationError extends ApiError {
  constructor(message: string) {
    super(400, message);
  }
}

export type PickableGame = {
  id: string;
  awayTeam: string;
  homeTeam: string;
  /** The home team's line, fixed when the slate published. */
  spread: number;
  kickoffAt: string;
  /** Kicked off: the pick is sealed, and the sides become read-only. */
  locked: boolean;
  myPick: PickSide | null;
  homeScore: number | null;
  awayScore: number | null;
  myResult: PickResult | null;
};

export type NflAtsState =
  | {
      enabled: true;
      isAdmin: boolean;
      /** Null before the season's first slate, or if a fetch hasn't landed yet. */
      weekStartsOn: string | null;
      games: PickableGame[];
    }
  | { enabled: false; isAdmin: boolean };

export async function setNflAtsEnabled(circleId: string, enabled: boolean) {
  await setGameEnabled(circleId, NFL_ATS_GAME_ID, enabled);
}

export { isCircleAdmin };

async function getCurrentWeek(now: Date) {
  return prismaClient.nflAtsWeek.findUnique({
    where: {
      season_startsOn: { season: getSeason(now), startsOn: getWeekStart(now) },
    },
    select: { id: true, startsOn: true },
  });
}

/** This week's slate with the viewer's own picks folded in. */
export async function getNflAtsState({
  circleId,
  userId,
  now = new Date(),
}: {
  circleId: string;
  userId: string;
  now?: Date;
}): Promise<NflAtsState> {
  const [enabled, isAdmin] = await Promise.all([
    isGameEnabled(circleId, NFL_ATS_GAME_ID),
    isCircleAdmin(circleId, userId),
  ]);
  if (!enabled) return { enabled: false, isAdmin };

  const week = await getCurrentWeek(now);
  if (!week) return { enabled: true, isAdmin, weekStartsOn: null, games: [] };

  const games = await prismaClient.nflAtsGame.findMany({
    where: { weekId: week.id },
    orderBy: [{ kickoffAt: "asc" }, { awayTeam: "asc" }],
    select: {
      id: true,
      awayTeam: true,
      homeTeam: true,
      spread: true,
      kickoffAt: true,
      homeScore: true,
      awayScore: true,
      picks: {
        where: { userId },
        select: { side: true, result: true },
      },
    },
  });

  return {
    enabled: true,
    isAdmin,
    weekStartsOn: week.startsOn,
    games: games.map((game) => {
      const mine = game.picks[0];
      return {
        id: game.id,
        awayTeam: game.awayTeam,
        homeTeam: game.homeTeam,
        spread: game.spread,
        kickoffAt: game.kickoffAt.toISOString(),
        locked: game.kickoffAt <= now,
        myPick: mine && isPickSide(mine.side) ? mine.side : null,
        homeScore: game.homeScore,
        awayScore: game.awayScore,
        myResult: (mine?.result as PickResult | null) ?? null,
      };
    }),
  };
}

/**
 * Takes one side of one game. Picks accumulate over the week and can be
 * changed freely until that game kicks off -- the lock is per game, so a
 * Thursday night result can't be used to inform a Sunday pick, but Sunday's
 * games stay open all week.
 */
export async function submitPick({
  circleId,
  userId,
  gameId,
  side,
  now = new Date(),
}: {
  circleId: string;
  userId: string;
  gameId: string;
  side: PickSide;
  now?: Date;
}) {
  if (!(await isGameEnabled(circleId, NFL_ATS_GAME_ID))) {
    throw new NflAtsValidationError("Pick 'em isn’t on for this circle");
  }

  const game = await prismaClient.nflAtsGame.findUnique({
    where: { id: gameId },
    select: { id: true, kickoffAt: true },
  });
  if (!game) throw new ApiError(404);

  if (game.kickoffAt <= now) {
    throw new NflAtsValidationError("That game has already kicked off");
  }

  await prismaClient.nflAtsPick.upsert({
    where: { userId_gameId: { userId, gameId: game.id } },
    create: { userId, gameId: game.id, side },
    update: { side },
  });

  return { gameId: game.id, side };
}

/**
 * "play" while any game this week is still open and unpicked, plus the next
 * time that can change on its own -- the next kickoff, when an unpicked game
 * stops counting. The client arms its refresh timer off that, so the dot
 * clears without polling.
 */
export async function getNflAtsBadge({
  circleId,
  userId,
  now = new Date(),
}: {
  circleId: string;
  userId: string;
  now?: Date;
}): Promise<{ badge: GameBadge; nextChangeAt: string | null }> {
  if (!(await isGameEnabled(circleId, NFL_ATS_GAME_ID))) {
    return { badge: null, nextChangeAt: null };
  }

  const week = await getCurrentWeek(now);
  if (!week) return { badge: null, nextChangeAt: null };

  const [open, nextKickoff] = await Promise.all([
    prismaClient.nflAtsGame.count({
      where: {
        weekId: week.id,
        kickoffAt: { gt: now },
        picks: { none: { userId } },
      },
    }),
    prismaClient.nflAtsGame.findFirst({
      where: { weekId: week.id, kickoffAt: { gt: now } },
      orderBy: { kickoffAt: "asc" },
      select: { kickoffAt: true },
    }),
  ]);

  return {
    badge: open > 0 ? "play" : null,
    nextChangeAt: nextKickoff?.kickoffAt.toISOString() ?? null,
  };
}
