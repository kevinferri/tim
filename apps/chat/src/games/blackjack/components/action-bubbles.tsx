"use client";

import { useEffect, useRef, useState } from "react";
import type { BlackjackTableView } from "@tim/casino";
import { playDoubleSound, playStandSound } from "@/games/casino";

// How long each bubble shows (its animation stretches to match). A hit is quick: its card says the rest.
const BUBBLE_MS = 1500;
const HIT_BUBBLE_MS = 1100;
// A move that busts: gone as its card lands and the Bust badge takes over (the card waits a beat, then flies).
const SHORT_BUBBLE_MS = 820;

type Bubble = { text: string; id: number; ms: number };

/**
 * A player's move, read from what changed between two updates: a hit (a new card, the same hand
 * count), a double, or a stand (the turn moves on without a new card, which a timeout does too).
 * A split already shows itself as the hand splitting.
 */
function actionBetween(prev: BlackjackTableView, next: BlackjackTableView) {
  if (prev.phase !== "players" || !prev.turn) return null;
  const { seat, hand } = prev.turn;
  const before = prev.seats[seat]?.hands[hand];
  const after = next.seats[seat]?.hands[hand];
  if (!before || !after) return null;
  // A move that busts still says so, briefly: hit, the card, then the Bust badge in its place.
  const busted = after.outcome === "bust";
  if (after.doubled && !before.doubled)
    return { seat, text: "Double", ms: busted ? SHORT_BUBBLE_MS : BUBBLE_MS };
  const sameHands =
    next.seats[seat]?.hands.length === prev.seats[seat]?.hands.length;
  if (sameHands && after.cards.length > before.cards.length)
    return { seat, text: "Hit", ms: busted ? SHORT_BUBBLE_MS : HIT_BUBBLE_MS };
  const stillPlaying =
    next.phase === "players" &&
    next.turn?.seat === seat &&
    next.turn.hand === hand;
  const sameCards = sameHands && after.cards.length === before.cards.length;
  // Only into the next player or the dealer, not a round cut short.
  const onward = next.phase === "players" || next.phase === "dealer";
  if (!stillPlaying && sameCards && onward)
    return { seat, text: "Stand", ms: BUBBLE_MS };
  return null;
}

/** Each seat's latest action bubble, shown briefly and live only (not on a page load). */
export function useActionBubbles(
  view: BlackjackTableView | null,
  live: boolean,
  mySeat: number | null,
) {
  const prev = useRef(view);
  const next = useRef(0);
  const [bubbles, setBubbles] = useState<Map<number, Bubble>>(new Map());
  // Outside the effect's cleanup, which the very next update would run, cancelling the removal.
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    const before = prev.current;
    prev.current = view;
    if (!live || !before || !view) return;
    const action = actionBetween(before, view);
    if (!action) return;
    // Your stand gets a sound too, as a hit already has its card's; other players' stay quiet.
    if (action.text === "Stand" && action.seat === mySeat) playStandSound(true);
    if (action.text === "Double") playDoubleSound(action.seat === mySeat);
    const bubble = { text: action.text, id: ++next.current, ms: action.ms };
    setBubbles((b) => new Map(b).set(action.seat, bubble));
    const timer = setTimeout(
      () =>
        setBubbles((b) => {
          if (b.get(action.seat)?.id !== bubble.id) return b;
          const rest = new Map(b);
          rest.delete(action.seat);
          return rest;
        }),
      action.ms,
    );
    timers.current.push(timer);
    // Once per update; your seat only matters when an action comes in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, live]);

  return bubbles;
}

/** A small speech bubble in the table's printed lettering, with a tail pointing down at the avatar. */
export function ActionBubble({ text, ms }: { text: string; ms: number }) {
  return (
    <div
      className="flex animate-action-bubble flex-col items-center motion-reduce:animate-none"
      style={{ animationDuration: `${ms}ms` }}
    >
      <span className="flex whitespace-nowrap rounded-full bg-black/85 px-3.5 py-2 text-[13px] font-semibold uppercase tracking-[0.18em] text-white/90 shadow-lg ring-1 ring-white/15 [text-shadow:0_0_6px_rgba(255,255,255,0.2)]">
        {/* Trimmed to the capitals' height and without the spacing after the last letter, so the padding
            is the same on all four sides and the word sits dead center. */}
        <span className="-mr-[0.18em] leading-none [text-box:trim-both_cap_alphabetic]">
          {text}
        </span>
      </span>
      <span
        aria-hidden
        className="-mt-px size-0 border-x-[6px] border-t-[7px] border-x-transparent border-t-black/85"
      />
    </div>
  );
}
