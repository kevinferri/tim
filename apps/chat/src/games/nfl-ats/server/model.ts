import { prismaClient } from "@/lib/prisma/client";
import { gradePick, isPickSide } from "../lib/grade";
import type { FinalScore, SlateGame } from "../lib/odds";
import { getSeason, getSlateWindow, getWeekStart } from "../lib/week";
import { fetchFinalScores, fetchSlate } from "./odds-api";

/**
 * Makes sure the week `now` falls in has a slate, fetching one if it doesn't.
 * Idempotent: an existing week is returned untouched, and games already stored
 * under another week are skipped, so the Monday run doesn't re-import the
 * Monday night game that closed the previous week.
 */
export async function ensureWeekSlate(now = new Date()) {
  const season = getSeason(now);
  const startsOn = getWeekStart(now);

  const existing = await prismaClient.nflAtsWeek.findUnique({
    where: { season_startsOn: { season, startsOn } },
    select: { id: true, _count: { select: { games: true } } },
  });
  if (existing && existing._count.games > 0) return existing.id;

  const slate = await fetchSlate(getSlateWindow(now));
  if (slate.length === 0) return existing?.id ?? null;

  const week =
    existing ??
    (await prismaClient.nflAtsWeek.upsert({
      where: { season_startsOn: { season, startsOn } },
      create: { season, startsOn },
      update: {},
      select: { id: true },
    }));

  await addGamesToWeek(week.id, slate);
  return week.id;
}

/**
 * skipDuplicates leans on nfl_ats_games.eventId being unique across every
 * week: a game that already belongs to an earlier slate stays there rather
 * than moving, which keeps the spread players picked against intact.
 */
async function addGamesToWeek(weekId: string, slate: SlateGame[]) {
  await prismaClient.nflAtsGame.createMany({
    data: slate.map((game) => ({
      weekId,
      eventId: game.eventId,
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      kickoffAt: game.kickoffAt,
      spread: game.spread,
    })),
    skipDuplicates: true,
  });
}

/** Games that have kicked off but have no final score stored yet. */
export async function getGamesAwaitingResult(now = new Date()) {
  return prismaClient.nflAtsGame.findMany({
    where: { completedAt: null, kickoffAt: { lte: now } },
    select: { id: true, eventId: true, spread: true, weekId: true },
  });
}

/**
 * Writes final scores and grades every pick on those games, in one
 * transaction per game so a pick can't be left ungraded next to a completed
 * game. Returns the ids of the weeks it touched.
 */
export async function applyFinalScores(
  finals: FinalScore[],
  now = new Date(),
): Promise<string[]> {
  if (finals.length === 0) return [];

  const pending = await getGamesAwaitingResult(now);
  const byEventId = new Map(pending.map((game) => [game.eventId, game]));
  const touchedWeekIds = new Set<string>();

  for (const final of finals) {
    const game = byEventId.get(final.eventId);
    if (!game) continue;

    await prismaClient.$transaction(async (tx) => {
      // Claims the game: a second run (or a second instance) finds no row
      // still awaiting a result and grades nothing twice.
      const claimed = await tx.nflAtsGame.updateMany({
        where: { id: game.id, completedAt: null },
        data: {
          homeScore: final.homeScore,
          awayScore: final.awayScore,
          completedAt: now,
        },
      });
      if (claimed.count === 0) return;

      const picks = await tx.nflAtsPick.findMany({
        where: { gameId: game.id },
        select: { id: true, side: true },
      });

      for (const pick of picks) {
        if (!isPickSide(pick.side)) continue;
        await tx.nflAtsPick.update({
          where: { id: pick.id },
          data: {
            result: gradePick({
              side: pick.side,
              spread: game.spread,
              homeScore: final.homeScore,
              awayScore: final.awayScore,
            }),
          },
        });
      }

      touchedWeekIds.add(game.weekId);
    });
  }

  return [...touchedWeekIds];
}

/** Fetches scores and grades whatever they settle. Returns weeks touched. */
export async function gradeFinishedGames(now = new Date()): Promise<string[]> {
  const pending = await getGamesAwaitingResult(now);
  // No API call at all on the quiet days -- this is what keeps the monthly
  // credit spend down.
  if (pending.length === 0) return [];

  return applyFinalScores(await fetchFinalScores(), now);
}
