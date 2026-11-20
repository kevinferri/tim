import { useEffect, useRef, useState } from "react";
import type { BlackjackHandView, BlackjackOutcome, Card } from "@tim/casino";
import {
  CARD_PX,
  DEAL_EASING,
  DEAL_MS,
  cardBox,
  playBustSound,
  playTwentyOne,
  PlayingCard,
  cardOverlap,
  useDealingLive,
  type CardSize,
} from "@/games/casino";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Solid so the cards never show through; color says how it went (see the casino table colors).
const WIN =
  "border-emerald-300/70 bg-neutral-900 text-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.3)]";
const GOLD =
  "border-amber-300/80 bg-neutral-900 text-amber-300 shadow-[0_0_12px_rgba(252,211,77,0.35)]";
const LOSE = "border-rose-300/20 bg-neutral-900 text-rose-200/80 shadow-none";
const PUSH = "border-white/20 bg-slate-800 text-slate-100";

const OUTCOME: Record<
  BlackjackOutcome,
  { label: (net: number) => string; tone: string; fade?: boolean }
> = {
  blackjack: { label: () => "Blackjack", tone: GOLD },
  // The amount shows on the avatar, not here.
  win: { label: () => "Win", tone: WIN },
  push: { label: () => "Push", tone: PUSH },
  lose: { label: () => "Lose", tone: LOSE, fade: true },
  bust: { label: () => "Bust", tone: LOSE, fade: true },
};

type DealProps = {
  /** Per-card hold before it flies from the shoe (the opening deal's order). */
  dealDelayMs?: (cardIndex: number) => number;
  /** Key cards by value so one replaced at the same index (after a split) mounts and flies. The dealer keeps index keys so the hole card flips in place. */
  keyByCard?: boolean;
  /** Dim the cards while staying opaque (see PlayingCard's `shaded`). */
  shaded?: boolean;
};

export function Cards({
  cards,
  size = "sm",
  dealDelayMs,
  keyByCard,
  shaded,
}: {
  cards: (Card | null)[];
  size?: CardSize;
} & DealProps) {
  return (
    <div className="flex">
      {cards.map((card, i) => (
        // Overlap with margin, not transform: the deal animation owns `transform`.
        <PlayingCard
          key={keyByCard && card ? `${i}-${card.rank}-${card.suit}` : i}
          card={card}
          size={size}
          className={cn(
            i > 0 && cardOverlap(size),
            // The dealer's face-down hole card is tucked under the up card, until it flips.
            cards[i + 1] === null && "relative z-10",
          )}
          dealDelayMs={dealDelayMs?.(i)}
          shaded={shaded}
        />
      ))}
    </div>
  );
}

// Scales with the cards; xl is the default text-sm.
const TOTAL_TEXT: Partial<Record<CardSize, string>> = {
  md: "text-xs",
  lg: "text-xs",
  "2xl": "text-base",
  "3xl": "text-base",
};

export function Total({
  total,
  soft,
  size = "xl",
  celebrate,
}: {
  total: number;
  soft?: boolean;
  size?: CardSize;
  /** A player's 21: in gold, slammed in as it lands. */
  celebrate?: boolean;
}) {
  const hit21 = celebrate && total === 21;
  return (
    <span
      // Remounts on reaching 21, so the slam plays then.
      key={hit21 ? "21" : "total"}
      className={cn(
        "inline-block rounded-full bg-black/80 px-2 py-0.5 font-medium tabular-nums text-white shadow ring-1 ring-white/20",
        TOTAL_TEXT[size] ?? "text-sm",
        hit21 &&
          "animate-total-slam font-semibold text-amber-300 ring-amber-300/50 [text-shadow:0_0_6px_rgba(252,211,77,0.5)] motion-reduce:animate-none",
      )}
    >
      {soft && total < 21 ? `${total - 10}/${total}` : total}
    </span>
  );
}

/** Cards with their total pinned to the top-right corner. */
export function ScoredCards({
  cards,
  total,
  soft,
  size = "sm",
  celebrate,
  ...deal
}: {
  cards: (Card | null)[];
  total: number | null;
  soft?: boolean;
  size?: CardSize;
  /** See Total's `celebrate`. */
  celebrate?: boolean;
} & DealProps) {
  return (
    <div className="relative">
      <Cards cards={cards} size={size} {...deal} />
      {total !== null && (
        <div className="absolute -right-3.5 -top-2.5">
          <Total total={total} soft={soft} size={size} celebrate={celebrate} />
        </div>
      )}
    </div>
  );
}

