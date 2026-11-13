// Single source of truth for when Same Page runs; read by the server cron and the client refresh timer.
export const SAME_PAGE_TIME_ZONE = "America/New_York";

export const SAME_PAGE_OPEN_HOUR = 6;
export const SAME_PAGE_NUDGE_HOUR = 14;
export const SAME_PAGE_CLOSE_HOUR = 16;

export const SAME_PAGE_ALERT_HOURS = [
  SAME_PAGE_OPEN_HOUR,
  SAME_PAGE_NUDGE_HOUR,
  SAME_PAGE_CLOSE_HOUR,
];

// Weekdays only (cron day-of-week 1-5).
export const SAME_PAGE_CRON = `0 ${SAME_PAGE_ALERT_HOURS.join(",")} * * 1-5`;
