"use client";

import {
  createContext,
  useContext,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
  type RefObject,
} from "react";
import { cn } from "@/lib/utils";

// Casino-style chips by value (5 and 1 cover any whole-number bet): the face, its darker edge,
// the edge spots, the lighter center inlay, and the printed value.
const CHIPS = [
  {
    value: 100,
    face: "#1f1f23",
    edge: "#09090b",
    spot: "#f4f4f5",
    inlay: "#2e2e34",
    text: "#fff",
  },
  {
    value: 50,
    face: "#1d4ed8",
    edge: "#122f85",
    spot: "#f8fafc",
    inlay: "#3062e8",
    text: "#fff",
  },
  {
    value: 25,
    face: "#047857",
    edge: "#023d2c",
    spot: "#f8fafc",
    inlay: "#0b8c66",
    text: "#fff",
  },
  {
    value: 10,
    face: "#c81e1e",
    edge: "#6f0f0f",
    spot: "#f8fafc",
    inlay: "#d93636",
    text: "#fff",
  },
  {
    value: 5,
    face: "#db2777",
    edge: "#7d1544",
    spot: "#f8fafc",
    inlay: "#e64b8f",
    text: "#fff",
  },
  {
    value: 1,
    face: "#f4f4f5",
    edge: "#a1a1aa",
    spot: "#1d4ed8",
    inlay: "#ffffff",
    text: "#18181b",
  },
];
type ChipColors = (typeof CHIPS)[number];
/** Every chip's colors, smallest value first, so other pieces (the dealer's rack) match the real chips. */
export const CHIP_COLORS: readonly ChipColors[] = [...CHIPS].reverse();
const colorsOf = (value: number): ChipColors =>
  CHIPS.find((c) => c.value <= value) ?? CHIPS[CHIPS.length - 1];

// Spots around the rim: 8 spots and 8 gaps share the circumference of the spot ring.
const SPOT_RING_R = 15.1;
const SPOT_DASH = (2 * Math.PI * SPOT_RING_R) / 16;

/**
 * A real-looking casino chip, drawn top-down at a slight angle: the face with its edge spots, a
 * dashed inner ring and lighter inlay, a soft sheen, and below it a thin band of the chip's edge for
 * thickness. 36px wide; the edge band hangs 2.5px below.
 */
function ChipArt({ colors }: { colors: ChipColors }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return (
    <svg
      aria-hidden
      viewBox="0 0 36 39"
      className="pointer-events-none absolute left-0 top-0 h-[39px] w-9 overflow-visible drop-shadow-[0_2px_2px_rgba(0,0,0,0.45)]"
    >
      <defs>
        <linearGradient id={`${id}-sheen`} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.18" />
        </linearGradient>
      </defs>
      {/* The chip's thickness: a thin solid band of its edge, just below the face. */}
      <circle cx="18" cy="20.5" r="17" fill={colors.edge} />
      <circle cx="18" cy="20.5" r="17" fill="#000" fillOpacity="0.15" />
      {/* The face. */}
      <circle cx="18" cy="18" r="17" fill={colors.face} />
      <circle
        cx="18"
        cy="18"
        r={SPOT_RING_R}
        fill="none"
        stroke={colors.spot}
        strokeWidth="3.4"
        strokeDasharray={`${SPOT_DASH} ${SPOT_DASH}`}
      />
      <circle
        cx="18"
        cy="18"
        r="12.3"
        fill="none"
        stroke={colors.spot}
        strokeOpacity="0.85"
        strokeWidth="0.8"
        strokeDasharray="1.4 1.4"
      />
      <circle cx="18" cy="18" r="11.4" fill={colors.inlay} />
      <circle cx="18" cy="18" r="17" fill={`url(#${id}-sheen)`} />
      <circle
        cx="18"
        cy="18"
        r="16.75"
        fill="none"
        stroke="#000"
        strokeOpacity="0.3"
        strokeWidth="0.5"
      />
    </svg>
  );
}
const MAX_SHOWN = 8;
// How far each chip in a stack sits from the one below it, in px: a thin slice, so stacks read as tall.
const STACK_STEP = 3;

