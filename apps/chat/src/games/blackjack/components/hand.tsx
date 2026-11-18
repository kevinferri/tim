import type { BlackjackHandView, BlackjackOutcome, Card } from "@tim/casino";
import {
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
  /** Highlights the hand being played (after a split). */
  active?: boolean;
  dealDelayMs?: (cardIndex: number) => number;
};

/**
 * Where the first two cards land, sized like a dealt pair so nothing moves at the deal, with a
 * dashed card outline printed on the felt. It stays under the cards once they're dealt.
 */
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

export function Hand({ hand, size = "sm", active, dealDelayMs }: Props) {
  const outcome = hand?.outcome ? OUTCOME[hand.outcome] : null;
  const net = hand?.payout != null ? hand.payout - hand.bet : 0;

  return (
    <div
      className={cn(
        "relative flex flex-col items-center rounded-lg p-1",
        active && "bg-amber-300/15 ring-1 ring-amber-300",
      )}
    >
      <div className="relative">
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
