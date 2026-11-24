import { Card, Rank, Rng, createShoe } from "../cards";
import { MAX_SPLIT_HANDS, SHOE_DECKS, RESHUFFLE_BELOW } from "./constants";

export type BlackjackPlayAction = "hit" | "stand" | "double" | "split";
export type BlackjackOutcome = "blackjack" | "win" | "push" | "lose" | "bust";

export type BlackjackHand = {
  cards: Card[];
  bet: number;
  doubled: boolean;
  fromSplit: boolean;
  done: boolean;
  outcome: BlackjackOutcome | null;
  payout: number | null;
};

export type BlackjackPlayer = {
  seat: number;
  userId: string;
  hands: BlackjackHand[];
};

export type BlackjackTurn = { seat: number; hand: number };

export type BlackjackRound = {
  /** Server-only; never send to clients. */
  shoe: Card[];
  /** dealer[1] is the hole card. */
  dealer: Card[];
  holeRevealed: boolean;
  /** Ascending seat = play order. */
  players: BlackjackPlayer[];
  turn: BlackjackTurn | null;
  phase: "players" | "dealer" | "settled";
};

export type BlackjackRoundEntry = { seat: number; userId: string; bet: number };

export type BlackjackSeatResult = {
  seat: number;
  userId: string;
  wagered: number;
  payout: number;
  net: number;
};

export function cardValue(rank: Rank): number {
  if (rank === "A") return 1;
  if (rank === "J" || rank === "Q" || rank === "K") return 10;
  return Number(rank);
}

export function handValue(cards: readonly Card[]): {
  total: number;
  soft: boolean;
} {
  let total = 0;
  let hasAce = false;
  for (const card of cards) {
    total += cardValue(card.rank);
    if (card.rank === "A") hasAce = true;
  }
  // At most one ace can count as 11 without busting.
  if (hasAce && total + 10 <= 21) return { total: total + 10, soft: true };
  return { total, soft: false };
}

export function isBlackjack(hand: Pick<BlackjackHand, "cards" | "fromSplit">) {
  return (
    !hand.fromSplit &&
    hand.cards.length === 2 &&
    handValue(hand.cards).total === 21
  );
}

export function blackjackPayout(bet: number): number {
  return bet + Math.floor(bet * 1.5);
}

export function ensureShoe(shoe: Card[] | null, rng: Rng): Card[] {
  if (!shoe || shoe.length < RESHUFFLE_BELOW) {
    return createShoe(SHOE_DECKS, rng);
  }
  return shoe;
}

function draw(shoe: Card[]): { card: Card; shoe: Card[] } {
  if (shoe.length === 0) throw new Error("Shoe is empty");
  return { card: shoe[0], shoe: shoe.slice(1) };
}

function newHand(
  cards: Card[],
  bet: number,
  fromSplit: boolean,
): BlackjackHand {
  return {
    cards,
    bet,
    doubled: false,
    fromSplit,
    done: false,
    outcome: null,
    payout: null,
  };
}

/** Marks a hand done if it busted or reached 21. */
function resolveHandTotal(hand: BlackjackHand): BlackjackHand {
  const { total } = handValue(hand.cards);
  if (total > 21) return { ...hand, done: true, outcome: "bust", payout: 0 };
  if (total === 21) return { ...hand, done: true };
  return hand;
}

function firstOpenTurn(
  players: readonly BlackjackPlayer[],
  from: BlackjackTurn | null,
): BlackjackTurn | null {
  for (const player of players) {
    if (from && player.seat < from.seat) continue;
    for (let h = 0; h < player.hands.length; h++) {
      if (from && player.seat === from.seat && h < from.hand) continue;
      if (!player.hands[h].done) return { seat: player.seat, hand: h };
    }
  }
  return null;
}

