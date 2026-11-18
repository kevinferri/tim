import { Card } from "../cards";
import { SeatOccupant } from "../table";
import {
  BlackjackHand,
  BlackjackOutcome,
  BlackjackPlayAction,
  BlackjackRound,
  BlackjackTurn,
  handValue,
} from "./engine";

export type BlackjackTablePhase =
  "waiting" | "betting" | "players" | "dealer" | "results";

export type BlackjackHandView = {
  cards: Card[];
  bet: number;
  total: number;
  soft: boolean;
  doubled: boolean;
  outcome: BlackjackOutcome | null;
  payout: number | null;
};

export type BlackjackSeatView = {
  seat: number;
  occupant: SeatOccupant;
  stack: number;
  bet: number | null;
  inRound: boolean;
  leaving: boolean;
  hands: BlackjackHandView[];
  lastNet: number | null;
};

export type BlackjackDealerView = {
  /** null = face down. */
  cards: (Card | null)[];
  /** Total of the visible cards only. */
  total: number | null;
};

export type BlackjackTableView = {
  circleId: string;
  game: "blackjack";
  /** The server process: changes only when the server restarts, so a client can tell a restart from its own disconnect. */
  serverId: string;
  phase: BlackjackTablePhase;
  /** Relative countdown for the betting window or current turn, to avoid clock skew. */
  msLeft: number | null;
  /** Length SEAT_COUNT. */
  seats: (BlackjackSeatView | null)[];
  dealer: BlackjackDealerView;
  turn: BlackjackTurn | null;
  /** Legal actions for whoever's turn it is. */
  turnActions: BlackjackPlayAction[];
  limits: { minBet: number; maxBet: number };
};

export function handView(hand: BlackjackHand): BlackjackHandView {
  const { total, soft } = handValue(hand.cards);
  return {
    cards: hand.cards,
    bet: hand.bet,
    total,
    soft,
    doubled: hand.doubled,
    outcome: hand.outcome,
    payout: hand.payout,
  };
}

export function dealerView(round: BlackjackRound): BlackjackDealerView {
  const visible = round.holeRevealed ? round.dealer : round.dealer.slice(0, 1);
  return {
    cards: round.holeRevealed ? round.dealer : [round.dealer[0], null],
    total: visible.length ? handValue(visible).total : null,
  };
}
