import {
  dealerBlackjackHoldMs,
  dealerRevealMs,
  type BlackjackTablePhase,
  type BlackjackTableView,
} from "@tim/casino";

/** When a dealer blackjack that ended the round at the deal plays out, in ms from the deal; null if this isn't one. */
export function dealerPeekSchedule(
  prev: BlackjackTablePhase | undefined,
  view: BlackjackTableView,
): { revealMs: number; betsMs: number } | null {
  const { cards, total } = view.dealer;
  // Only a dealer blackjack goes straight from betting to results.
  if (
    prev !== "betting" ||
    view.phase !== "results" ||
    cards.length !== 2 ||
    total !== 21
  )
    return null;
  const players = view.seats.filter((s) => s?.inRound).length;
  return {
    revealMs: dealerRevealMs(players),
    betsMs: dealerBlackjackHoldMs(players),
  };
}
