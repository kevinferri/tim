"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from "react";
import { ChevronLeftIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { StackDirectionContext } from "./chips";
import { placeSeats, seatAngles } from "../seat-layout";
import { FeltLogo, FeltPrint } from "./table-dressing";

type Props = {
  backHref: string;
  backLabel: string;
  /** Shown between the chevron and the label, e.g. the circle's avatar. */
  backAvatar?: ReactNode;
  title: string;
  /** Embroidered into the felt beside the dealer, e.g. the circle's name. */
  logoName?: string;
  /** The table's bet limits, printed on the felt just under the dealer's cards, a line each. */
  tableLimits?: string[];
  /** Shown before the title, e.g. the game's icon. */
  titleIcon?: ReactNode;
  /** Shown just after the title, e.g. a mute button. */
  titleAction?: ReactNode;
  headerRight?: ReactNode;
  /** Replaces the felt, e.g. while joining or when the game is off. */
  notice?: ReactNode;
  dealer?: ReactNode;
  /** Just above the dock: what's happening, over what you can do about it. */
  status?: ReactNode;
  /** Seated players only, spread evenly around the table in `seat` order (see seatAngles). `node` goes on the felt (bet, cards), `rail` on the armrest (avatar). */
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
  /** The felt's inside size, whenever it changes (e.g. to fit the cards to it). */
  onFeltSize?: (felt: Size) => void;
  /** Along the dealer's edge of the table, e.g. the chip rack. */
  rack?: ReactNode;
  /** The viewer's controls, always in one spot in the middle of the felt; the game styles them. */
  dock?: ReactNode;
  /** The dock's tallest height: the status and dock center on it as one block, so neither moves as the dock changes. */
  dockReserveH?: number;
  /** A round is on: seated players keep their spots, and anyone who sits down takes the widest open gap. */
  holdSeats?: boolean;
};

// Each seat's direction from the dealer's side of the table (percent of the felt): angle 0 is first base,
// beside the dealer on the viewer's right as on a real table, around the bottom to π on the left.
const U = { cx: 50, cy: 22, rx: 40, ry: 56 };

// Half the rail's width, so an avatar centers on the armrest rather than its inner edge.
const RAIL_HALF_PX = 18;

/** Where a seat at angle `a` meets the rail (felt-relative 0–1) and the rail's outward direction there. */
function railPoint(a: number) {
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
const railPosition = (angle: number) => {
  const { p, n } = railPoint(angle);
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

export type Size = { w: number; h: number };
type Vec = { x: number; y: number };

/** A seat's avatar center and unit vector toward the dealer's cards, in px within the felt. */
function seatLine(angle: number, felt: Size) {
  const { p, n } = railPoint(angle);
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

/** How far a two-card hand reaches toward the dealer; extra cards grow back toward the player. */
function cardsFarReach(u: Vec, spot: Size) {
  return AVATAR_RADIUS_PX + AVATAR_TO_CARDS_PX + extent(spot, u);
}

const FeltSizeContext = createContext<{ felt: Size; spot: Size }>({
  felt: { w: 0, h: 0 },
  spot: { w: 0, h: 0 },
});

/** A seat's bet circle: a fixed spot just past a two-card hand, toward the dealer. It never moves. */
function betCenter(angle: number, felt: Size, spot: Size) {
  const { avatar, toDealer: u } = seatLine(angle, felt);
  const reach = cardsFarReach(u, spot) + CARDS_TO_BET_PX + BET_RADIUS_PX;
  return { x: avatar.x + u.x * reach, y: avatar.y + u.y * reach, u };
}

function SeatBet({
  seat,
  angle,
  children,
}: {
  seat: number;
  angle: number;
  children: ReactNode;
}) {
  const { felt, spot } = useContext(FeltSizeContext);
  const { x, y, u } = betCenter(angle, felt, spot);
  return (
    <div
      data-bet-seat={seat}
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

// Between the rack and the dealer's cards, and below the dealer's cards.
const DEALER_GAP_PX = 20;
// Between the status and the dock.
const STATUS_DOCK_GAP_PX = 16;

/** A seat's cards on the line to the dealer, with the dealer-side edge pinned. */
function SeatSpot({ angle, children }: { angle: number; children: ReactNode }) {
  const { felt, spot } = useContext(FeltSizeContext);
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<Size>({ w: 0, h: 0 });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    setSize((s) => (s.w === w && s.h === h ? s : { w, h }));
  }, []);
  // Every render, so a new card re-centers the hand before paint (a ResizeObserver lags a frame).
  useLayoutEffect(measure);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure]);

  const { avatar, toDealer: u } = seatLine(angle, felt);
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

// The dealer's cards plus the shoe beside them, from the felt's middle (px past a two-card hand's half-width).
const DEALER_SIDE_REACH_PX = 96;
const LOGO_MAX_W_PX = 224;
const LOGO_MIN_W_PX = 96;
const LOGO_MARGIN_PX = 24;

/** The right-hand logo's center x and width: midway between the dealer (and shoe) and first base's bet circle, shrinking to fit. */
function logoSpot(felt: Size, spot: Size) {
  if (!felt.w) return null;
  const start = felt.w / 2 + spot.w / 2 + DEALER_SIDE_REACH_PX + spot.h;
  const end = betCenter(0, felt, spot).x - BET_RADIUS_PX;
  const w = Math.min(LOGO_MAX_W_PX, end - start - 2 * LOGO_MARGIN_PX);
  return w < LOGO_MIN_W_PX ? null : { x: (start + end) / 2, w };
}

// The status line's tallest (with the turn's avatar); a taller one, like a result, grows up from its fixed bottom.
const STATUS_RESERVE_PX = 40;

/** The status's bottom and the dock's top: centered as one block in the open middle (from `top` to `bottom`), on reserved heights so they never move. */
function placeMiddle(top: number, bottom: number, dockReserve: number) {
  const total = STATUS_RESERVE_PX + STATUS_DOCK_GAP_PX + dockReserve;
  // On a short felt, never over the dealer's cards; past that, the players' bets give way first.
  const blockTop = Math.max(
    top,
    Math.min((top + bottom - total) / 2, bottom - total),
  );
  const statusBottom = blockTop + STATUS_RESERVE_PX;
  return { statusBottom, dockTop: statusBottom + STATUS_DOCK_GAP_PX };
}

type Rect = { x0: number; y0: number; x1: number; y1: number };
const rectAt = (c: Vec, s: Size): Rect => ({
  x0: c.x - s.w / 2,
  y0: c.y - s.h / 2,
  x1: c.x + s.w / 2,
  y1: c.y + s.h / 2,
});
const overlaps = (a: Rect, b: Rect, gap: number) =>
  a.x0 < b.x1 + gap &&
  b.x0 < a.x1 + gap &&
  a.y0 < b.y1 + gap &&
  b.y0 < a.y1 + gap;

// Clearance kept between neighbors' cards, and from the dealer's edge.
const FIT_GAP_PX = 8;

/**
 * Whether seats' hands fit the felt at one card size: `spot` is a two-card hand (which fixes where
 * the bet circles sit) and `hand` the largest hand to make room for. No two hands touch, no hand
 * runs into another seat's bet circle, and none reaches the dealer's edge.
 */
export function handsFit(felt: Size, seats: number[], spot: Size, hand: Size) {
  const angles = [...seatAngles(seats).values()];
  const hands = angles.map((angle) => {
    const { avatar, toDealer: u } = seatLine(angle, felt);
    // As SeatSpot places it: the dealer-side edge at a two-card hand's reach.
    const reach = cardsFarReach(u, spot) - extent(hand, u) / 2;
    return rectAt(
      { x: avatar.x + u.x * reach, y: avatar.y + u.y * reach },
      hand,
    );
  });
  const bets = angles.map((angle) =>
    rectAt(betCenter(angle, felt, spot), {
      w: 2 * BET_RADIUS_PX,
      h: 2 * BET_RADIUS_PX,
    }),
  );
  // Only the dealer's edge bounds a hand; a long one may run out over its own player's armrest.
  const inside = (r: Rect) => r.y0 >= FIT_GAP_PX;
  return hands.every(
    (h, i) =>
      inside(h) &&
      hands.every((o, j) => j <= i || !overlaps(h, o, FIT_GAP_PX)) &&
      bets.every((b, j) => j === i || !overlaps(h, b, FIT_GAP_PX)),
  );
}

/** Full-screen, game-agnostic table: header, a U-shaped felt (a grid on phones), and a control dock. */
export function TableLayout(props: Props) {
  // Elements in state, not refs, so measuring re-attaches whenever one is replaced (after a notice, or a remount).
  const [feltEl, setFeltEl] = useState<HTMLDivElement | null>(null);
  const [felt, setFelt] = useState<Size>({ w: 0, h: 0 });
  useLayoutEffect(() => {
    if (!feltEl) return;
    // The inside of the rail, which is what seat positions are measured against.
    const measure = () => {
      // A removed element reads as 0; ignore it.
      if (feltEl.isConnected)
        setFelt({ w: feltEl.clientWidth, h: feltEl.clientHeight });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(feltEl);
    return () => observer.disconnect();
  }, [feltEl]);
  const { onFeltSize } = props;
  useEffect(() => {
    if (felt.w) onFeltSize?.(felt);
  }, [felt, onFeltSize]);

  // The dealer's lower edge, where the open middle of the felt starts.
  const [dealerEl, setDealerEl] = useState<HTMLDivElement | null>(null);
  const [dealerBottom, setDealerBottom] = useState(0);
  useLayoutEffect(() => {
    if (!dealerEl) return;
    const measure = () => {
      if (dealerEl.isConnected)
        setDealerBottom(dealerEl.offsetTop + dealerEl.offsetHeight);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(dealerEl);
    return () => observer.disconnect();
  }, [dealerEl, felt.h]);
  const spot = props.spotSize ?? { w: 0, h: 0 };
  // The bottom of the U, whether or not anyone sits there.
  const playersTop = betCenter(Math.PI / 2, felt, spot).y - BET_RADIUS_PX;
  const middle =
    felt.h && dealerBottom
      ? placeMiddle(
          dealerBottom + DEALER_GAP_PX,
          playersTop,
          props.dockReserveH ?? 0,
        )
      : null;

  const logoName = props.logoName;
  const logo = logoName ? logoSpot(felt, spot) : null;
  const placed = useRef(new Map<number, number>());
  const angles = placeSeats(
    props.players?.map((p) => p.seat) ?? [],
    placed.current,
    !!props.holdSeats,
  );
  useLayoutEffect(() => {
    placed.current = angles;
  });

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
          <div className="flex items-center gap-1">
            <h1 className="flex items-center gap-1.5 text-sm font-medium">
              {props.titleIcon}
              {props.title}
            </h1>
            {props.titleAction}
          </div>
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
                ref={setFeltEl}
                className="relative flex-1 overflow-y-auto rounded-3xl border-4 border-amber-900/70 bg-emerald-800 shadow-inner dark:border-amber-950 dark:bg-[#123a2f] md:overflow-visible md:rounded-b-[50%] md:border-[36px] md:border-neutral-950 md:border-t-[10px] md:border-t-amber-950 md:shadow-[inset_0_0_24px_rgba(0,0,0,0.45),inset_0_0_6px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.18),0_12px_32px_rgba(0,0,0,0.5)] dark:md:border-zinc-900"
              >
                {/* Shading over the armrest so it reads as padded: dark at its outer edge, a soft highlight along its crown. Matches the border box. */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute -bottom-[36px] -left-[36px] -right-[36px] -top-[10px] hidden rounded-t-3xl rounded-b-[50%] shadow-[inset_0_0_10px_2px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.08)] md:block"
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute -bottom-[19px] -left-[19px] -right-[19px] -top-[5px] hidden rounded-t-[20px] rounded-b-[50%] border-[5px] border-t-0 border-white/[0.11] blur-[5px] md:block"
                />
                <FeltSizeContext.Provider value={{ felt, spot }}>
                  {/* The felt is dark in both themes, so its contents use dark tokens. */}
                  <div className="dark flex min-h-full w-full flex-col items-center gap-6 p-4 text-emerald-50 md:block md:h-full md:p-0">
                    {/* The house name, embroidered into the open felt on either side of the dealer. */}
                    {logo &&
                      logoName &&
                      [logo.x, felt.w - logo.x].map((x) => (
                        <FeltLogo
                          name={logoName}
                          key={x}
                          className="pointer-events-none absolute hidden -translate-x-1/2 -translate-y-1/2 opacity-25 md:block"
                          style={{
                            left: x,
                            top: DEALER_MIDDLE_PX,
                            width: logo.w,
                          }}
                        />
                      ))}
                    {/* Rack, then dealer, DEALER_GAP_PX apart. */}
                    <div
                      className="flex flex-col items-center md:absolute md:inset-x-0 md:top-0"
                      style={{ gap: DEALER_GAP_PX }}
                    >
                      {props.rack && (
                        <div className="hidden md:block">{props.rack}</div>
                      )}
                      {/* The limits print sits inside the dealer's box, so the status below starts under it. */}
                      <div
                        ref={setDealerEl}
                        className="flex flex-col items-center"
                      >
                        <div className="flex min-h-16 items-center justify-center">
                          {props.dealer}
                        </div>
                        {props.tableLimits && (
                          <FeltPrint
                            lines={props.tableLimits}
                            className="mt-3 hidden md:block"
                          />
                        )}
                      </div>
                    </div>
                    <div className="flex w-full flex-wrap justify-center gap-2 md:contents">
                      {props.players?.map(({ key, seat, node, bet, rail }) => {
                        const angle = angles.get(seat)!;
                        return (
                          // Phones: one stacked cell per player. Wide: felt and rail parts positioned separately.
                          <div
                            key={key}
                            className="flex w-[calc((100%-1rem)/3)] min-w-0 flex-col items-center gap-2 md:contents"
                          >
                            {/* Positioned by wrappers so the parts' own animations keep `transform`. */}
                            {bet && (
                              <SeatBet seat={seat} angle={angle}>
                                {bet}
                              </SeatBet>
                            )}
                            <SeatSpot angle={angle}>{node}</SeatSpot>
                            <div
                              data-rail-seat={seat}
                              // Phones: room for the up/down hung below the avatar (it's out of the flow).
                              className="max-md:mb-7 md:absolute md:left-[var(--x)] md:top-[var(--y)] md:z-10 md:-translate-x-1/2 md:-translate-y-1/2"
                              style={railPosition(angle)}
                            >
                              {rail}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* Phones: after the players, over the controls. */}
                    {props.status && (
                      <div
                        // Pinned by its bottom, so a taller status grows upward.
                        className={cn(
                          "flex justify-center md:absolute md:inset-x-0 md:-translate-y-full",
                          middle === null && "md:invisible",
                        )}
                        style={{ top: middle?.statusBottom }}
                      >
                        {props.status}
                      </div>
                    )}
                    {/* Your controls, hanging below the status in the open middle of the felt. */}
                    {props.dock && (
                      <div
                        className={cn(
                          "flex justify-center md:absolute md:inset-x-0 md:z-40",
                          middle === null && "md:invisible",
                        )}
                        style={{ top: middle?.dockTop }}
                      >
                        {props.dock}
                      </div>
                    )}
                  </div>
                </FeltSizeContext.Provider>
              </div>
            </div>
            {/* Room below the table for the bottom seats' avatars and up/down, which overhang the rail. */}
            <div className="h-6 shrink-0 md:h-20" />
          </>
        )}
      </div>
    </TooltipProvider>
  );
}
