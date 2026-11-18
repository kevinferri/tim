"use client";

import { useRef } from "react";
import type { Card, Suit } from "@tim/casino";
import { cn } from "@/lib/utils";
import { useDealFlight, useInDeal } from "../deal";

const SUIT_SYMBOL: Record<Suit, string> = {
  spades: "♠",
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
};

// Smallest to largest.
const SIZES = {
  sm: { card: "h-11 w-8 text-[11px]", pip: "text-base", overlap: "-ml-3.5" },
  md: { card: "h-14 w-10 text-sm", pip: "text-lg", overlap: "-ml-4" },
  lg: { card: "h-20 w-14 text-base", pip: "text-2xl", overlap: "-ml-6" },
  xl: { card: "h-[5.75rem] w-16 text-lg", pip: "text-3xl", overlap: "-ml-7" },
  "2xl": {
    card: "h-[6.75rem] w-[4.75rem] text-xl",
    pip: "text-4xl",
    overlap: "-ml-8",
  },
};

export type CardSize = keyof typeof SIZES;

/** Each size in px (matching SIZES), and how far each later card tucks under the one before. */
export const CARD_PX: Record<
  CardSize,
  { w: number; h: number; overlap: number }
> = {
  sm: { w: 32, h: 44, overlap: 14 },
  md: { w: 40, h: 56, overlap: 16 },
  lg: { w: 56, h: 80, overlap: 24 },
  xl: { w: 64, h: 92, overlap: 28 },
  "2xl": { w: 76, h: 108, overlap: 32 },
};
export const CARD_SIZES = Object.keys(SIZES) as CardSize[];

/** Height and width classes, e.g. for an empty card outline. */
export const cardBox = (size: CardSize) => SIZES[size].card;

/** Negative margin for each card after the first, leaving its corner index visible. */
export const cardOverlap = (size: CardSize) => SIZES[size].overlap;

type Props = {
  /** null = face down. */
  card: Card | null;
  size?: CardSize;
  className?: string;
  /** Holds the flight from the shoe, for a staggered deal. */
  dealDelayMs?: number;
};

export function PlayingCard({
  card,
  size = "sm",
  className,
  dealDelayMs,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const inDeal = useInDeal();
  useDealFlight(ref, dealDelayMs);
  const base = cn(
    "relative shrink-0 rounded-[4px] border shadow-sm",
    !inDeal && "animate-in fade-in slide-in-from-top-2 duration-300",
    SIZES[size].card,
    className,
  );

  if (!card) {
    return (
      <div
        ref={ref}
        aria-label="Face-down card"
        className={cn(
          base,
          "border-white/70 bg-rose-800 bg-[repeating-linear-gradient(45deg,transparent_0_3px,rgba(255,255,255,0.15)_3px_5px)]",
        )}
      />
    );
  }

  const red = card.suit === "hearts" || card.suit === "diamonds";
  const symbol = SUIT_SYMBOL[card.suit];

  return (
    <div
      ref={ref}
      aria-label={`${card.rank} of ${card.suit}`}
      className={cn(
        base,
        // Always a white card, in either theme.
        "flex flex-col items-start justify-between border-neutral-300 bg-white px-1 py-0.5 font-semibold leading-none",
        red ? "text-red-600" : "text-neutral-900",
      )}
    >
      {/* Corner index stays visible when cards overlap. */}
      <span className="flex flex-col items-center">
        <span>{card.rank}</span>
        <span className="text-[0.9em]">{symbol}</span>
      </span>
      <span className={cn("self-end leading-none", SIZES[size].pip)}>
        {symbol}
      </span>
    </div>
  );
}
