import { useEffect, useRef } from "react";
import type { BlackjackHandView, BlackjackOutcome, Card } from "@tim/casino";
import {
  CARD_PX,
  DEAL_EASING,
  DEAL_MS,
  cardBox,
  PlayingCard,
  cardOverlap,
  type CardSize,
} from "@/games/casino";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Calmer than the app-wide success/destructive tokens, which are too loud on the felt.
const WIN = "border-emerald-400/40 bg-emerald-800 text-emerald-50";
const LOSE = "border-rose-300/30 bg-rose-900 text-rose-50";

const OUTCOME: Record<BlackjackOutcome, { label: string; tone: string }> = {
  blackjack: { label: "Blackjack", tone: WIN },
  // Plain wins and losses get no badge; the amount shows on the player's tag.
  win: { label: "", tone: WIN },
  push: { label: "Push", tone: "border-white/20 bg-slate-700 text-slate-50" },
  lose: { label: "", tone: LOSE },
  bust: { label: "Bust", tone: LOSE },
};

type DealProps = {
  /** Per-card hold before it flies from the shoe (the opening deal's order). */
  dealDelayMs?: (cardIndex: number) => number;
  /** Key cards by value so one replaced at the same index (after a split) mounts and flies. The dealer keeps index keys so the hole card flips in place. */
  keyByCard?: boolean;
};

export function Cards({
  cards,
  size = "sm",
  dealDelayMs,
  keyByCard,
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
          className={i > 0 ? cardOverlap(size) : undefined}
          dealDelayMs={dealDelayMs?.(i)}
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
};

export function Total({
  total,
  soft,
  size = "xl",
}: {
  total: number;
  soft?: boolean;
  size?: CardSize;
}) {
  return (
    <span
      className={cn(
        "rounded-full bg-black/80 px-2 py-0.5 font-medium tabular-nums text-white shadow ring-1 ring-white/20",
        TOTAL_TEXT[size] ?? "text-sm",
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
  ...deal
}: {
  cards: (Card | null)[];
  total: number | null;
  soft?: boolean;
  size?: CardSize;
} & DealProps) {
  return (
    <div className="relative">
      <Cards cards={cards} size={size} {...deal} />
      {total !== null && (
        <div className="absolute -right-3.5 -top-2.5">
          <Total total={total} soft={soft} size={size} />
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

/** Whose turn it is, around their cards. Place inside the cards' box. */
export function TurnGlow({ count, size }: { count: number; size: CardSize }) {
  const px = CARD_PX[size];
  const cardsW = px.w + (count - 1) * (px.w - px.overlap);
  const ref = useRef<HTMLDivElement>(null);

  // A turn can start while its cards are still flying in (the opening deal), so fade in once they've all landed.
  // A passive effect, so it runs after the cards' layout effects have started their flights.
  useEffect(() => {
    const el = ref.current;
    if (!el?.parentElement) return;
    const landing = el.parentElement
      .getAnimations({ subtree: true })
      .filter((a) => (a.effect as KeyframeEffect | null)?.target !== el)
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
    // Its own width transition, not the layout's, so it grows with a dealt card's flight instead of ahead of it.
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
        transitionDuration: `${DEAL_MS}ms`,
        transitionTimingFunction: DEAL_EASING,
      }}
    />
  );
}

export function Hand({ hand, size = "sm", glow, dealDelayMs }: Props) {
  const outcome = hand?.outcome ? OUTCOME[hand.outcome] : null;
  const net = hand?.payout != null ? hand.payout - hand.bet : 0;

  return (
    <div className="relative flex flex-col items-center rounded-lg p-1">
      <div className="relative">
        {glow && hand && <TurnGlow count={hand.cards.length} size={size} />}
        {/* Hidden under a busted hand, whose faded cards would show it through. */}
        {hand?.outcome !== "bust" && (
          <ReservedCards
            size={size}
            className={hand ? "absolute left-0 top-0" : undefined}
          />
        )}
        {hand && (
          <>
            {/* A busted hand fades: it's out of the running. The Bust badge below stays clear. */}
            <div
              className={cn(
                "transition-opacity duration-300",
                hand.outcome === "bust" && "opacity-40",
              )}
            >
              <ScoredCards
                cards={hand.cards}
                total={hand.total}
                soft={hand.soft}
                size={size}
                dealDelayMs={dealDelayMs}
                keyByCard
              />
            </div>
            {/* Over the cards, not below them, so the result doesn't push the seat around. */}
            {outcome?.label && (
              <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center">
                <Badge
                  variant="outline"
                  className={cn(
                    "whitespace-nowrap px-2.5 py-0.5 text-sm font-medium shadow-lg animate-in fade-in zoom-in-50 duration-300",
                    outcome.tone,
                  )}
                >
                  {outcome.label}
                </Badge>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
