const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// Calendar days between the two dates' local midnights, not 24h periods.
function calendarDaysBetween(date: Date, now: Date) {
  return Math.round(
    (startOfDay(now).getTime() - startOfDay(date).getTime()) / (24 * HOUR_MS),
  );
}

function formatClock(date: Date) {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatCalendarDate(date: Date, now: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() !== now.getFullYear() && { year: "numeric" }),
  });
}

// Notifications: "just now", "4m ago", "3h ago", "Yesterday", "3d ago", "Sep 22".
export function formatFeedTime(date: Date, now: Date) {
  const elapsed = now.getTime() - date.getTime();
  const days = calendarDaysBetween(date, now);

  // Also covers small clock skew putting `date` slightly in the future.
  if (elapsed < MINUTE_MS) return "just now";
  if (elapsed < HOUR_MS) return `${Math.floor(elapsed / MINUTE_MS)}m ago`;
  if (days === 0) return `${Math.floor(elapsed / HOUR_MS)}h ago`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;

  return formatCalendarDate(date, now);
}

// Transcript: "Just now", "Today at 4:43 PM", "Yesterday at 4:43 PM", "Sep 23, 4:43 PM".
export function formatTranscriptTime(date: Date, now: Date) {
  const days = calendarDaysBetween(date, now);
  const clock = formatClock(date);

  if (now.getTime() - date.getTime() < MINUTE_MS) return "Just now";
  if (days <= 0) return `Today at ${clock}`;
  if (days === 1) return `Yesterday at ${clock}`;

  return `${formatCalendarDate(date, now)}, ${clock}`;
}

// Hover tooltip for either style, since both drop precision.
export function formatFullDateTime(date: Date) {
  return date.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
