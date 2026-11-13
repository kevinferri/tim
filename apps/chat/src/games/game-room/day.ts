const dateFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** The next midnight Eastern, any day of the week. Eastern offsets are whole hours, so it's a UTC top-of-hour. */
export function getNextEasternMidnight(now = new Date()): Date {
  const today = getEasternDate(now);
  const candidate = new Date(now);
  candidate.setUTCMinutes(0, 0, 0);
  do {
    candidate.setTime(candidate.getTime() + 60 * 60 * 1000);
  } while (getEasternDate(candidate) === today);
  return candidate;
}

/** Eastern YYYY-MM-DD. Every game's day, and the Game room's "seen today", roll over on this. */
export function getEasternDate(now = new Date()): string {
  return dateFormat.format(now);
}
