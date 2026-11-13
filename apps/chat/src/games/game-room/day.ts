const dayFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Eastern YYYY-MM-DD. Games roll over at midnight Eastern, so the Game room's "today" does too. */
export function getGameRoomDay(now = new Date()): string {
  return dayFormat.format(now);
}