/** Moves the turn to the next unfinished hand, or into the dealer phase. */
function advance(round: BlackjackRound): BlackjackRound {
  if (round.phase !== "players") return round;
  const turn = firstOpenTurn(round.players, round.turn);
  if (turn) return { ...round, turn };
  return { ...round, turn: null, phase: "dealer", holeRevealed: true };
}

export function dealRound(
  shoe: Card[],
  entries: readonly BlackjackRoundEntry[],
): BlackjackRound {
  if (entries.length === 0) throw new Error("No players in round");
  const seats = new Set<number>();
  for (const e of entries) {
    if (seats.has(e.seat)) throw new Error(`Duplicate seat ${e.seat}`);
    seats.add(e.seat);
    if (!Number.isInteger(e.bet) || e.bet <= 0) {
      throw new Error(`Invalid bet ${e.bet}`);
    }
  }
  const sorted = [...entries].sort((a, b) => a.seat - b.seat);

  let rest = shoe;
  const take = () => {
    const d = draw(rest);
    rest = d.shoe;
    return d.card;
  };

  const first = sorted.map(() => take());
  const up = take();
  const second = sorted.map(() => take());
  const hole = take();
  const dealer = [up, hole];

  const players: BlackjackPlayer[] = sorted.map((e, i) => ({
    seat: e.seat,
    userId: e.userId,
    hands: [newHand([first[i], second[i]], e.bet, false)],
  }));

  const peeks = cardValue(up.rank) === 1 || cardValue(up.rank) === 10;
  if (peeks && handValue(dealer).total === 21) {
    return {
      shoe: rest,
      dealer,
      holeRevealed: true,
      players: players.map((p) => ({
        ...p,
        hands: p.hands.map((h) =>
          isBlackjack(h)
            ? { ...h, done: true, outcome: "push", payout: h.bet }
            : { ...h, done: true, outcome: "lose", payout: 0 },
        ),
      })),
      turn: null,
      phase: "settled",
    };
  }

  return advance({
    shoe: rest,
    dealer,
    holeRevealed: false,
    players: players.map((p) => ({
      ...p,
      hands: p.hands.map((h) =>
        isBlackjack(h)
          ? {
              ...h,
              done: true,
              outcome: "blackjack",
              payout: blackjackPayout(h.bet),
            }
          : h,
      ),
    })),
    turn: null,
    phase: "players",
  });
}

function currentHand(round: BlackjackRound, seat: number) {
  if (round.phase !== "players" || !round.turn || round.turn.seat !== seat) {
    return null;
  }
  const player = round.players.find((p) => p.seat === seat);
  const hand = player?.hands[round.turn.hand];
  if (!player || !hand) return null;
  return { player, hand };
}

export function legalActions(
  round: BlackjackRound,
  seat: number,
): BlackjackPlayAction[] {
  const current = currentHand(round, seat);
  if (!current) return [];
  const { player, hand } = current;
  const actions: BlackjackPlayAction[] = ["hit", "stand"];
  const twoCards = hand.cards.length === 2;
  if (twoCards) actions.push("double");
  if (
    twoCards &&
    player.hands.length < MAX_SPLIT_HANDS &&
    cardValue(hand.cards[0].rank) === cardValue(hand.cards[1].rank)
  ) {
    actions.push("split");
  }
  return actions;
}

