"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { RESULTS_MS, type BlackjackTableView } from "@tim/casino";
import { ChipStack, breakdown, playTableSound } from "@/games/casino";
import { TALLY_MAX_MS } from "./your-result";

// The dealer settles one seat at a time from first base, like a real table.
const SEAT_STAGGER_MS = 340;
const SWEEP_MS = 800;
const PAY_MS = 650;
// The winnings sit on the bet a moment before the whole stack goes to the player.
const PAY_HOLD_MS = 350;
const COLLECT_MS = 800;
// The last seat must start early enough for its chips, and your count-up, to finish within the results phase.
const LAST_SEAT_START_MS =
  RESULTS_MS -
  Math.max(PAY_MS + PAY_HOLD_MS + COLLECT_MS, PAY_MS + TALLY_MAX_MS) -
  150;
// A bust is taken just after the busting card lands (a hit waits a beat before it flies; see HIT_PAUSE_MS).
const BUST_SWEEP_DELAY_MS = 910;
// A natural is paid a beat after its second card lands, once its 21 has slammed in.
const NATURAL_PAUSE_MS = 650;
const EASING = "cubic-bezier(0.2, 0.7, 0.3, 1)";
const CHIP_PX = 36;

const handKey = (seat: number, hand: number) => `${seat}:${hand}`;
const betSelector = (seat: number, hand: number) =>
  `[data-bet-seat="${seat}"] [data-bet-stack="${hand}"]`;
const RACK = "[data-chip-rack]";
const avatarSelector = (seat: number) => `[data-rail-seat="${seat}"]`;

type Flight = {
  id: string;
  amount: number;
  from: string;
  to: string;
  ms: number;
  /** Fades out as it lands (into the rack or the player); otherwise it stays where it lands. */
  vanish: boolean;
  /** Your chips, which sound louder than other players'. */
  mine: boolean;
  /** Lands beside (or leaves from beside) the bet rather than on it: where the dealer sets a payout down. */
  toBeside?: boolean;
  fromBeside?: boolean;
  /** No sound, for a stack moving alongside another that already makes it. */
  silent?: boolean;
};

// Gap between a bet and the payout set beside it.
const BESIDE_GAP_PX = 4;

/** The center of `sel`, or with `beside`, of a stack set next to it on the outer side (clearing a split's other bet). */
function centerOf(sel: string, beside = false) {
  const el = document.querySelector(sel);
  const r = el?.getBoundingClientRect();
  if (!r) return null;
  const y = r.top + r.height / 2;
  const x = r.left + r.width / 2;
  if (!beside) return { x, y };
  const spot = el!.closest("[data-bet-seat]")?.getBoundingClientRect();
  const left = !!spot && x < spot.left + spot.width / 2 - 1;
  const reach = r.width / 2 + BESIDE_GAP_PX + CHIP_PX / 2;
  return { x: left ? x - reach : x + reach, y };
}