/** Which way a stack builds on screen (a unit vector); a seat points it at the dealer. Straight up by default. */
export const StackDirectionContext = createContext({ x: 0, y: -1 });
const CHIP_FLIGHT_MS = 400;

// One size everywhere: the bar, the bet circles, and in flight. The art draws the chip; this
// holds it and centers the printed value on the face.
const CHIP =
  "relative flex size-9 shrink-0 items-center justify-center rounded-full text-[11.5px] font-medium tabular-nums [text-shadow:0_1px_1px_rgba(0,0,0,0.35)]";

/** A chip's art with its printed value on top. */
function ChipBody({ value, label }: { value: number; label?: ReactNode }) {
  const colors = colorsOf(value);
  return (
    <>
      <ChipArt colors={colors} />
      {label != null && label !== false && (
        <span className="relative" style={{ color: colors.text }}>
          {label}
        </span>
      )}
    </>
  );
}

export function breakdown(amount: number) {
  const chips: number[] = [];
  let left = amount;
  for (const { value } of CHIPS) {
    while (left >= value) {
      chips.push(value);
      left -= value;
    }
  }
  return chips;
}

// Where the last chip was picked up, so the chip that lands in a circle can fly from there.
type Launch = { rect: DOMRect; at: number };
const ChipLaunchContext = createContext<RefObject<Launch | null> | null>(null);

export function ChipLaunchProvider({ children }: { children: ReactNode }) {
  const launch = useRef<Launch | null>(null);
  return (
    <ChipLaunchContext.Provider value={launch}>
      {children}
    </ChipLaunchContext.Provider>
  );
}

/** A chip to pick from the bar; clicking it records where the chip flies from. */
export function ChipButton({
  value,
  onClick,
  ...props
}: { value: number } & ComponentProps<"button">) {
  const launch = useContext(ChipLaunchContext);
  return (
    <button
      type="button"
      {...props}
      onClick={(e) => {
        if (launch) {
          launch.current = {
            rect: e.currentTarget.getBoundingClientRect(),
            at: performance.now(),
          };
        }
        onClick?.(e);
      }}
      className={cn(
        CHIP,
        "transition hover:-translate-y-0.5 hover:brightness-110 disabled:pointer-events-none disabled:opacity-40",
        props.className,
      )}
    >
      <ChipBody value={value} label={value} />
    </button>
  );
}

