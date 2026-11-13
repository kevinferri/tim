/**
 * Pure Sock award rules (from the Same Page doc):
 * - Needs ≥3 answers
 * - Moves only when exactly one player is alone (unique answer)
 * - 2+ alone, or nobody alone → holder unchanged
 */
export function pickSockWinner(args: {
  answerCount: number;
  aloneUserIds: string[];
}): string | null {
  if (args.answerCount < 3) return null;
  if (args.aloneUserIds.length !== 1) return null;
  return args.aloneUserIds[0] ?? null;
}
