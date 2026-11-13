/**
 * America/New_York calendar helpers for Same Page day boundaries.
 *
 * Local-only override: set SAME_PAGE_FORCE_PHASE=play|results|closed in
 * apps/chat/.env.local (never in production) to bypass the clock/weekend.
 * Optional SAME_PAGE_FORCE_HOUR=0–23 overrides the Eastern hour.
 * Server-only: these env vars aren't exposed to the browser.
 */

import {
  SAME_PAGE_ALERT_HOURS,
  SAME_PAGE_CLOSE_HOUR,
  SAME_PAGE_OPEN_HOUR,
  SAME_PAGE_TIME_ZONE,
} from "./schedule";

const TZ = SAME_PAGE_TIME_ZONE;

const dateFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const weekdayFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  weekday: "short",
});
const hourFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  hour: "numeric",
  hour12: false,
});

export type SamePagePhase = "closed" | "play" | "results";

export function getForcedSamePagePhase(): SamePagePhase | null {
  const raw = process.env.SAME_PAGE_FORCE_PHASE?.trim().toLowerCase();
  if (raw === "play" || raw === "results" || raw === "closed") return raw;
  return null;
}

export function getEstGameDate(now = new Date()): string {
  // en-CA yields YYYY-MM-DD
  return dateFormat.format(now);
}

export function isEstWeekday(now = new Date()): boolean {
  const day = weekdayFormat.format(now);
  return day !== "Sat" && day !== "Sun";
}

function clockEstHour(now: Date): number {
  // Some engines return "24" for midnight.
  const hour = Number(hourFormat.format(now));
  return hour === 24 ? 0 : hour;
}

export function getEstHour(now = new Date()): number {
  const forcedHour = process.env.SAME_PAGE_FORCE_HOUR?.trim();
  if (forcedHour !== undefined && forcedHour !== "") {
    const n = Number(forcedHour);
    if (Number.isInteger(n) && n >= 0 && n <= 23) return n;
  }
  return clockEstHour(now);
}

/** closed = weekend or before opening; play = open until close; results = after close. */
export function getSamePagePhase(now = new Date()): SamePagePhase {
  const forced = getForcedSamePagePhase();
  if (forced) return forced;

  if (!isEstWeekday(now)) return "closed";
  const hour = getEstHour(now);
  if (hour < SAME_PAGE_OPEN_HOUR) return "closed";
  if (hour < SAME_PAGE_CLOSE_HOUR) return "play";
  return "results";
}

/** Next weekday alert time (prompt, nudge or reveal) strictly after `now`. */
export function getNextAlertAt(now = new Date()): Date {
  // Eastern offsets are whole hours, so UTC top-of-hour is also Eastern top-of-hour.
  const candidate = new Date(now);
  candidate.setUTCMinutes(0, 0, 0);
  for (let i = 0; i < 24 * 8; i++) {
    candidate.setTime(candidate.getTime() + 60 * 60 * 1000);
    if (
      isEstWeekday(candidate) &&
      SAME_PAGE_ALERT_HOURS.includes(clockEstHour(candidate))
    ) {
      return candidate;
    }
  }
  throw new Error("No Same Page alert time found in the next week");
}