/** A chip in a stack; one that mounts just after a pick flies in from the bar. */
function StackedChip({
  value,
  label,
  index,
  flyIn,
}: {
  value: number;
  label?: ReactNode;
  index: number;
  flyIn?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const launch = useContext(ChipLaunchContext);
  const dir = useContext(StackDirectionContext);

  useLayoutEffect(() => {
    const el = ref.current;
    const from = launch?.current;
    // Recent enough to be this chip's pick (and survives dev's double mount).
    if (!flyIn || !el || !from || performance.now() - from.at > 300) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const to = el.getBoundingClientRect();
    const dx = from.rect.left - to.left;
    const dy = from.rect.top - to.top;
    const flight = el.animate(
      [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }],
      { duration: CHIP_FLIGHT_MS, easing: "cubic-bezier(0.2, 0.7, 0.3, 1)" },
    );
    return () => flight.cancel();
    // Mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <span
      ref={ref}
      className={cn(CHIP, "absolute left-0 top-0")}
      style={{
        left: dir.x * index * STACK_STEP,
        top: dir.y * index * STACK_STEP,
      }}
    >
      <ChipBody value={value} label={label} />
    </span>
  );
}

/** A stack of chips for `amount`: the given chips in order, or the fewest chips largest-first. */
export function ChipStack({
  amount,
  chips,
  label,
  flyIn,
  dimmed,
}: {
  amount: number;
  /** The actual chips, bottom to top (e.g. the ones the player clicked). */
  chips?: number[];
  /** Shown on the top chip instead of the amount. */
  label?: string;
  /** New chips fly in from the last one picked, instead of the whole stack dropping in. */
  flyIn?: boolean;
  dimmed?: boolean;
}) {
  // Drop in only when the stack first appears: placing a picked bet mustn't replay it.
  const [dropIn] = useState(!flyIn);
  const shown = (chips ?? breakdown(amount)).slice(-MAX_SHOWN);
  const top = shown.length - 1;

  return (
    <div
      className={cn(
        "relative size-9 transition-opacity duration-300",
        dropIn && "animate-chip-drop",
        dimmed && "opacity-40",
      )}
      aria-label={`${amount} in chips`}
    >
      {shown.map((value, i) => (
        <StackedChip
          key={i}
          index={i}
          value={value}
          flyIn={flyIn}
          label={i === top && (label ?? amount)}
        />
      ))}
    </div>
  );
}

export type BetStack = {
  amount: number;
  chips?: number[];
  /** Out of the running (e.g. a bust): shown faded. */
  dimmed?: boolean;
};

type BetSpotProps = {
  /** Each entry is its own stack, e.g. the original bet and a double. */
  stacks: BetStack[];
  flyIn?: boolean;
  /** E.g. take back the last chip while still betting. */
  onClick?: () => void;
  /** The bet is in: a glowing ring circles the spot, drawn in clockwise when it locks. */
  locked?: boolean;
  className?: string;
};

/** The gold ring around a locked-in bet: quiet at rest; `draw` traces it clockwise from the top with a brief glow. */
function LockRing({ draw }: { draw: boolean }) {
  const ring = {
    cx: 28,
    cy: 28,
    r: 27,
    fill: "none",
    pathLength: 100,
    strokeDasharray: "100",
    strokeLinecap: "round" as const,
  };
  return (
    <svg
      aria-hidden
      viewBox="0 0 56 56"
      className="pointer-events-none absolute -inset-0.5 -rotate-90 overflow-visible motion-reduce:hidden"
    >
      {/* At rest: a quiet gold line. */}
      <circle
        {...ring}
        strokeWidth="1.25"
        className={cn("stroke-amber-300/40", draw && "animate-bet-lock")}
      />
      {/* On lock: a bright, glowing pass traced over it that fades away. */}
      {draw && (
        <circle
          {...ring}
          strokeWidth="1.5"
          className="animate-bet-lock-flare stroke-amber-300 [filter:drop-shadow(0_0_4px_rgba(252,211,77,0.6))]"
        />
      )}
    </svg>
  );
}

// Gap between stacks (one per split hand), so they never overlap.
const STACK_SPACING_PX = 40;

/** The circle printed on the felt where a hand's bet goes: a fixed size, with chips piled on top. */
export function BetSpot({
  stacks,
  flyIn,
  onClick,
  locked,
  className,
}: BetSpotProps) {
  // Draw the ring only on the change to locked; one already locked at mount (e.g. a reconnect) just shows.
  const [wasLocked, setWasLocked] = useState(locked);
  const [ringKey, setRingKey] = useState(0);
  if (locked !== wasLocked) {
    setWasLocked(locked);
    if (locked) setRingKey(ringKey + 1);
  }
  // Side by side across the line to the dealer, so extra stacks never crowd toward the cards.
  const dir = useContext(StackDirectionContext);
  const across = { x: -dir.y, y: dir.x };
  return (
    <div
      onClick={onClick}
      title={onClick ? "Take back a chip" : undefined}
      className={cn(
        "relative size-[3.25rem] shrink-0 rounded-full bg-black/60 shadow-inner transition-shadow duration-300",
        onClick && "cursor-pointer",
        className,
      )}
    >
      {locked && <LockRing key={ringKey} draw={ringKey > 0} />}
      {stacks.map((stack, i) => (
        // Centered on the circle; extra chips rise above it instead of resizing anything.
        <div
          key={i}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            marginLeft:
              across.x * (i - (stacks.length - 1) / 2) * STACK_SPACING_PX,
            marginTop:
              across.y * (i - (stacks.length - 1) / 2) * STACK_SPACING_PX,
          }}
        >
          <ChipStack {...stack} flyIn={flyIn} />
        </div>
      ))}
    </div>
  );
}
