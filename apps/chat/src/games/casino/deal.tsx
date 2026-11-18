"use client";

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import { cn } from "@/lib/utils";
import { cardBox, type CardSize } from "./components/playing-card";

const DEAL_MS = 600;

type DealContextValue = {
  shoe: RefObject<HTMLDivElement | null>;
  /** Off until a snapshot has rendered while connected, so page loads and reconnects don't replay the deal. */
  enabled: RefObject<boolean>;
};

const DealContext = createContext<DealContextValue | null>(null);

type ProviderProps = {
  live: boolean;
  /** Changes with every server snapshot. */
  snapshot: unknown;
  children: ReactNode;
};

export function DealProvider({ live, snapshot, children }: ProviderProps) {
  const shoe = useRef<HTMLDivElement>(null);
  const enabled = useRef(false);
  // Runs after the cards' layout effects, so a snapshot's own cards see the previous value.
  useEffect(() => {
    enabled.current = live && snapshot != null;
  }, [live, snapshot]);

  return (
    <DealContext.Provider value={{ shoe, enabled }}>
      {children}
    </DealContext.Provider>
  );
}

/** Where dealt cards fly from: a small stack of card backs. */
export function DealShoe({
  size,
  className,
}: {
  /** Matches the cards on the table. */
  size: CardSize;
  className?: string;
}) {
  const ctx = useContext(DealContext);
  return (
    <div
      ref={ctx?.shoe}
      aria-hidden
      className={cn(
        cardBox(size),
        "relative rounded-[4px] border border-white/70 bg-rose-800 bg-[repeating-linear-gradient(45deg,transparent_0_3px,rgba(255,255,255,0.15)_3px_5px)]",
        // A full deck: the white edges of the cards beneath, stacked down and right, then its shadow.
        "shadow-[1px_1px_0_#e7e5e4,2px_2px_0_#d6d3d1,3px_3px_0_#a8a29e,5px_7px_12px_rgba(0,0,0,0.45)]",
        className,
      )}
    />
  );
}

/** Whether cards here fly from a shoe (otherwise they fade in). */
export const useInDeal = () => useContext(DealContext) !== null;

const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** On mount, flies the element from the shoe to where it sits. */
export function useDealFlight(ref: RefObject<HTMLElement | null>, delayMs = 0) {
  const ctx = useContext(DealContext);

  useLayoutEffect(() => {
    const el = ref.current;
    const shoe = ctx?.shoe.current;
    if (!el || !shoe || !ctx?.enabled.current || reducedMotion()) return;

    const from = shoe.getBoundingClientRect();
    const to = el.getBoundingClientRect();
    const dx = from.left + from.width / 2 - (to.left + to.width / 2);
    const dy = from.top + from.height / 2 - (to.top + to.height / 2);
    // Web Animations, not a CSS class, so it can't collide with layout transforms.
    const flight = el.animate(
      // Hidden while it waits its turn, then fades in as it leaves, so no face shows on the shoe.
      [
        {
          // A pure slide: the shoe matches the cards' size (its box is wider only because it's angled).
          transform: `translate(${dx}px, ${dy}px)`,
          opacity: 0,
        },
        { opacity: 1, offset: 0.3 },
        { transform: "none", opacity: 1 },
      ],
      {
        duration: DEAL_MS,
        delay: delayMs,
        easing: "cubic-bezier(0.2, 0.7, 0.3, 1)",
        fill: "backwards",
      },
    );
    // Dev's double mount runs this twice; cancel so only one flight plays.
    return () => flight.cancel();
    // Mount only: a card flies once, when it's dealt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
