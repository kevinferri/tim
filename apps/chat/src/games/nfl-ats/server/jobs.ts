import { getCircleIdsWithGame } from "@/games/game-room/server";
import { NFL_ATS_GAME_ID } from "../lib/game-id";
import { ensureWeekSlate, gradeFinishedGames } from "./model";

/**
 * Does whatever NFL ATS work is due at `now`: publishes this week's slate if
 * it doesn't have one, and grades any game that has finished since the last
 * run.
 *
 * Idempotent, so the cron and the startup catch-up can both call it freely.
 * Nothing here runs -- and no API credits are spent -- until at least one
 * circle has the game turned on. The two jobs are independent: a slate fetch
 * that fails (a bad key, an exhausted quota) still lets results land.
 */
export async function runNflAtsJobs(now = new Date()) {
  const circleIds = await getCircleIdsWithGame(NFL_ATS_GAME_ID);
  if (circleIds.length === 0) return;

  await job("publish", () => ensureWeekSlate(now));
  await job("grade", () => gradeFinishedGames(now));
}

async function job(name: string, fn: () => Promise<unknown>) {
  try {
    await fn();
  } catch (err) {
    console.error(`[nfl-ats] ${name} failed`, err);
  }
}
