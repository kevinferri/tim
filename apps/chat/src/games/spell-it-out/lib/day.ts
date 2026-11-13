// Days roll over at midnight Eastern, for everyone on Tim.
const dateFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** YYYY-MM-DD in Eastern time. */
export function getGameDate(now = new Date()): string {
  return dateFormat.format(now);
}

/** Whole days since 1970-01-01 for a YYYY-MM-DD date. */
export function dayOrdinal(gameDate: string): number {
  const [y, m, d] = gameDate.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

/** Monday to Friday; Spell It Out takes weekends off. */
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

/** The start of the next game day (midnight Eastern, skipping weekends). */
export function getNextGameDayAt(now = new Date()): Date {
  // Eastern offsets are whole hours, so midnight Eastern is a UTC top-of-hour.
  const today = getGameDate(now);
  const candidate = new Date(now);
  candidate.setUTCMinutes(0, 0, 0);
  do {
    candidate.setTime(candidate.getTime() + 60 * 60 * 1000);
  } while (
    getGameDate(candidate) === today ||
    !isGameDay(getGameDate(candidate))
  );
  return candidate;
}
