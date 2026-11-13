import { getEasternDate } from "@/games/game-room";

/** YYYY-MM-DD in Eastern time; days roll over at midnight Eastern, for everyone on Tim. */
export function getGameDate(now = new Date()): string {
  return getEasternDate(now);
}

/** Whole days since 1970-01-01 for a YYYY-MM-DD date. */
export function dayOrdinal(gameDate: string): number {
  const [y, m, d] = gameDate.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

/** Monday to Friday; Wordsmith takes weekends off. */
export function isGameDay(gameDate: string): boolean {
  const weekday = new Date(`${gameDate}T00:00:00Z`).getUTCDay();
  return weekday !== 0 && weekday !== 6;
}

/** Counts game days only, so streaks and the word list skip weekends. A weekend maps to the Monday after. */
export function gameDayOrdinal(gameDate: string): number {
  // 1970-01-05 (ordinal 4) was a Monday, so shifting by 3 puts Mondays at multiples of 7.
  const shifted = dayOrdinal(gameDate) + 3;
  return Math.floor(shifted / 7) * 5 + Math.min(shifted % 7, 5);
}

const labelFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  weekday: "long",
  month: "short",
  day: "numeric",
});

/** "Friday, Nov 13" for a YYYY-MM-DD game date. */
export function formatGameDate(gameDate: string): string {
  return labelFormat.format(new Date(`${gameDate}T12:00:00Z`));
}
