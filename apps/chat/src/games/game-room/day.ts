const dateFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Eastern YYYY-MM-DD. Every game's day, and the Game room's "seen today", roll over on this. */
export function getEasternDate(now = new Date()): string {
  return dateFormat.format(now);
}
