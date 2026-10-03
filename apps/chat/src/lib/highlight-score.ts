// Only the profile owner's own counts within the circle: comparing against every other
// member meant scanning the whole circle, which isn't worth it on big circles.
export type MemberHighlightCounts = {
  messages: number;
  // Highlights from other people only.
  received: number;
  // Highlights given to other people's messages.
  given: number;
};

export type HighlightScore = {
  // Highlights from others per 100 messages, lightly smoothed.
  value: number;
  // False until they've sent enough messages for the score to mean much.
  placed: boolean;
};

export const PLACEMENT_MESSAGES = 20;
// Blended into the message count so a few lucky early messages can't top the ranks.
const SMOOTHING_MESSAGES = 20;

export function computeHighlightScore(
  counts: MemberHighlightCounts,
): HighlightScore | null {
  if (counts.messages === 0) return null;

  return {
    value: Math.round(
      (counts.received / (counts.messages + SMOOTHING_MESSAGES)) * 100,
    ),
    placed: counts.messages >= PLACEMENT_MESSAGES,
  };
}

export type GivingTag = {
  kind: "generous" | "even" | "greedy";
  given: number;
  received: number;
};

// Blended into both sides so a few early highlights can't swing the tag; low activity reads as "even".
// Circle-wide, given and received total the same, so ratios cluster near 1 and a wide cutoff tags everyone even.
const GIVING_SMOOTHING = 15;
const GIVING_RATIO = 1.3;

export function computeGivingTag({
  given,
  received,
}: MemberHighlightCounts): GivingTag {
  const ratio = (given + GIVING_SMOOTHING) / (received + GIVING_SMOOTHING);
  const kind =
    ratio >= GIVING_RATIO
      ? "generous"
      : ratio <= 1 / GIVING_RATIO
        ? "greedy"
        : "even";

  return { kind, given, received };
}
