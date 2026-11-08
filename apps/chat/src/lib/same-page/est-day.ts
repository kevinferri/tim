/**
 * America/New_York calendar helpers for Same Page day boundaries.
 * Prompt live: weekday 06:00–16:00 EST/EDT. Reveal at 16:00.
 *
 * Local-only override: set SAME_PAGE_FORCE_PHASE=play|results|closed in
 * apps/chat/.env.local (never in production) to bypass the clock/weekend.
 * Optional SAME_PAGE_FORCE_HOUR=0–23 overrides the EST hour for scheduler logic.
 */

const TZ = "America/New_York";

export type SamePagePhase = "closed" | "play" | "results";

export function getForcedSamePagePhase(): SamePagePhase | null {
  const raw = process.env.SAME_PAGE_FORCE_PHASE?.trim().toLowerCase();
  if (raw === "play" || raw === "results" || raw === "closed") return raw;
  return null;
}

export function getEstGameDate(now = new Date()): string {
  // en-CA yields YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function getEstWeekdayShort(now = new Date()): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short",
  }).format(now);
}

export function isEstWeekday(now = new Date()): boolean {
  const day = getEstWeekdayShort(now);
  return day !== "Sat" && day !== "Sun";
}

/** True when the scheduler should run (weekday, or a forced play/results day). */
export function isSamePageActiveDay(now = new Date()): boolean {
  const forced = getForcedSamePagePhase();
  if (forced === "play" || forced === "results") return true;
  if (forced === "closed") return false;
  return isEstWeekday(now);
}

export function getEstHour(now = new Date()): number {
  const forcedHour = process.env.SAME_PAGE_FORCE_HOUR?.trim();
  if (forcedHour !== undefined && forcedHour !== "") {
    const n = Number(forcedHour);
    if (Number.isInteger(n) && n >= 0 && n <= 23) return n;
  }

  const hourStr = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour: "numeric",
    hour12: false,
  }).format(now);
  // Some engines return "24" for midnight — normalize.
  const hour = Number(hourStr);
  return hour === 24 ? 0 : hour;
}

/** closed = weekend or before 6am; play = 6am–4pm weekday; results = after 4pm weekday. */
export function getSamePagePhase(now = new Date()): SamePagePhase {
  const forced = getForcedSamePagePhase();
  if (forced) return forced;

  if (!isEstWeekday(now)) return "closed";
  const hour = getEstHour(now);
  if (hour < 6) return "closed";
  if (hour < 16) return "play";
  return "results";
}
