"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from "react";
import { SEAT_COUNT } from "@tim/casino";
import { ChevronLeftIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { StackDirectionContext } from "./chips";

type Props = {
  backHref: string;
  backLabel: string;
  /** Shown between the chevron and the label, e.g. the circle's avatar. */
  backAvatar?: ReactNode;
  title: string;
  /** Shown before the title, e.g. the game's icon. */
  titleIcon?: ReactNode;
  headerRight?: ReactNode;
  /** Replaces the felt, e.g. while joining or when the game is off. */
  notice?: ReactNode;
  dealer?: ReactNode;
  status?: ReactNode;
  /** Seated players only; `seat` fixes where each sits. `node` goes on the felt (bet, cards), `rail` on the armrest (avatar). */
  players?: {
    key: string;
    seat: number;
    node: ReactNode;
    /** The bet circle, placed on its own fixed spot. */
    bet?: ReactNode;
    rail: ReactNode;
  }[];
  /** The size of a seat's two-card hand, which fixes where bet circles sit. */
  spotSize?: Size;
  /** Along the dealer's edge of the table, e.g. the chip rack. */
  rack?: ReactNode;
  /** The viewer's controls, always in one spot in the middle of the felt; the game styles them. */
  dock?: ReactNode;
};

// Each seat's direction from the dealer's side of the table (percent of the felt):
// first base (seat 0) beside the dealer on the viewer's right, as on a real table,
// around the bottom to the last seat beside the dealer on the left.
const U = { cx: 50, cy: 22, rx: 40, ry: 56 };

// Half the rail's width, so an avatar centers on the armrest rather than its inner edge.
const RAIL_HALF_PX = 16;

/** Where a seat meets the rail (felt-relative 0–1) and the rail's outward direction there. */
function railPoint(seat: number) {
  const a = (seat * Math.PI) / (SEAT_COUNT - 1);
  const o = { x: U.cx / 100, y: U.cy / 100 };
  const d = { x: (U.rx / 100) * Math.cos(a), y: (U.ry / 100) * Math.sin(a) };
  // The felt's inside edge: straight sides to half height, then a half-ellipse (rounded-b-[50%]),
  // which is a circle of radius 0.5 around (0.5, 0.5) in felt-relative units.
  const q = { x: o.x - 0.5, y: o.y - 0.5 };
  const A = d.x * d.x + d.y * d.y;
  const B = 2 * (q.x * d.x + q.y * d.y);
  const C = q.x * q.x + q.y * q.y - 0.25;
  const t = (-B + Math.sqrt(B * B - 4 * A * C)) / (2 * A);
  let p = { x: o.x + t * d.x, y: o.y + t * d.y };
  let n = { x: p.x - 0.5, y: p.y - 0.5 };
  if (p.y < 0.5) {
    const side = d.x >= 0 ? 1 : 0;
    p = { x: side, y: o.y + ((side - o.x) / d.x) * d.y };
    n = { x: side ? 1 : -1, y: 0 };
  }
  const len = Math.hypot(n.x, n.y) || 1;
  return { p, n: { x: n.x / len, y: n.y / len } };
}

const at = (
  p: { x: number; y: number },
  n: { x: number; y: number },
  px: number,
) =>
  ({
    "--x": `calc(${p.x * 100}% + ${n.x * px}px)`,
    "--y": `calc(${p.y * 100}% + ${n.y * px}px)`,
  }) as CSSProperties;

/** The avatar, on the rail. */
const railPosition = (seat: number) => {
  const { p, n } = railPoint(seat);
  return at(p, n, RAIL_HALF_PX);
};

// Seat geometry along the line from each avatar to the dealer (px).
const AVATAR_RADIUS_PX = 36;
const BET_RADIUS_PX = 26;
// Room between the avatar and the cards, and between the cards and the bet circle.
const AVATAR_TO_CARDS_PX = 16;
const CARDS_TO_BET_PX = 14;
// The dealer's cards' middle, in px from the felt's top (under the rack); seats aim at it.
const DEALER_MIDDLE_PX = 110;

type Size = { w: number; h: number };
type Vec = { x: number; y: number };

/**
 * A seat's line toward the dealer, in px within the felt: the avatar's center and the unit vector
 * from it to the dealer's cards. Cards and bet sit along it: the player, their cards, then the bet.
 */
function seatLine(seat: number, felt: Size) {
  const { p, n } = railPoint(seat);
  const avatar = {
    x: p.x * felt.w + n.x * RAIL_HALF_PX,
    y: p.y * felt.h + n.y * RAIL_HALF_PX,
  };
  const dealer = { x: felt.w / 2, y: DEALER_MIDDLE_PX };
  const dx = dealer.x - avatar.x;
  const dy = dealer.y - avatar.y;
  const len = Math.hypot(dx, dy) || 1;
  return { avatar, toDealer: { x: dx / len, y: dy / len } };
}

/** A box's extent along a unit direction. */
const extent = (size: Size, u: Vec) =>
  Math.abs(u.x) * size.w + Math.abs(u.y) * size.h;

/**
 * The fixed point a seat's cards reach toward the dealer: the far edge of a two-card hand
 * (`spot`). Pinned there, so extra cards grow back toward the player and the bet beyond never moves.
 */
function cardsFarReach(u: Vec, spot: Size) {
  return AVATAR_RADIUS_PX + AVATAR_TO_CARDS_PX + extent(spot, u);
}

const FeltSizeContext = createContext<{ felt: Size; spot: Size }>({
  felt: { w: 0, h: 0 },
  spot: { w: 0, h: 0 },
});

/** A seat's bet circle: a fixed spot just past a two-card hand, toward the dealer. It never moves. */
function betCenter(seat: number, felt: Size, spot: Size) {
  const { avatar, toDealer: u } = seatLine(seat, felt);
  const reach = cardsFarReach(u, spot) + CARDS_TO_BET_PX + BET_RADIUS_PX;
  return { x: avatar.x + u.x * reach, y: avatar.y + u.y * reach, u };
}

function SeatBet({ seat, children }: { seat: number; children: ReactNode }) {
  const { felt, spot } = useContext(FeltSizeContext);
  const { x, y, u } = betCenter(seat, felt, spot);
  return (
    <div
      className="md:absolute md:-translate-x-1/2 md:-translate-y-1/2"
      style={{ left: x, top: y }}
    >
      {/* Chips stack toward the dealer, like a stack seen from the player's seat. */}
      <StackDirectionContext.Provider value={u}>
        {children}
      </StackDirectionContext.Provider>
    </div>
  );
}

// Between the rack, the dealer's cards and the status area, top to bottom.
const STATUS_GAP_PX = 20;

/**
 * A seat's cards, between the player and their bet, centered on the line to the dealer. The edge
 * toward the dealer stays put, so a growing hand spreads back toward the player, not over the bet.
 */
function SeatSpot({ seat, children }: { seat: number; children: ReactNode }) {
  const { felt, spot } = useContext(FeltSizeContext);
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<Size>({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(() =>
      setSize({ w: el.offsetWidth, h: el.offsetHeight }),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { avatar, toDealer: u } = seatLine(seat, felt);
  // The far edge sits at the fixed reach; the center is half the box back from it.
  const reach = cardsFarReach(u, spot) - extent(size, u) / 2;
  const center = { x: avatar.x + u.x * reach, y: avatar.y + u.y * reach };
  return (
    <div
      ref={ref}
      className="w-full md:absolute md:w-max"
      style={{ left: center.x - size.w / 2, top: center.y - size.h / 2 }}
    >
      {children}
    </div>
  );
}

/** Full-screen, game-agnostic table: header, a U-shaped felt (a grid on phones), and a control dock. */
export function TableLayout(props: Props) {
  const feltRef = useRef<HTMLDivElement>(null);
  const [felt, setFelt] = useState<Size>({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = feltRef.current;
    if (!el) return;
    // The inside of the rail, which is what seat positions are measured against.
    const measure = () => setFelt({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [props.notice]);

  // The dealer's lower edge: the status area sits just under it, like the dealer speaking.
  const dealerRef = useRef<HTMLDivElement>(null);
  const [dealerBottom, setDealerBottom] = useState(0);
  useLayoutEffect(() => {
    const el = dealerRef.current;
    if (!el) return;
    const measure = () => setDealerBottom(el.offsetTop + el.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [felt.h]);
  const spot = props.spotSize ?? { w: 0, h: 0 };
  const statusTop =
    felt.h && dealerBottom ? dealerBottom + STATUS_GAP_PX : null;

  // The dock sits midway between the status area and the players (the bottom-middle seat's bet circle).
  const [statusH, setStatusH] = useState(0);
  // A ref callback, so it measures whenever the status area mounts (it's absent behind a notice).
  const statusRef = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    const observer = new ResizeObserver(() => setStatusH(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const playersTop =
    betCenter(Math.floor(SEAT_COUNT / 2), felt, spot).y - BET_RADIUS_PX;
  const dockMiddle =
    statusTop !== null && statusH
      ? (statusTop + statusH + playersTop) / 2
      : null;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-dvh w-full min-w-0 flex-col">
        <header className="grid h-12 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 border-b px-2">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="justify-self-start"
          >
            <Link href={props.backHref}>
              <ChevronLeftIcon />
              {props.backAvatar}
              <span className="max-w-32 truncate text-sm">
                {props.backLabel}
              </span>
            </Link>
          </Button>
          <h1 className="flex items-center gap-1.5 text-sm font-medium">
            {props.titleIcon}
            {props.title}
          </h1>
          <div className="flex items-center gap-2 justify-self-end">
            {props.headerRight}
          </div>
        </header>

        {props.notice ? (
          <div className="flex flex-1 items-center justify-center p-4">
            {props.notice}
          </div>
        ) : (
          <>
            <div className="flex min-h-0 flex-1 px-2 pt-2 sm:px-6 sm:pt-6 md:px-24 md:pt-10">
              {/* On wide screens the border is the padded armrest: thick and black on the sides and curve, thin along the dealer's edge. */}
              <div
                ref={feltRef}
                className="relative flex-1 overflow-y-auto rounded-3xl border-4 border-amber-900/70 bg-emerald-800 shadow-inner dark:border-amber-950 dark:bg-[#123a2f] md:overflow-visible md:rounded-b-[50%] md:border-[32px] md:border-neutral-950 md:border-t-[10px] md:border-t-amber-950 md:shadow-[inset_0_0_24px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.18),0_12px_32px_rgba(0,0,0,0.5)] dark:md:border-zinc-900"
              >
                <FeltSizeContext.Provider value={{ felt, spot }}>
                  {/* The felt is dark in both themes, so its contents use dark tokens. */}
                  <div className="dark flex min-h-full w-full flex-col items-center gap-6 p-4 text-emerald-50 md:block md:h-full md:p-0">
                    {/* Rack, dealer, then status (below), each STATUS_GAP_PX apart. */}
                    <div
                      className="flex flex-col items-center md:absolute md:inset-x-0 md:top-0"
                      style={{ gap: STATUS_GAP_PX }}
                    >
                      {props.rack && (
                        <div className="hidden md:block">{props.rack}</div>
                      )}
                      <div
                        ref={dealerRef}
                        className="flex min-h-16 items-center justify-center"
                      >
                        {props.dealer}
                      </div>
                    </div>
                    <div
                      ref={statusRef}
                      className={cn(
                        "flex justify-center md:absolute md:inset-x-0",
                        statusTop === null && "md:invisible",
                      )}
                      style={{ top: statusTop ?? undefined }}
                    >
                      {props.status}
                    </div>
                    <div className="flex w-full flex-wrap justify-center gap-2 md:contents">
                      {props.players?.map(({ key, seat, node, bet, rail }) => (
                        // Phones: one stacked cell per player. Wide: felt and rail parts positioned separately.
                        <div
                          key={key}
                          className="flex w-[calc((100%-1rem)/3)] min-w-0 flex-col items-center gap-2 md:contents"
                        >
                          {/* Positioned by wrappers so the parts' own animations keep `transform`. */}
                          {bet && <SeatBet seat={seat}>{bet}</SeatBet>}
                          <SeatSpot seat={seat}>{node}</SeatSpot>
                          <div
                            data-rail-seat={seat}
                            className="md:absolute md:left-[var(--x)] md:top-[var(--y)] md:z-10 md:-translate-x-1/2 md:-translate-y-1/2"
                            style={railPosition(seat)}
                          >
                            {rail}
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Your controls, in the open middle of the felt between the dealer and the players. */}
                    {props.dock && (
                      <div
                        className={cn(
                          "flex justify-center md:absolute md:inset-x-0 md:z-40 md:-translate-y-1/2",
                          dockMiddle === null && "md:invisible",
                        )}
                        style={{ top: dockMiddle ?? undefined }}
                      >
                        {props.dock}
                      </div>
                    )}
                  </div>
                </FeltSizeContext.Provider>
              </div>
            </div>
            {/* Room below the table for the bottom seats' avatars, which overhang the rail. */}
            <div className="h-4 shrink-0 md:h-14" />
          </>
        )}
      </div>
    </TooltipProvider>
  );
}
