"use client";

import { useRef } from "react";
import { RANKS, SUITS, type Card, type Suit } from "@tim/casino";
import { cn } from "@/lib/utils";
import { useDealFlight, useInDeal } from "../deal";

// The faces are RevK's CC0 deck (public/assets/cards), drawn at poker proportions: 1 wide to 1.4 tall.
const SUIT_CODE: Record<Suit, string> = {
  spades: "S",
  hearts: "H",
  diamonds: "D",
  clubs: "C",
};
const faceUrl = ({ rank, suit }: Card) =>
  `/assets/cards/${rank === "10" ? "T" : rank}${SUIT_CODE[suit]}.svg`;

let preloaded = false;
/** Fetches every face once, so a dealt card never flies in blank while its image loads. */
export function preloadCardFaces() {
  if (preloaded || typeof window === "undefined") return;
  preloaded = true;
  for (const suit of SUITS)
    for (const rank of RANKS) new Image().src = faceUrl({ rank, suit });
}

// Smallest to largest; heights keep the deck's 1:1.4 shape.
const SIZES = {
  sm: { card: "h-[45px] w-8", overlap: "-ml-3.5" },
  md: { card: "h-14 w-10", overlap: "-ml-4" },
  lg: { card: "h-[78px] w-14", overlap: "-ml-6" },
  xl: { card: "h-[98px] w-[70px]", overlap: "-ml-[31px]" },
  "2xl": { card: "h-[118px] w-[84px]", overlap: "-ml-[35px]" },
  "3xl": { card: "h-[134px] w-24", overlap: "-ml-[39px]" },
};

export type CardSize = keyof typeof SIZES;

/** Each size in px (matching SIZES), and how far each later card tucks under the one before. */
export const CARD_PX: Record<
  CardSize,
  { w: number; h: number; overlap: number }
> = {
  sm: { w: 32, h: 45, overlap: 14 },
  md: { w: 40, h: 56, overlap: 16 },
  lg: { w: 56, h: 78, overlap: 24 },
  xl: { w: 70, h: 98, overlap: 31 },
  "2xl": { w: 84, h: 118, overlap: 35 },
  "3xl": { w: 96, h: 134, overlap: 39 },
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
  /** Holds the flight from the shoe, for a staggered deal; `null` places the card without one. */
  dealDelayMs?: number | null;
  /** Dimmed with a shade over the face, so the card stays opaque and still covers what's under it. */
  shaded?: boolean;
};

export function PlayingCard({
  card,
  size = "sm",
  className,
  dealDelayMs,
  shaded,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const inDeal = useInDeal();
  useDealFlight(ref, dealDelayMs);
  const base = cn(
    "relative shrink-0 rounded-[4px] shadow-sm",
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
          "border border-white/70 bg-rose-800 bg-[repeating-linear-gradient(45deg,transparent_0_3px,rgba(255,255,255,0.15)_3px_5px)]",
        )}
      />
    );
  }

  return (
    <div ref={ref} aria-label={`${card.rank} of ${card.suit}`} className={base}>
      {/* The face draws its own white card, outline and corner index. A static SVG: next/image adds nothing. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={faceUrl(card)}
        alt=""
        draggable={false}
        className="pointer-events-none size-full select-none"
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 rounded-[4px] bg-emerald-950/20 transition-opacity duration-300",
          !shaded && "opacity-0",
        )}
      />
    </div>
  );
}
