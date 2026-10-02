export type MemberHighlightCounts = {
  userId: string;
  messages: number;
  // Highlights from other people only.
  highlights: number;
  // Highlights given to other people's messages.
  given: number;
};

export type HighlightScore = {
  // Smoothed highlights-per-message relative to the circle's average (1 = average).
  multiplier: number;
  // 1-100: this member ranks in the top N% of members who've posted in the circle.
  topPercent: number;
  // The same rank from the other end, for phrasing the lower half as "bottom N%".
  bottomPercent: number;
};

// Pseudo-messages at the circle average blended into everyone's rate, so a few lucky messages can't top the circle.
export const SMOOTHING_MESSAGES = 20;

export function computeHighlightScore(
  members: MemberHighlightCounts[],
  userId: string,
): HighlightScore | null {
  const posters = members.filter((m) => m.messages > 0);
  if (!posters.some((m) => m.userId === userId)) return null;

  const totalMessages = posters.reduce((sum, m) => sum + m.messages, 0);
  const totalHighlights = posters.reduce((sum, m) => sum + m.highlights, 0);
  // No highlights anywhere in the circle yet: nothing to compare against.
  if (totalHighlights === 0) return null;

  const average = totalHighlights / totalMessages;
  const smoothed = (m: MemberHighlightCounts) =>
    (m.highlights + SMOOTHING_MESSAGES * average) /
    (m.messages + SMOOTHING_MESSAGES);

  const scores = posters.map((m) => ({ userId: m.userId, rate: smoothed(m) }));
  const mine = scores.find((s) => s.userId === userId)!.rate;
  const ahead = scores.filter((s) => s.rate > mine).length;
  const behind = scores.filter((s) => s.rate < mine).length;
  const percent = (n: number) =>
    Math.max(1, Math.round((n / scores.length) * 100));

  return {
    multiplier: mine / average,
    topPercent: percent(ahead + 1),
    bottomPercent: percent(behind + 1),
  };
}

export type GivingTag = {
  kind: "generous" | "even" | "greedy";
  given: number;
  received: number;
};

// Blended into both sides so a few early highlights can't swing the tag; low activity reads as "even".
const GIVING_SMOOTHING = 5;
const GIVING_RATIO = 2;

export function computeGivingTag(
  members: MemberHighlightCounts[],
  userId: string,
): GivingTag {
  const me = members.find((m) => m.userId === userId);
  const given = me?.given ?? 0;
  const received = me?.highlights ?? 0;

  const ratio = (given + GIVING_SMOOTHING) / (received + GIVING_SMOOTHING);
  const kind =
    ratio >= GIVING_RATIO
      ? "generous"
      : ratio <= 1 / GIVING_RATIO
        ? "greedy"
        : "even";

  return { kind, given, received };
}