/** A copy of a chip stack flying between two elements on the table, found by selector when it starts. */
function FlyingStack({
  flight,
  onDone,
}: {
  flight: Flight;
  onDone: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);

  useLayoutEffect(() => {
    const from = centerOf(flight.from, flight.fromBeside);
    const to = centerOf(flight.to, flight.toBeside);
    if (!from || !to) return;
    setAt(to);
    const el = ref.current;
    if (!el) return;
    const dx = from.x - to.x;
    const dy = from.y - to.y;
    const anim = el.animate(
      flight.vanish
        ? // Solid the whole way, like real chips; they only fade as they drop into the rack or the seat.
          [
            { transform: `translate(${dx}px, ${dy}px)`, opacity: 1 },
            { transform: "none", opacity: 1, offset: 0.9 },
            { transform: "scale(0.92)", opacity: 0 },
          ]
        : [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }],
      { duration: flight.ms, easing: EASING, fill: "forwards" },
    );
    if (flight.vanish) anim.onfinish = () => onDone(flight.id);
    // The dealer's grab as they lift off, then the clatter as they land; timeouts, so dev's double
    // mount cancels the extra ones.
    const volume = flight.mine ? 0.55 : 0.22;
    const sound = (play: () => void, ms = 0) =>
      flight.silent ? undefined : setTimeout(play, ms);
    const grab = sound(() => playTableSound("chipsHandle", { volume }));
    const land = sound(
      () =>
        playTableSound(flight.vanish ? "chipsCollide" : "chipsStack", {
          volume,
        }),
      flight.ms * 0.85,
    );
    return () => {
      clearTimeout(grab);
      clearTimeout(land);
      anim.cancel();
    };
    // Once per flight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flight]);

  return (
    <div
      ref={ref}
      className="pointer-events-none fixed z-50"
      style={{
        left: (at?.x ?? 0) - CHIP_PX / 2,
        top: (at?.y ?? 0) - CHIP_PX / 2,
        visibility: at ? undefined : "hidden",
      }}
    >
      <ChipStack
        amount={flight.amount}
        chips={breakdown(flight.amount)}
        still
      />
    </div>
  );
}

const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Moves the chips as bets settle: busts and naturals as they happen, everyone else at the end. Live only. */
export function useSettlement(
  view: BlackjackTableView | null,
  live: boolean,
  mySeat: number | null,
  /** When a seat's opening two cards have landed, in ms from the deal. */
  dealtInMs: (seat: number) => number,
) {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [moved, setMoved] = useState<Set<string>>(new Set());
  // Mirrors `moved` for the scheduling effects, which read it without re-running.
  const movedRef = useRef<Set<string>>(new Set());
  const outcomes = useRef(new Map<string, string | null>());
  const bustTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [settledSeats, setSettledSeats] = useState<Set<number> | "all">("all");
  const [stampedSeats, setStampedSeats] = useState<Set<number> | "all">("all");
  // Naturals paid during play: when their winnings reached the bet, and when they reached the seat.
  const [naturalStamped, setNaturalStamped] = useState<Set<number>>(new Set());
  const [naturalPaid, setNaturalPaid] = useState<Set<number>>(new Set());
  const [naturalClaimed, setNaturalClaimed] = useState<Set<number>>(new Set());
  // Busts whose sweep is scheduled but hasn't taken the chips yet.
  const [sweeping, setSweeping] = useState<Set<string>>(new Set());
  const viewPhase = useRef(view?.phase);
  const dealtLive = useRef(false);
  const claimed = useRef(new Set<string>());
  const prevPhase = useRef(view?.phase);
  const removeFlight = (id: string) =>
    setFlights((fs) => fs.filter((f) => f.id !== id));
  const phase = view?.phase;
  const fly = (f: Flight) => setFlights((fs) => [...fs, f]);
  const move = (key: string) => {
    movedRef.current = new Set(movedRef.current).add(key);
    setMoved(movedRef.current);
    setSweeping((s) => {
      if (!s.has(key)) return s;
      const next = new Set(s);
      next.delete(key);
      return next;
    });
  };
  const land = (id: string) =>
    setFlights((fs) => fs.filter((f) => f.id !== id));
  /** Pays a hand from the rack onto its bet, then to the player; returns when each lands. */
  const payOut = (
    at: (ms: number, fn: () => void) => void,
    start: number,
    seat: number,
    h: number,
    hand: { bet: number; payout: number | null },
  ) => {
    const key = handKey(seat, h);
    const bet = betSelector(seat, h);
    const pay = `${key}:pay`;
    at(start, () =>
      fly({
        id: pay,
        amount: (hand.payout ?? 0) - hand.bet,
        from: RACK,
        to: bet,
        toBeside: true,
        ms: PAY_MS,
        vanish: false,
        mine: seat === mySeat,
      }),
    );
    const collect = start + PAY_MS + PAY_HOLD_MS;
    at(collect, () => {
      // The bet and the payout beside it go to the player together.
      land(pay);
      move(key);
      fly({
        id: `${key}:collect`,
        amount: hand.bet,
        from: bet,
        to: avatarSelector(seat),
        ms: COLLECT_MS,
        vanish: true,
        mine: seat === mySeat,
      });
      fly({
        id: `${key}:collect-pay`,
        amount: (hand.payout ?? 0) - hand.bet,
        from: bet,
        fromBeside: true,
        to: avatarSelector(seat),
        ms: COLLECT_MS,
        vanish: true,
        mine: seat === mySeat,
        silent: true,
      });
    });
    return { stamped: start + PAY_MS, shown: collect + COLLECT_MS * 0.7 };
  };

  // Sweep a bust as it happens, like a dealer taking the chips before moving on.
  useLayoutEffect(() => {
    if (!view) return;
    // Seen dealt here (not joined mid-round), so its naturals get paid on the spot.
    const was = viewPhase.current;
    viewPhase.current = view.phase;
    if (view.phase === "betting" || view.phase === "waiting")
      dealtLive.current = false;
    else if (was === "betting") dealtLive.current = true;
    const at = (ms: number, fn: () => void) =>
      bustTimers.current.push(setTimeout(fn, ms));
    const seen = outcomes.current;
    for (const seat of view.seats) {
      seat?.hands.forEach((hand, h) => {
        const key = handKey(seat.seat, h);
        const was = seen.get(key);
        seen.set(key, hand.outcome);
        // A natural, paid just after its cards land and its 21 sounds; the end of the hand may beat it to it.
        if (
          live &&
          dealtLive.current &&
          was === undefined &&
          hand.outcome === "blackjack" &&
          view.phase !== "results" &&
          !reducedMotion()
        ) {
          // Claimed now, so the end of the hand leaves it to this payout even if it comes first.
          claimed.current.add(key);
          setNaturalClaimed((s) => new Set(s).add(seat.seat));
          const start = dealtInMs(seat.seat) + NATURAL_PAUSE_MS;
          const { stamped, shown } = payOut(at, start, seat.seat, h, hand);
          at(stamped, () =>
            setNaturalStamped((s) => new Set(s).add(seat.seat)),
          );
          at(shown, () => setNaturalPaid((s) => new Set(s).add(seat.seat)));
          return;
        }
        // Any phase: when the last player to act busts, the round has already moved on to the dealer
        // (or results) by the time this view arrives, and the bust must still wait for its card.
        if (
          !live ||
          hand.outcome !== "bust" ||
          was === undefined ||
          was === "bust" ||
          movedRef.current.has(key) ||
          reducedMotion()
        )
          return;
        // Claimed, so the end of the hand leaves this sweep to its timer instead of taking the chips at once.
        claimed.current.add(key);
        setSweeping((s) => new Set(s).add(key));
        bustTimers.current.push(
          setTimeout(() => {
            // Results may have swept it already.
            if (movedRef.current.has(key)) return;
            move(key);
            fly({
              id: `${key}:sweep`,
              amount: hand.bet,
              from: betSelector(seat.seat, h),
              to: RACK,
              ms: SWEEP_MS,
              vanish: true,
              mine: seat.seat === mySeat,
            });
          }, BUST_SWEEP_DELAY_MS),
        );
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);
  useLayoutEffect(() => () => bustTimers.current.forEach(clearTimeout), []);

  // Before paint, so results never flash in ahead of their chips.
  useLayoutEffect(() => {
    const prev = prevPhase.current;
    prevPhase.current = phase;
    if (phase === "betting" || phase === "waiting") {
      // A new round: everything from the last one is cleared off the table.
      bustTimers.current.forEach(clearTimeout);
      bustTimers.current = [];
      outcomes.current = new Map();
      claimed.current = new Set();
      movedRef.current = new Set();
      setFlights([]);
      setMoved(movedRef.current);
      setNaturalStamped(new Set());
      setNaturalPaid(new Set());
      setNaturalClaimed(new Set());
      setSweeping(new Set());
    }
    if (phase !== "results") {
      setSettledSeats("all");
      setStampedSeats("all");
      return;
    }
    if (!view || !live || !prev || prev === "results" || reducedMotion())
      return;

    setSettledSeats(new Set());
    setStampedSeats(new Set());
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
    const add = (seat: number) => (s: Set<number> | "all") =>
      s === "all" ? s : new Set(s).add(seat);
    const settle = (seat: number) => setSettledSeats(add(seat));
    const stamp = (seat: number) => setStampedSeats(add(seat));

    // Seats with chips still to settle take turns; one whose bets were all swept at its bust settles at once.
    const pending = (
      seat: number,
      hand: { payout: number | null; bet: number },
      h: number,
    ) =>
      !movedRef.current.has(handKey(seat, h)) &&
      !claimed.current.has(handKey(seat, h)) &&
      (hand.payout ?? 0) !== hand.bet;
    const isBusy = (seat: (typeof view.seats)[number]) =>
      !!seat?.inRound &&
      seat.hands.some((hand, h) => pending(seat.seat, hand, h));
    // Tighter with more seats to settle, so the last one still finishes in time.
    const busyCount = view.seats.filter(isBusy).length;
    const stagger =
      busyCount > 1
        ? Math.min(SEAT_STAGGER_MS, LAST_SEAT_START_MS / (busyCount - 1))
        : SEAT_STAGGER_MS;
    let k = 0;
    for (const seat of view.seats) {
      if (!seat?.inRound || !seat.hands.length) continue;
      const busy = isBusy(seat);
      const start = busy ? k++ * stagger : 0;
      let shown = start;
      // A win stamps as its winnings land on the bet; anything else as the dealer reaches the seat.
      let stamped = start;
      seat.hands.forEach((hand, h) => {
        const key = handKey(seat.seat, h);
        if (!pending(seat.seat, hand, h)) return;
        const bet = betSelector(seat.seat, h);
        const net = (hand.payout ?? 0) - hand.bet;
        if (net < 0) {
          at(start, () => {
            move(key);
            fly({
              id: `${key}:sweep`,
              amount: hand.bet,
              from: bet,
              to: RACK,
              ms: SWEEP_MS,
              vanish: true,
              mine: seat.seat === mySeat,
            });
          });
        } else if (net > 0) {
          const paid = payOut(at, start, seat.seat, h, hand);
          shown = Math.max(shown, paid.shown);
          stamped = Math.max(stamped, paid.stamped);
        }
      });
      at(stamped, () => stamp(seat.seat));
      at(shown, () => settle(seat.seat));
    }
    return () => timers.forEach(clearTimeout);
    // Once per results phase.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const layer =
    flights.length > 0 && typeof document !== "undefined"
      ? createPortal(
          flights.map((f) => (
            <FlyingStack key={f.id} flight={f} onDone={removeFlight} />
          )),
          document.body,
        )
      : null;

  return {
    /** The dealer slides `amount` from the rack to a seat, e.g. refilling a player who went broke. */
    give: (seat: number, amount: number) => {
      if (amount <= 0 || reducedMotion()) return;
      fly({
        id: `give:${seat}:${performance.now()}`,
        amount,
        from: RACK,
        to: avatarSelector(seat),
        ms: COLLECT_MS,
        vanish: true,
        mine: seat === mySeat,
      });
    },
    /** This hand's chips have left its bet circle. */
    isMoved: (seat: number, hand: number) => moved.has(handKey(seat, hand)),
    /** This hand busted and its chips are about to be swept. */
    isSweeping: (seat: number, hand: number) =>
      sweeping.has(handKey(seat, hand)),
    /** The results are playing out live, seat by seat (not on a load, reconnect, or with reduced motion). */
    animatingResults: stampedSeats !== "all",
    /** This seat's hands can show their win/loss stamps; a natural paid during play waits for its payout. */
    isStamped: (seat: number) =>
      (stampedSeats === "all" || stampedSeats.has(seat)) &&
      (!naturalClaimed.has(seat) || naturalStamped.has(seat)),
    /** This seat's natural blackjack was paid during play: its winnings reached the bet (`stamped`), then the seat (`paid`). */
    natural: (seat: number) => ({
      stamped: naturalStamped.has(seat),
      paid: naturalPaid.has(seat),
    }),
    /** This seat's result can show (its chips have been swept or paid). */
    isSettled: (seat: number) =>
      (settledSeats === "all" || settledSeats.has(seat)) &&
      (!naturalClaimed.has(seat) || naturalPaid.has(seat)),
    layer,
  };
}
