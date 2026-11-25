import { describe, expect, it } from "vitest";
import {
  DEALER_BLACKJACK_BEAT_MS,
  DEALER_PEEK_MS,
  DEAL_FLIGHT_MS,
  DEAL_STAGGER_MS,
  SEAT_COUNT,
  type BlackjackSeatView,
  type BlackjackTableView,
  type Card,
} from "@tim/casino";
import { dealerPeekSchedule } from "./dealer-peek";

const card = (rank: Card["rank"]): Card => ({ rank, suit: "spades" });

function view(
  dealer: Card[],
  inRound: number,
  phase: BlackjackTableView["phase"] = "results",
): BlackjackTableView {
  const seats: (BlackjackSeatView | null)[] = Array(SEAT_COUNT).fill(null);
  for (let i = 0; i < inRound + 1; i++) {
    // One extra seat sitting this round out, which must not count.
    seats[i] = { inRound: i < inRound } as BlackjackSeatView;
  }
  const total =
    dealer.some((c) => c.rank === "A") &&
    dealer.some((c) => ["10", "J", "Q", "K"].includes(c.rank))
      ? 21
      : 0;
  return {
    phase,
    seats,
    dealer: { cards: dealer, total: dealer.length === 2 ? total : null },
  } as BlackjackTableView;
}

describe("dealerPeekSchedule", () => {
  it("flips once the deal lands and the dealer has peeked, then takes the bets a beat later", () => {
    const schedule = dealerPeekSchedule(
      "betting",
      view([card("A"), card("K")], 2),
    );
    // Two players: 2 × 2 cards and the dealer's up card before the hole card leaves the shoe.
    const landed = 5 * DEAL_STAGGER_MS + DEAL_FLIGHT_MS;
    expect(schedule).toEqual({
      revealMs: landed + DEALER_PEEK_MS,
      betsMs: landed + DEALER_PEEK_MS + DEALER_BLACKJACK_BEAT_MS,
    });
  });

  it("takes longer to deal a fuller table", () => {
    const one = dealerPeekSchedule("betting", view([card("A"), card("K")], 1))!;
    const five = dealerPeekSchedule(
      "betting",
      view([card("K"), card("A")], 5),
    )!;
    expect(five.revealMs - one.revealMs).toBe(8 * DEAL_STAGGER_MS);
  });

  it("is null for anything but a dealer blackjack at a live deal", () => {
    const bj = [card("A"), card("K")];
    // Joined mid-round or reconnected: no phase change was seen.
    expect(dealerPeekSchedule(undefined, view(bj, 1))).toBeNull();
    // An ordinary round's results, after the dealer played out.
    expect(dealerPeekSchedule("dealer", view(bj, 1))).toBeNull();
    // Still betting.
    expect(dealerPeekSchedule("betting", view(bj, 1, "betting"))).toBeNull();
    // A dealer 21 drawn to (never straight from betting, but not two cards either).
    expect(
      dealerPeekSchedule("betting", view([card("7"), card("4"), card("K")], 1)),
    ).toBeNull();
  });
});
