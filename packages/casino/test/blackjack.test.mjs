import { test } from "node:test";
import assert from "node:assert/strict";
import {
  RESHUFFLE_BELOW,
  SHOE_DECKS,
  applyAction,
  blackjackPayout,
  createShoe,
  dealRound,
  dealerDraw,
  dealerShouldDraw,
  dealerView,
  ensureShoe,
  handValue,
  legalActions,
  roundResults,
  settle,
  shuffle,
  standSeat,
} from "../dist/index.js";

const c = (rank) => ({ rank, suit: "spades" });
const cards = (...ranks) => ranks.map(c);

// Seeded LCG so shuffles are reproducible.
function seededRng(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/** One player at seat 0: shoe order is p1, up, p2, hole, then draws. */
function deal1(p1, up, p2, hole, draws = [], bet = 10) {
  return dealRound(cards(p1, up, p2, hole, ...draws), [
    { seat: 0, userId: "u0", bet },
  ]);
}

function playDealer(round) {
  let r = round;
  while (dealerShouldDraw(r)) r = dealerDraw(r);
  return settle(r);
}

// Cards

test("createShoe has 52 cards per deck, each card once per deck", () => {
  const shoe = createShoe(SHOE_DECKS, seededRng());
  assert.equal(shoe.length, 312);
  const counts = new Map();
  for (const card of shoe) {
    const key = `${card.rank}${card.suit}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  assert.equal(counts.size, 52);
  for (const n of counts.values()) assert.equal(n, SHOE_DECKS);
});

test("shuffle is deterministic for an rng and does not mutate input", () => {
  const input = [1, 2, 3, 4, 5, 6, 7, 8];
  const a = shuffle(input, seededRng(7));
  const b = shuffle(input, seededRng(7));
  assert.deepEqual(a, b);
  assert.deepEqual(input, [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.deepEqual([...a].sort(), input);
});

test("ensureShoe reshuffles below 25% (78 cards) and keeps the shoe otherwise", () => {
  assert.equal(RESHUFFLE_BELOW, 78);
  const rng = seededRng();
  assert.equal(ensureShoe(null, rng).length, 312);
  const full = createShoe(SHOE_DECKS, rng);
  const at = full.slice(0, 78);
  assert.equal(ensureShoe(at, rng), at);
  assert.equal(ensureShoe(full.slice(0, 77), rng).length, 312);
});

// Hand values

test("handValue: hard and soft totals", () => {
  assert.deepEqual(handValue(cards("10", "7")), { total: 17, soft: false });
  assert.deepEqual(handValue(cards("A", "6")), { total: 17, soft: true });
  assert.deepEqual(handValue(cards("A", "6", "10")), {
    total: 17,
    soft: false,
  });
  assert.deepEqual(handValue(cards("K", "Q")), { total: 20, soft: false });
  assert.deepEqual(handValue(cards("A", "K")), { total: 21, soft: true });
});

test("handValue: multiple aces", () => {
  assert.deepEqual(handValue(cards("A", "A")), { total: 12, soft: true });
  assert.deepEqual(handValue(cards("A", "A", "9")), { total: 21, soft: true });
  assert.deepEqual(handValue(cards("A", "A", "A", "A")), {
    total: 14,
    soft: true,
  });
  assert.deepEqual(handValue(cards("A", "A", "K")), { total: 12, soft: false });
  assert.deepEqual(handValue(cards("A", "A", "K", "K")), {
    total: 22,
    soft: false,
  });
});

// Dealing and peek

test("deal order: each player, dealer up, each player, dealer hole", () => {
  const round = dealRound(cards("2", "3", "4", "5", "6", "7", "8"), [
    { seat: 4, userId: "b", bet: 10 },
    { seat: 1, userId: "a", bet: 10 },
  ]);
  assert.deepEqual(
    round.players.map((p) => [p.seat, p.hands[0].cards.map((x) => x.rank)]),
    [
      [1, ["2", "5"]],
      [4, ["3", "6"]],
    ],
  );
  assert.deepEqual(
    round.dealer.map((x) => x.rank),
    ["4", "7"],
  );
  assert.deepEqual(
    round.shoe.map((x) => x.rank),
    ["8"],
  );
  assert.deepEqual(round.turn, { seat: 1, hand: 0 });
});

test("dealer peeks on an ace up card and ends the round on blackjack", () => {
  const round = deal1("10", "A", "8", "K");
  assert.equal(round.phase, "settled");
  assert.equal(round.holeRevealed, true);
  assert.equal(round.players[0].hands[0].outcome, "lose");
  assert.deepEqual(roundResults(round), [
    { seat: 0, userId: "u0", wagered: 10, payout: 0, net: -10 },
  ]);
});

test("dealer peeks on a 10-value up card and ends the round on blackjack", () => {
  const round = deal1("10", "Q", "8", "A");
  assert.equal(round.phase, "settled");
  assert.equal(round.players[0].hands[0].outcome, "lose");
});

test("peek without dealer blackjack keeps the hole card hidden", () => {
  const round = deal1("10", "A", "8", "7");
  assert.equal(round.phase, "players");
  assert.equal(round.holeRevealed, false);
  assert.deepEqual(dealerView(round), {
    cards: [c("A"), null],
    total: 11,
  });
});

test("no peek on other up cards; dealer blackjack impossible", () => {
  const round = deal1("10", "9", "8", "A");
  assert.equal(round.phase, "players");
  assert.equal(round.holeRevealed, false);
});

test("player blackjack vs dealer blackjack pushes", () => {
  const round = deal1("A", "A", "K", "Q");
  assert.equal(round.phase, "settled");
  assert.equal(round.players[0].hands[0].outcome, "push");
  assert.equal(roundResults(round)[0].net, 0);
});

test("player blackjack pays 3:2, floored on odd bets", () => {
  assert.equal(blackjackPayout(10), 25);
  assert.equal(blackjackPayout(15), 37);
  assert.equal(blackjackPayout(25), 62);
  const round = deal1("A", "9", "K", "7", [], 15);
  const hand = round.players[0].hands[0];
  assert.equal(hand.outcome, "blackjack");
  assert.equal(hand.payout, 37);
  // Lone blackjack: dealer reveals but does not draw.
  assert.equal(round.phase, "dealer");
  assert.equal(round.holeRevealed, true);
  assert.equal(dealerShouldDraw(round), false);
  const settled = settle(round);
  assert.deepEqual(roundResults(settled)[0], {
    seat: 0,
    userId: "u0",
    wagered: 15,
    payout: 37,
    net: 22,
  });
});

// Player actions

test("hit and stand; turn moves in seat order", () => {
  let round = dealRound(cards("10", "5", "9", "6", "7", "8", "4"), [
    { seat: 2, userId: "a", bet: 10 },
    { seat: 5, userId: "b", bet: 10 },
  ]);
  // a: 10+6=16, b: 5+7=12, dealer 9 up, 8 hole
  assert.deepEqual(round.turn, { seat: 2, hand: 0 });
  assert.deepEqual(legalActions(round, 5), []);
  assert.throws(() => applyAction(round, 5, "hit"));
  round = applyAction(round, 2, "stand").round;
  assert.deepEqual(round.turn, { seat: 5, hand: 0 });
  round = applyAction(round, 5, "hit").round; // 12+4=16
  assert.equal(round.players[1].hands[0].cards.length, 3);
});

test("bust ends the hand with payout 0", () => {
  let round = deal1("10", "9", "6", "8", ["K"]);
  round = applyAction(round, 0, "hit").round;
  const hand = round.players[0].hands[0];
  assert.equal(hand.outcome, "bust");
  assert.equal(hand.payout, 0);
  assert.equal(round.phase, "dealer");
});

test("reaching 21 is automatically done", () => {
  let round = deal1("10", "9", "6", "8", ["5"]);
  round = applyAction(round, 0, "hit").round;
  const hand = round.players[0].hands[0];
  assert.equal(hand.done, true);
  assert.equal(hand.outcome, null);
  assert.equal(round.phase, "dealer");
});

test("double takes exactly one card, doubles the bet, and ends the hand", () => {
  let round = deal1("6", "9", "5", "8", ["2", "K"]);
  assert.deepEqual(legalActions(round, 0), ["hit", "stand", "double"]);
  const res = applyAction(round, 0, "double");
  assert.equal(res.wagered, 10);
  const hand = res.round.players[0].hands[0];
  assert.equal(hand.bet, 20);
  assert.equal(hand.doubled, true);
  assert.equal(hand.cards.length, 3);
  assert.equal(hand.done, true);
  assert.equal(res.round.phase, "dealer");
  // dealer 17 vs player 13 → lose 20
  const settled = playDealer(res.round);
  assert.equal(roundResults(settled)[0].net, -20);
});

test("double is not offered after a hit", () => {
  let round = deal1("2", "9", "3", "8", ["2"]);
  round = applyAction(round, 0, "hit").round;
  assert.deepEqual(legalActions(round, 0), ["hit", "stand"]);
});

test("double and split are offered on a pair's first two cards", () => {
  const round = deal1("8", "9", "8", "7");
  assert.deepEqual(legalActions(round, 0), ["hit", "stand", "double", "split"]);
});

test("split on equal value (K+Q) makes two hands; double allowed after split", () => {
  let round = deal1("K", "9", "Q", "8", ["A", "2", "9"]);
  const res = applyAction(round, 0, "split");
  assert.equal(res.wagered, 10);
  round = res.round;
  const [h1, h2] = round.players[0].hands;
  assert.deepEqual(
    h1.cards.map((x) => x.rank),
    ["K", "A"],
  );
  assert.deepEqual(
    h2.cards.map((x) => x.rank),
    ["Q", "2"],
  );
  assert.equal(h1.fromSplit && h2.fromSplit, true);
  // 21 on a split hand is done but not a blackjack.
  assert.equal(h1.done, true);
  assert.equal(h1.outcome, null);
  assert.deepEqual(round.turn, { seat: 0, hand: 1 });
  assert.deepEqual(legalActions(round, 0), ["hit", "stand", "double"]);
  round = applyAction(round, 0, "double").round; // Q+2+9=21
  const settled = playDealer(round); // dealer 17
  const [s1, s2] = settled.players[0].hands;
  assert.equal(s1.outcome, "win");
  assert.equal(s1.payout, 20);
  assert.equal(s2.outcome, "win");
  assert.equal(s2.payout, 40);
  assert.deepEqual(roundResults(settled)[0], {
    seat: 0,
    userId: "u0",
    wagered: 30,
    payout: 60,
    net: 30,
  });
});

test("resplit puts the new pair in place of the hand being played", () => {
  let round = deal1("8", "9", "8", "7", ["8", "5", "2", "3"]);
  round = applyAction(round, 0, "split").round;
  assert.deepEqual(legalActions(round, 0), ["hit", "stand", "double", "split"]);
  const res = applyAction(round, 0, "split");
  assert.equal(res.wagered, 10);
  round = res.round;
  const ranks = round.players[0].hands.map((h) => h.cards.map((x) => x.rank));
  assert.deepEqual(ranks, [
    ["8", "2"],
    ["8", "3"],
    ["8", "5"],
  ]);
  assert.deepEqual(round.turn, { seat: 0, hand: 0 });
});

test("resplit stops at four hands", () => {
  let round = deal1("8", "9", "8", "7", ["8", "8", "8", "2", "3", "4"]);
  for (let i = 0; i < 3; i++) round = applyAction(round, 0, "split").round;
  assert.equal(round.players[0].hands.length, 4);
  for (let i = 0; i < 3; i++) round = applyAction(round, 0, "stand").round;
  // The last hand is 8+8, but four hands is the limit.
  assert.deepEqual(
    round.players[0].hands[round.turn.hand].cards.map((x) => x.rank),
    ["8", "8"],
  );
  assert.deepEqual(legalActions(round, 0), ["hit", "stand", "double"]);
});

test("split aces get one card each and are done", () => {
  let round = deal1("A", "9", "A", "7", ["K", "5"]);
  round = applyAction(round, 0, "split").round;
  const [h1, h2] = round.players[0].hands;
  assert.equal(h1.cards.length, 2);
  assert.equal(h2.cards.length, 2);
  assert.equal(h1.done && h2.done, true);
  assert.equal(h1.outcome, null);
  assert.equal(round.phase, "dealer");
});

test("split ace 21 pays 1:1, not 3:2", () => {
  let round = deal1("A", "9", "A", "8", ["K", "5"]);
  round = applyAction(round, 0, "split").round;
  const settled = playDealer(round); // dealer 17, stands
  const [h1, h2] = settled.players[0].hands;
  assert.equal(h1.outcome, "win");
  assert.equal(h1.payout, 20);
  assert.equal(h2.outcome, "lose"); // A+5=16
});

test("standSeat stands all unfinished hands and advances the turn", () => {
  let round = dealRound(cards("8", "5", "9", "8", "7", "6", "2", "3"), [
    { seat: 0, userId: "a", bet: 10 },
    { seat: 1, userId: "b", bet: 10 },
  ]);
  round = applyAction(round, 0, "split").round;
  assert.deepEqual(round.turn, { seat: 0, hand: 0 });
  round = standSeat(round, 0);
  assert.equal(
    round.players[0].hands.every((h) => h.done),
    true,
  );
  assert.deepEqual(round.turn, { seat: 1, hand: 0 });
  // Standing a seat that isn't on turn just marks it done.
  round = standSeat(round, 1);
  assert.equal(round.phase, "dealer");
});

// Dealer play

test("dealer stands on soft 17", () => {
  let round = deal1("10", "A", "8", "6");
  round = applyAction(round, 0, "stand").round;
  assert.equal(dealerShouldDraw(round), false);
  const settled = settle(round);
  assert.equal(settled.players[0].hands[0].outcome, "win");
});

test("dealer draws to 16 and on soft 16, one card at a time", () => {
  let round = deal1("10", "A", "8", "5", ["A", "4"]);
  round = applyAction(round, 0, "stand").round;
  assert.equal(dealerShouldDraw(round), true); // soft 16
  assert.throws(() => settle(round));
  round = dealerDraw(round); // A+5+A = soft 17
  assert.equal(round.dealer.length, 3);
  assert.equal(dealerShouldDraw(round), false);
  assert.throws(() => dealerDraw(round));
  const settled = settle(round);
  assert.equal(settled.players[0].hands[0].outcome, "win");
});

test("dealer stands on hard 17 and busts over 21", () => {
  let round = deal1("10", "10", "8", "6", ["K"]);
  round = applyAction(round, 0, "stand").round;
  round = dealerDraw(round);
  assert.equal(dealerShouldDraw(round), false);
  const settled = settle(round);
  assert.equal(settled.players[0].hands[0].outcome, "win");
  assert.equal(settled.players[0].hands[0].payout, 20);
});

test("push on equal totals, lose on lower", () => {
  let round = deal1("10", "10", "8", "8");
  round = applyAction(round, 0, "stand").round;
  assert.equal(settle(round).players[0].hands[0].outcome, "push");

  round = deal1("10", "10", "7", "8");
  round = applyAction(round, 0, "stand").round;
  assert.equal(settle(round).players[0].hands[0].outcome, "lose");
});

test("dealer does not draw when every player hand busted", () => {
  let round = deal1("10", "6", "6", "5", ["K"]);
  round = applyAction(round, 0, "hit").round;
  assert.equal(round.phase, "dealer");
  assert.equal(round.holeRevealed, true);
  assert.equal(dealerShouldDraw(round), false); // dealer 11
  const settled = settle(round);
  assert.equal(settled.dealer.length, 2);
  assert.equal(roundResults(settled)[0].net, -10);
});

test("dealerView reveals the hole card once revealed", () => {
  let round = deal1("10", "9", "8", "7");
  assert.deepEqual(dealerView(round), { cards: [c("9"), null], total: 9 });
  round = applyAction(round, 0, "stand").round;
  assert.deepEqual(dealerView(round), {
    cards: [c("9"), c("7")],
    total: 16,
  });
});

test("dealRound rejects empty, duplicate seats, and bad bets", () => {
  const shoe = createShoe(1, seededRng());
  assert.throws(() => dealRound(shoe, []));
  assert.throws(() =>
    dealRound(shoe, [
      { seat: 1, userId: "a", bet: 10 },
      { seat: 1, userId: "b", bet: 10 },
    ]),
  );
  assert.throws(() => dealRound(shoe, [{ seat: 0, userId: "a", bet: 0 }]));
});

test("engine functions do not mutate their input", () => {
  const shoe = cards("8", "9", "8", "7", "3", "4");
  const snapshot = JSON.stringify(shoe);
  const round = dealRound(shoe, [{ seat: 0, userId: "u0", bet: 10 }]);
  assert.equal(JSON.stringify(shoe), snapshot);
  const before = JSON.stringify(round);
  applyAction(round, 0, "split");
  standSeat(round, 0);
  assert.equal(JSON.stringify(round), before);
});