/** Throws on an illegal action. `wagered` is the extra chips risked by double/split. */
export function applyAction(
  round: BlackjackRound,
  seat: number,
  action: BlackjackPlayAction,
): { round: BlackjackRound; wagered: number } {
  if (!legalActions(round, seat).includes(action)) {
    throw new Error(`Illegal action ${action} for seat ${seat}`);
  }
  const { player, hand } = currentHand(round, seat)!;
  const handIndex = round.turn!.hand;
  let shoe = round.shoe;
  const take = () => {
    const d = draw(shoe);
    shoe = d.shoe;
    return d.card;
  };

  let hands: BlackjackHand[];
  let wagered = 0;
  switch (action) {
    case "hit":
      hands = replaceAt(
        player.hands,
        handIndex,
        resolveHandTotal({ ...hand, cards: [...hand.cards, take()] }),
      );
      break;
    case "stand":
      hands = replaceAt(player.hands, handIndex, { ...hand, done: true });
      break;
    case "double":
      wagered = hand.bet;
      hands = replaceAt(player.hands, handIndex, {
        ...resolveHandTotal({
          ...hand,
          cards: [...hand.cards, take()],
          bet: hand.bet * 2,
          doubled: true,
        }),
        done: true,
      });
      break;
    case "split": {
      wagered = hand.bet;
      const aces = hand.cards[0].rank === "A";
      const [stays, moves] = [hand.cards[0], hand.cards[1]].map((card) => {
        const h = resolveHandTotal(newHand([card, take()], hand.bet, true));
        return aces ? { ...h, done: true } : h;
      });
      // The new hand goes last, so hands already on the table keep their index (the client keys by it).
      hands = [...replaceAt(player.hands, handIndex, stays), moves];
      break;
    }
  }

  const players = round.players.map((p) =>
    p.seat === seat ? { ...p, hands } : p,
  );
  return { round: advance({ ...round, shoe, players }), wagered };
}

/** Stands every unfinished hand for a seat (turn timeout, player left). */
export function standSeat(round: BlackjackRound, seat: number): BlackjackRound {
  if (round.phase !== "players") return round;
  const players = round.players.map((p) =>
    p.seat === seat
      ? { ...p, hands: p.hands.map((h) => (h.done ? h : { ...h, done: true })) }
      : p,
  );
  return advance({ ...round, players });
}

export function dealerShouldDraw(round: BlackjackRound): boolean {
  if (round.phase !== "dealer") return false;
  const anyLive = round.players.some((p) =>
    p.hands.some((h) => h.outcome === null),
  );
  // Stands on soft 17.
  return anyLive && handValue(round.dealer).total < 17;
}

/** Draws one card so the server can pace the dealer. */
export function dealerDraw(round: BlackjackRound): BlackjackRound {
  if (!dealerShouldDraw(round)) throw new Error("Dealer must not draw");
  const { card, shoe } = draw(round.shoe);
  return { ...round, shoe, dealer: [...round.dealer, card] };
}

export function settle(round: BlackjackRound): BlackjackRound {
  if (round.phase === "settled") return round;
  if (round.phase !== "dealer") throw new Error("Players are still acting");
  if (dealerShouldDraw(round)) throw new Error("Dealer has not finished");
  const dealerTotal = handValue(round.dealer).total;
  const players = round.players.map((p) => ({
    ...p,
    hands: p.hands.map((h): BlackjackHand => {
      if (h.outcome !== null) return h;
      const total = handValue(h.cards).total;
      if (dealerTotal > 21 || total > dealerTotal) {
        return { ...h, done: true, outcome: "win", payout: h.bet * 2 };
      }
      if (total === dealerTotal) {
        return { ...h, done: true, outcome: "push", payout: h.bet };
      }
      return { ...h, done: true, outcome: "lose", payout: 0 };
    }),
  }));
  return {
    ...round,
    players,
    holeRevealed: true,
    turn: null,
    phase: "settled",
  };
}

export function roundResults(round: BlackjackRound): BlackjackSeatResult[] {
  if (round.phase !== "settled") throw new Error("Round is not settled");
  return round.players.map((p) => {
    const wagered = p.hands.reduce((sum, h) => sum + h.bet, 0);
    const payout = p.hands.reduce((sum, h) => sum + (h.payout ?? 0), 0);
    return {
      seat: p.seat,
      userId: p.userId,
      wagered,
      payout,
      net: payout - wagered,
    };
  });
}

function replaceAt<T>(items: readonly T[], index: number, item: T): T[] {
  return items.map((x, i) => (i === index ? item : x));
}
