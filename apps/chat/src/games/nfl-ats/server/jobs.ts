import { getCircleIdsWithGame } from "@/games/game-room/server";
import { NFL_ATS_GAME_ID } from "../lib/game-id";
import { ensureWeekSlate, gradeFinishedGames } from "./model";
import { isWeekComplete, notifyCircleAboutWeek } from "./notices";

/**
 * Does whatever NFL ATS work is due at `now`: publishes this week's slate if
 * it doesn't have one, grades any game that has finished since the last run,
 * and tells each circle about both.
 *
 * Idempotent, so the cron and the startup catch-up can both call it freely.
 * Nothing here runs -- and no API credits are spent -- until at least one
 * circle has the game turned on. The two jobs are independent: a slate fetch
 * that fails (a bad key, an exhausted quota) still lets results land.
 */
export async function runNflAtsJobs(now = new Date()) {
  const circleIds = await getCircleIdsWithGame(NFL_ATS_GAME_ID);
  if (circleIds.length === 0) return;

  await job("publish", async () => {
    const weekId = await ensureWeekSlate(now);
    if (weekId) await announce(weekId, circleIds, "slate");
  });

  await job("grade", async () => {
    const weekIds = await gradeFinishedGames(now);
    for (const weekId of weekIds) {
      // Only when the last game is in: one "results are up" per week, not per game.
      if (await isWeekComplete(weekId)) {
        await announce(weekId, circleIds, "results");
      }
    }
  });
}

/** One circle's failure (say, it was deleted mid-run) doesn't silence the rest. */
async function announce(
  weekId: string,
  circleIds: string[],
  kind: "slate" | "results",
) {
  for (const circleId of circleIds) {
    try {
      await notifyCircleAboutWeek({ weekId, circleId, kind });
    } catch (err) {
      console.error(`[nfl-ats] ${kind} notice failed for ${circleId}`, err);
    }
  }
}

async function job(name: string, fn: () => Promise<unknown>) {
  try {
    await fn();
  } catch (err) {
    console.error(`[nfl-ats] ${name} failed`, err);
  }
}