type Props = {
  /** null before the deal: an outline where the cards will land. */
  hand: BlackjackHandView | null;
  size?: CardSize;
  /** The hand being played (just one after a split): glows gold. */
  glow?: boolean;
  /** Its result is in: show a win, loss or push (bust and blackjack show as soon as they happen). */
  settled?: boolean;
  /** Someone else's turn: dimmed a little. */
  waiting?: boolean;
  /** Your hand: a win stamps in gold. */
  mine?: boolean;
  dealDelayMs?: (cardIndex: number) => number;
};

/** A dealt pair's footprint with a dashed outline, so nothing moves at the deal. */
function ReservedCards({
  size,
  className,
}: {
  size: CardSize;
  className?: string;
}) {
  return (
    <div aria-hidden className={cn("relative flex", className)}>
      <div className={cardBox(size)} />
      <div className={cn(cardBox(size), cardOverlap(size))} />
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className={cn(
            cardBox(size),
            "rounded-md border-2 border-dashed border-white/20",
          )}
        />
      </div>
    </div>
  );
}

// The chat's glow in the table's gold (amber-300, like "Your turn" and the YOU tag).
const TURN_GLOW =
  "shadow-[0_0_1px_white,inset_0_0_1px_white,0_0_2px_#fcd34d,0_0_5px_#fcd34d,0_0_10px_#fcd34d]";

// Room between the cards and the glow around them.
const GLOW_PAD_PX = 4;
// How long the glow takes to widen for a new card, at the very end of its flight.
const GROW_MS = 180;

/** Whose turn it is, around their cards. Place inside the cards' box. */
export function TurnGlow({
  count,
  size,
  growDelayMs = 0,
}: {
  count: number;
  size: CardSize;
  /** When the newest card starts its flight (a hit waits a beat first). */
  growDelayMs?: number;
}) {
  const px = CARD_PX[size];
  const cardsW = px.w + (count - 1) * (px.w - px.overlap);
  const ref = useRef<HTMLDivElement>(null);

  // Fades in once the cards' flights land; passive, so it runs after their layout effects start them.
  useEffect(() => {
    const el = ref.current;
    if (!el?.parentElement) return;
    const landing = el.parentElement
      .getAnimations({ subtree: true })
      // Only the cards' Web Animations flights, not CSS animations (badges) or transitions (this glow's width).
      .filter((a) => !(a instanceof CSSAnimation || a instanceof CSSTransition))
      .map((a) => {
        const end = Number(a.effect?.getComputedTiming().endTime ?? 0);
        return end - Number(a.currentTime ?? 0);
      });
    const fade = el.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 200,
      delay: Math.max(0, ...landing.filter(Number.isFinite)),
      fill: "forwards",
    });
    return () => fade.cancel();
  }, []);

  return (
    // Its own width transition, not the layout's, so it grows as a dealt card arrives instead of ahead of it.
    <div
      ref={ref}
      aria-hidden
      className={cn(
        "pointer-events-none absolute -left-1 -top-1 rounded-lg opacity-0 transition-[width]",
        TURN_GLOW,
      )}
      style={{
        width: cardsW + 2 * GLOW_PAD_PX,
        height: px.h + 2 * GLOW_PAD_PX,
        // Holds its size until the card has nearly landed, then widens to take it in.
        transitionDuration: `${GROW_MS}ms`,
        transitionDelay: `${growDelayMs + DEAL_MS - GROW_MS}ms`,
        transitionTimingFunction: DEAL_EASING,
      }}
    />
  );
}

