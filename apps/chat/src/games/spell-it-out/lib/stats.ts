import { gameDayOrdinal } from "./day";
import { MAX_GUESSES } from "./rules";

export type PlaySummary = {
  gameDate: string;
  guessCount: number;
  solved: boolean;
  finished: boolean;
};

export type SpellItOutStats = {
  played: number;
  solved: number;
  currentStreak: number;
  bestStreak: number;
  /** distribution[i] = days solved in i + 1 guesses. */
  distribution: number[];
};

/**
 * A streak is consecutive game days (weekdays) solved. Today's unfinished game doesn't break
 * the current streak; it just hasn't added to it yet. Losing today ends it right away.
 */
export function computeStats(
  plays: PlaySummary[],
  today: string,
): SpellItOutStats {
  const finished = plays.filter((p) => p.finished);
  const distribution = Array(MAX_GUESSES).fill(0);
  for (const p of finished) {
    if (p.solved) distribution[p.guessCount - 1]++;
  }

  const solvedDays = new Set(
    finished.filter((p) => p.solved).map((p) => gameDayOrdinal(p.gameDate)),
  );

  let bestStreak = 0;
  for (const day of solvedDays) {
    if (solvedDays.has(day - 1)) continue;
    let run = 1;
    while (solvedDays.has(day + run)) run++;
    bestStreak = Math.max(bestStreak, run);
  }

  const todayOrdinal = gameDayOrdinal(today);
  // Once today is finished it counts, win or lose; until then the streak runs to yesterday.
  const todayFinished = finished.some((p) => p.gameDate === today);
  let day = todayFinished ? todayOrdinal : todayOrdinal - 1;
  let currentStreak = 0;
  while (solvedDays.has(day)) {
    currentStreak++;
    day--;
  }

  return {
    played: finished.length,
    solved: solvedDays.size,
    currentStreak,
    bestStreak,
    distribution,
  };
}
