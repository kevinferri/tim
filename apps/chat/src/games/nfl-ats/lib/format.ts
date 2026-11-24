import { NFL_ATS_TIME_ZONE } from "./schedule";
import type { PickSide } from "./grade";

const dayFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: NFL_ATS_TIME_ZONE,
  weekday: "short",
  month: "short",
  day: "numeric",
});

const timeFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: NFL_ATS_TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
});

const monthDayFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
});

/** The line as a bettor reads it: a favourite is negative, a pick'em has no number. */
export function formatSpread(spread: number): string {
  if (spread === 0) return "PK";
  return spread > 0 ? `+${trim(spread)}` : `-${trim(Math.abs(spread))}`;
}

function trim(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/** A side's own line, flipped from the stored home spread for the away team. */
export function spreadForSide(homeSpread: number, side: PickSide): number {
  return side === "home" ? homeSpread : -homeSpread;
}

/** "Thu, Nov 26", in Eastern -- a late game belongs to the day it kicks off there. */
export function formatKickoffDay(kickoffAt: string | Date): string {
  return dayFormat.format(new Date(kickoffAt));
}

/** "8:15 PM", in Eastern. */
export function formatKickoffTime(kickoffAt: string | Date): string {
  return timeFormat.format(new Date(kickoffAt));
}

/** "Week of Nov 23" from a YYYY-MM-DD Eastern week start. */
export function formatWeekLabel(startsOn: string): string {
  return `Week of ${monthDayFormat.format(new Date(`${startsOn}T12:00:00Z`))}`;
}

/** Games split into Eastern-day sections, keeping the order they came in. */
export function groupByKickoffDay<T extends { kickoffAt: string }>(
  games: T[],
): { day: string; games: T[] }[] {
  const days: { day: string; games: T[] }[] = [];
  for (const game of games) {
    const day = formatKickoffDay(game.kickoffAt);
    const last = days.at(-1);
    if (last?.day === day) last.games.push(game);
    else days.push({ day, games: [game] });
  }
  return days;
}
