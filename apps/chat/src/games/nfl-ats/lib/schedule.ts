// Single source of truth for when NFL ATS does its scheduled work.
export const NFL_ATS_TIME_ZONE = "America/New_York";

// A slate is published for the week beginning this Eastern weekday (Monday),
// and covers every game kicking off in the days after it.
export const NFL_ATS_WEEK_START_DAY = 1; // 1 = Monday, matching Date#getUTCDay
export const NFL_ATS_SLATE_DAYS = 8;

// Shown to players; keep in sync with the cron below.
export const NFL_ATS_PUBLISH_LABEL = "Monday morning";

/**
 * Three times a day, every day. The job body decides what's actually due, so
 * the exact hours only bound how stale a slate or a result can be -- and it
 * skips the scores call entirely when nothing is waiting to be graded, so the
 * quiet days between Monday night and Thursday cost no API credits.
 */
export const NFL_ATS_CRON = "0 2,10,18 * * *";
