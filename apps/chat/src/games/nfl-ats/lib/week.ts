import { getEasternDate } from "@/games/game-room";
import {
  NFL_ATS_SLATE_DAYS,
  NFL_ATS_TIME_ZONE,
  NFL_ATS_WEEK_START_DAY,
} from "./schedule";

const DAY_MS = 24 * 60 * 60 * 1000;

const weekdayFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: NFL_ATS_TIME_ZONE,
  weekday: "short",
});

const EASTERN_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** 0 = Sunday … 6 = Saturday, in Eastern time. */
export function getEasternWeekday(now = new Date()): number {
  return EASTERN_WEEKDAYS.indexOf(weekdayFormat.format(now));
}

/**
 * The Eastern date (YYYY-MM-DD) of the Monday on or before `now` -- the key a
 * week's slate is stored under. Stepping a day at a time keeps this right
 * across DST, where a week isn't always 7 × 24h.
 */
export function getWeekStart(now = new Date()): string {
  const cursor = new Date(now);
  for (let i = 0; i < 7; i++) {
    if (getEasternWeekday(cursor) === NFL_ATS_WEEK_START_DAY) {
      return getEasternDate(cursor);
    }
    cursor.setTime(cursor.getTime() - DAY_MS);
  }
  throw new Error("No week start found in the previous 7 days");
}

/** The week before the one `now` falls in, whose record is the one on show. */
export function getPreviousWeekStart(now = new Date()): string {
  const thisWeek = getWeekStart(now);
  // Midday avoids landing on a DST-shifted midnight.
  const midweek = new Date(`${thisWeek}T12:00:00Z`);
  return getWeekStart(new Date(midweek.getTime() - 7 * DAY_MS));
}

/**
 * The NFL season a slate belongs to: a season is named for the year it starts
 * in, and runs into February, so January and February belong to the year
 * before.
 */
export function getSeason(now = new Date()): number {
  const [year, month] = getEasternDate(now).split("-").map(Number);
  return month <= 2 ? year - 1 : year;
}

/** How far ahead a slate published at `now` reaches for games. */
export function getSlateWindow(now = new Date()): { from: Date; to: Date } {
  return {
    from: now,
    to: new Date(now.getTime() + NFL_ATS_SLATE_DAYS * DAY_MS),
  };
}
