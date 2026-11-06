// Lowercase: they complete the header's sentence, e.g. "Top highlights this month".
export const HIGHLIGHT_PERIODS = [
  { value: "day", label: "today" },
  { value: "week", label: "this week" },
  { value: "month", label: "this month" },
  { value: "year", label: "this year" },
  { value: "allTime", label: "of all time" },
] as const;

export type HighlightPeriod = (typeof HIGHLIGHT_PERIODS)[number]["value"];

export const DEFAULT_HIGHLIGHT_PERIOD: HighlightPeriod = "month";

// Calendar boundaries in the runtime's local time, so the client must compute
// this (not the server) for "today" to mean the viewer's today.
export function getHighlightPeriodStart(
  period: HighlightPeriod,
  now = new Date(),
): Date | undefined {
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();

  switch (period) {
    case "day":
      return new Date(y, m, d);
    case "week":
      return new Date(y, m, d - now.getDay());
    case "month":
      return new Date(y, m, 1);
    case "year":
      return new Date(y, 0, 1);
    case "allTime":
      return undefined;
  }
}