export function Hand({
  hand,
  size = "sm",
  glow,
  settled,
  waiting,
  mine,
  dealDelayMs,
}: Props) {
  const net = hand?.payout != null ? hand.payout - hand.bet : 0;

  // The outline and the total both wait for the newest card to land, so neither gives a card away mid-flight.
  const cardsRef = useRef<HTMLDivElement>(null);
  const dealingLive = useDealingLive();
  const count = hand?.cards.length ?? 0;
  // A split replaces the second card without changing the count.
  const cardsKey =
    hand?.cards.map((c) => (c ? `${c.rank}${c.suit}` : "?")).join(",") ?? "";
  const [shown, setShown] = useState<{
    total: number;
    soft: boolean;
    cardsKey: string;
    /** Dealt live, so its sounds play (not when a load or reconnect finds it on the table). */
    live: boolean;
  } | null>(null);
  const landed = shown !== null;
  const total = hand?.total ?? 0;
  const soft = hand?.soft ?? false;
  useEffect(() => {
    if (count < 2) {
      setShown(null);
      return;
    }
    // Passive, so the newest card's flight has started, and before DealProvider's effect updates `live`.
    const live = dealingLive();
    const newest =
      cardsRef.current?.querySelectorAll("[aria-label]")[count - 1];
    const left = (newest?.getAnimations() ?? []).map(
      (a) =>
        Number(a.effect?.getComputedTiming().endTime ?? 0) -
        Number(a.currentTime ?? 0),
    );
    const timer = setTimeout(
      () => setShown({ total, soft, cardsKey, live }),
      Math.max(0, ...left.filter(Number.isFinite)),
    );
    return () => clearTimeout(timer);
    // Once per card.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardsKey]);

  // A bust or blackjack shows once its card lands; a win, loss or push waits for the end of the hand.
  const cardsIn = shown?.cardsKey === cardsKey;

  // A 21 at any seat sounds as its total slams in gold: bigger for a natural blackjack.
  const shownTotal = shown?.total;
  const twentyOne = useRef(false);
  useEffect(() => {
    const is21 = shownTotal === 21;
    if (is21 && !twentyOne.current && shown?.live)
      playTwentyOne(hand?.outcome === "blackjack");
    twentyOne.current = is21;
    // When the shown total changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shownTotal]);
  const atEnd = hand?.outcome !== "bust" && hand?.outcome !== "blackjack";
  const outcome =
    hand?.outcome && cardsIn && (settled || !atEnd)
      ? OUTCOME[hand.outcome]
      : null;
  const label = outcome?.label(net);

  // A bust sounds as its badge lands (after the busting card), yours a little louder.
  const bustShowing = !!outcome && hand?.outcome === "bust";
  useEffect(() => {
    if (bustShowing && shown?.live) playBustSound(mine);
    // Once, as the bust appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bustShowing]);

  return (
    <div className="relative flex flex-col items-center rounded-lg p-1">
      <div className="relative">
        {glow && hand && (
          <TurnGlow
            count={hand.cards.length}
            size={size}
            growDelayMs={count > 2 ? (dealDelayMs?.(count - 1) ?? 0) : 0}
          />
        )}
        <ReservedCards
          size={size}
          className={cn(
            hand && "absolute left-0 top-0",
            hand && landed && "invisible",
          )}
        />
        {hand && (
          <>
            {/* A losing hand fades: it's out of the running. Its badge below stays clear. */}
            <div
              ref={cardsRef}
              className={cn(
                "transition-opacity duration-300",
                // Only a lost hand goes see-through; someone else's turn shades the cards, which stay opaque.
                outcome?.fade && "opacity-40",
              )}
            >
              <ScoredCards
                cards={hand.cards}
                // Not until both opening cards have landed, and then each new card, so nothing is given away.
                total={shown?.total ?? null}
                soft={shown?.soft}
                size={size}
                dealDelayMs={dealDelayMs}
                shaded={waiting && !outcome?.fade}
                celebrate
                keyByCard
              />
            </div>
            {/* Over the cards, not below them, so the result doesn't push the seat around. */}
            {outcome && label && (
              // Above the seat's avatar, which can overlap a long hand; solid even while the cards are dimmed.
              <div className="pointer-events-none absolute inset-x-0 bottom-2 z-20 flex justify-center">
                <Badge
                  variant="outline"
                  className={cn(
                    "whitespace-nowrap px-2.5 py-0.5 text-sm font-medium uppercase tracking-wider tabular-nums shadow-lg animate-in fade-in zoom-in-50 duration-300",
                    mine && hand.outcome === "win" ? GOLD : outcome.tone,
                  )}
                >
                  {label}
                </Badge>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** Over the dealer's hand when they turn up a blackjack, which ends the round at once; neutral, as it's bad news. */
export function DealerBlackjackBadge() {
  return (
    // Waits out the hole card's flip.
    <div className="pointer-events-none absolute inset-x-0 bottom-2 z-20 flex justify-center">
      <Badge
        variant="outline"
        className={cn(
          "whitespace-nowrap px-2.5 py-0.5 text-sm font-medium uppercase tracking-wider shadow-lg animate-in fade-in zoom-in-50 duration-300 delay-500 fill-mode-both",
          PUSH,
        )}
      >
        Blackjack
      </Badge>
    </div>
  );
}
