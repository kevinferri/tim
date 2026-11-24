"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
  type RefObject,
} from "react";
import { cn } from "@/lib/utils";
import { playTableSound } from "../sounds";

// Chips by value in real casino colors (the white 1 only appears as change: an odd 3:2 payout rounds down), drawn as
// real clay chips to sit with the vintage card deck: the face, its darker edge, the inserts set into the
// rim, the printed center label, and the ink its value is printed in.
const CHIPS = [
  {
    value: 100,
    face: "#1e1e1e",
    edge: "#0b0b0b",
    insert: "#f1ece0",
    label: "#f4efe3",
    ink: "#1e1e1e",
  },
  {
    value: 25,
    face: "#1d7a3a",
    edge: "#0f4a22",
    insert: "#f1ece0",
    label: "#f4efe3",
    ink: "#17642f",
  },
  {
    value: 5,
    face: "#c41e1e",
    edge: "#7a0f0f",
    insert: "#f1ece0",
    label: "#f4efe3",
    ink: "#a81818",
  },
  {
    value: 1,
    face: "#efeae0",
    edge: "#a9a49a",
    insert: "#2f3fc0",
    label: "#ffffff",
    ink: "#26339e",
  },
];
type ChipColors = (typeof CHIPS)[number];
/** Every chip's colors, smallest value first, so other pieces (the dealer's rack) match the real chips. */
export const CHIP_COLORS: readonly ChipColors[] = [...CHIPS].reverse();
const colorsOf = (value: number): ChipColors =>
  CHIPS.find((c) => c.value <= value) ?? CHIPS[CHIPS.length - 1];

// The clay's grain: a small tile of faint light and dark specks, repeated over the face.
const GRAIN =
  "data:image/png;base64,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";

// Eight inserts around the rim, between the compass points.
const INSERT_ANGLES = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => k * 45 + 22.5);

/** A clay casino chip drawn top-down at a slight angle; 36px wide, with a 2.5px edge band below. */
function ChipArt({ colors }: { colors: ChipColors }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return (
    <svg
      aria-hidden
      viewBox="0 0 36 39"
      className="pointer-events-none absolute left-0 top-0 h-[39px] w-9 overflow-visible drop-shadow-[0_2px_2px_rgba(0,0,0,0.45)]"
    >
      <defs>
        {/* Matte: a soft lift in the middle, falling off toward the rim. */}
        <radialGradient id={`${id}-shade`} cx="0.45" cy="0.4" r="0.65">
          <stop offset="0" stopColor="#fff" stopOpacity="0.1" />
          <stop offset="0.7" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.22" />
        </radialGradient>
        <pattern
          id={`${id}-grain`}
          width="12"
          height="12"
          patternUnits="userSpaceOnUse"
        >
          <image href={GRAIN} width="12" height="12" />
        </pattern>
        <clipPath id={`${id}-edge`}>
          <circle cx="18" cy="20.5" r="17" />
        </clipPath>
      </defs>
      {/* The edge band, striped where the inserts on the near side come round it. */}
      <circle cx="18" cy="20.5" r="17" fill={colors.edge} />
      <g clipPath={`url(#${id}-edge)`}>
        {INSERT_ANGLES.filter((a) => Math.cos((a * Math.PI) / 180) < -0.2).map(
          (a) => (
            <rect
              key={a}
              x={18 + 17 * Math.sin((a * Math.PI) / 180) - 1.5}
              y="18.5"
              width="3"
              height="4.5"
              fill={colors.insert}
              opacity="0.85"
            />
          ),
        )}
      </g>
      <circle cx="18" cy="20.5" r="17" fill={`url(#${id}-grain)`} />
      <circle
        cx="18"
        cy="20.5"
        r="17"
        fill="none"
        stroke="#000"
        strokeOpacity="0.55"
        strokeWidth="0.6"
      />
      {/* The face, its inserts, grain, molded rings near the rim, and shading. */}
      <circle cx="18" cy="18" r="17" fill={colors.face} />
      {INSERT_ANGLES.map((a) => (
        <rect
          key={a}
          x="16.1"
          y="1.15"
          width="3.8"
          height="3.3"
          rx="0.4"
          fill={colors.insert}
          transform={`rotate(${a} 18 18)`}
        />
      ))}
      <circle cx="18" cy="18" r="17" fill={`url(#${id}-grain)`} />
      {[15.9, 15.2, 14.6].map((r, i) => (
        <circle
          key={r}
          cx="18"
          cy="18"
          r={r}
          fill="none"
          stroke="#000"
          strokeOpacity={0.07 + i * 0.02}
          strokeWidth="0.25"
        />
      ))}
      <circle cx="18" cy="18" r="17" fill={`url(#${id}-shade)`} />
      {/* The printed ring and center label, lightly grained, with its own fine borders. */}
      <circle
        cx="18"
        cy="18"
        r="13.9"
        fill="none"
        stroke={colors.insert}
        strokeOpacity="0.7"
        strokeWidth="0.45"
      />
      <circle cx="18" cy="18" r="12.9" fill={colors.label} />
      <circle
        cx="18"
        cy="18"
        r="12.9"
        fill={`url(#${id}-grain)`}
        opacity="0.6"
      />
      <circle
        cx="18"
        cy="18"
        r="12.9"
        fill="none"
        stroke={colors.ink}
        strokeOpacity="0.55"
        strokeWidth="0.5"
      />
      <circle
        cx="18"
        cy="18"
        r="11.7"
        fill="none"
        stroke={colors.ink}
        strokeOpacity="0.35"
        strokeWidth="0.3"
        strokeDasharray="0.6 0.6"
      />
      <circle
        cx="18"
        cy="18"
        r="16.8"
        fill="none"
        stroke="#000"
        strokeOpacity="0.6"
        strokeWidth="0.6"
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
// The value is printed in a serif with lining figures (every digit the same height), its box trimmed to
// the digits so they sit dead center on the label.
const CHIP =
  "relative flex size-9 shrink-0 items-center justify-center rounded-full [font-family:'Times_New_Roman',Times,serif] text-[13px] font-bold leading-none [font-variant-numeric:lining-nums_tabular-nums]";

/** A chip amount in short form: thousands as k (1k, 1.5k, 12.5k), so a big number never crowds a chip or pill. */
export const chipText = (amount: number, keepZeros = false) => {
  const abs = Math.abs(amount);
  if (abs <= 999) return String(amount);
  // Trailing zeros are trimmed (1.5k), except mid-roll, where a steady length keeps the text from jittering.
  const fixed = (n: number, digits: number) =>
    keepZeros ? n.toFixed(digits) : String(Number(n.toFixed(digits)));
  // Fewer decimals as it grows, so it stays about four characters: 1.25k, 12.5k, 125k, 1.25M.
  if (abs >= 999_500) return `${fixed(amount / 1e6, 2)}M`;
  const digits = abs < 9_995 ? 2 : abs < 99_950 ? 1 : 0;
  return `${fixed(amount / 1000, digits)}k`;
};

/** A chip's art with its printed value on top; a number label prints via chipText. */
function ChipBody({ value, label }: { value: number; label?: ReactNode }) {
  const colors = colorsOf(value);
  const text = typeof label === "number" ? chipText(label) : label;
  return (
    <>
      <ChipArt colors={colors} />
      {text != null && text !== false && (
        // Trimmed to the digits (text-box doesn't inherit, so it goes on the value's own box).
        <span
          className={cn(
            "relative [text-box:trim-both_cap_alphabetic]",
            // Four characters or more (e.g. 2.5k) fit the label at a smaller size.
            typeof text === "string" && text.length >= 4 && "text-[10px]",
          )}
          style={{ color: colors.ink }}
        >
          {text}
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
      // A click doesn't take focus, so Enter afterwards places the bet instead of re-clicking this chip.
      onMouseDown={(e) => {
        e.preventDefault();
        props.onMouseDown?.(e);
      }}
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

// Picks (by their launch time) whose landing sound has been scheduled.
const sounded = new Set<number>();

/** A chip in a stack; one that mounts just after a pick flies in from the bar. */
function StackedChip({
  value,
  label,
  index,
  flyIn,
  onFlight,
}: {
  value: number;
  label?: ReactNode;
  index: number;
  flyIn?: boolean;
  /** Told when this chip takes off (true) and lands or is dropped mid-air (false). */
  onFlight?: (airborne: boolean) => void;
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
    onFlight?.(true);
    flight.onfinish = () => onFlight?.(false);
    // Sounds as it's picked, not as it lands; once per pick for dev's double mount.
    if (!sounded.has(from.at)) {
      sounded.add(from.at);
      playTableSound("chipsCollide", { volume: 0.55, rate: 1 + index * 0.03 });
    }
    return () => {
      flight.cancel();
      onFlight?.(false);
    };
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
  hidden,
  still,
}: {
  amount: number;
  /** The actual chips, bottom to top (e.g. the ones the player clicked). */
  chips?: number[];
  /** Shown on the top chip instead of the amount. */
  label?: string;
  /** New chips fly in from the last one picked, instead of the whole stack dropping in. */
  flyIn?: boolean;
  dimmed?: boolean;
  /** Kept in place but invisible, e.g. while a copy of it is moving elsewhere. */
  hidden?: boolean;
  /** Appears in place, without dropping in. */
  still?: boolean;
}) {
  // Drop in only when the stack first appears: placing a picked bet mustn't replay it.
  const [dropIn] = useState(!flyIn && !still);
  const all = chips ?? breakdown(amount);
  const shown = all.slice(-MAX_SHOWN);
  // Keyed by position in the full stack, so a pick past MAX_SHOWN mounts (and flies in) a new chip.
  const below = all.length - shown.length;
  // Chips still in the air, by key. Until one lands, the stack under it keeps its previous total on top
  // and the flying chip shows its own value, so the top is never blank.
  const [airborne, setAirborne] = useState<ReadonlySet<number>>(new Set());
  const onFlight = useCallback(
    (key: number, up: boolean) =>
      setAirborne((prev) => {
        if (prev.has(key) === up) return prev;
        const next = new Set(prev);
        if (up) next.add(key);
        else next.delete(key);
        return next;
      }),
    [],
  );
  const inAir = (i: number) => airborne.has(below + i);
  const landedTop = shown.findLastIndex((_, i) => !inAir(i));
  const landedTotal =
    amount -
    all.reduce((sum, value, i) => sum + (airborne.has(i) ? value : 0), 0);

  return (
    <div
      className={cn(
        "relative size-9 transition-opacity duration-300",
        dropIn && "animate-chip-drop",
        dimmed && "opacity-40",
        hidden && "opacity-0 transition-none",
      )}
      aria-label={`${amount} in chips`}
    >
      {shown.map((value, i) => (
        <StackedChip
          key={below + i}
          index={i}
          value={value}
          flyIn={flyIn}
          onFlight={(up) => onFlight(below + i, up)}
          label={inAir(i) ? value : i === landedTop && (label ?? landedTotal)}
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
  /** Settled and moved off the circle (swept or paid out). */
  hidden?: boolean;
  /** Doubled down: a second, equal stack placed beside it (each of `amount`), as on a real table. */
  doubled?: boolean;
};

type BetSpotProps = {
  /** Each entry is its own stack, e.g. the original bet and a double. */
  stacks: BetStack[];
  flyIn?: boolean;
  /** E.g. take back the last chip while still betting. */
  onClick?: () => void;
  /** The bet is in: a glowing ring circles the spot, drawn in clockwise when it locks. */
  locked?: boolean;
  /** Your own bet: its chips sound a little fuller as it locks. */
  mine?: boolean;
  className?: string;
};

/** The glowing white ring around a locked-in bet, like the felt's printed text; `draw` traces it clockwise from the top with a brief glow. */
function LockRing({ draw, mine }: { draw: boolean; mine?: boolean }) {
  // The chips settle into place as the ring traces in, your own a little fuller; a timeout, so dev's
  // double mount cancels the extra one.
  useEffect(() => {
    if (!draw) return;
    const sound = setTimeout(() =>
      playTableSound("chipsStack", { volume: mine ? 0.65 : 0.3 }),
    );
    return () => clearTimeout(sound);
  }, [draw, mine]);
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
      {/* At rest: lit like the printed text. */}
      <circle
        {...ring}
        strokeWidth="1.25"
        className={cn(
          "stroke-white/70 [filter:drop-shadow(0_0_5px_rgba(255,255,255,0.35))]",
          draw && "animate-bet-lock",
        )}
      />
      {/* On lock: a bright, glowing pass traced over it that fades away. */}
      {draw && (
        <circle
          {...ring}
          strokeWidth="1.5"
          className="animate-bet-lock-flare stroke-white [filter:drop-shadow(0_0_6px_rgba(255,255,255,0.7))]"
        />
      )}
    </svg>
  );
}

// Gap between stacks (one per split hand), so they never overlap.
const STACK_SPACING_PX = 40;
// Wider when a hand is doubled, since its stack is a pair side by side.
const PAIR_SPACING_PX = 80;

/** One row across the line to the dealer; past two, a 2×2 block like the hands, its first row toward the dealer. */
function stackOffset(
  i: number,
  count: number,
  spacing: number,
  across: { x: number; y: number },
  dir: { x: number; y: number },
) {
  const grid = count > 2;
  const rows = grid ? Math.ceil(count / 2) : 1;
  const row = grid ? Math.floor(i / 2) : 0;
  const inRow = grid ? Math.min(2, count - row * 2) : count;
  const a = ((grid ? i % 2 : i) - (inRow - 1) / 2) * spacing;
  const d = -(row - (rows - 1) / 2) * STACK_SPACING_PX;
  return {
    marginLeft: across.x * a + dir.x * d,
    marginTop: across.y * a + dir.y * d,
  };
}

/** The circle printed on the felt where a hand's bet goes: a fixed size, with chips piled on top. */
export function BetSpot({
  stacks,
  flyIn,
  onClick,
  locked,
  mine,
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
  const spacing = stacks.some((s) => s.doubled)
    ? PAIR_SPACING_PX
    : STACK_SPACING_PX;
  return (
    <div
      onClick={onClick}
      title={onClick ? "Take back a chip" : undefined}
      className={cn(
        "relative size-[3.25rem] shrink-0 rounded-full bg-black/40 shadow-inner transition-shadow duration-300",
        onClick && "cursor-pointer",
        className,
      )}
    >
      {/* Always there: a dim version of the lock-in ring, which traces in over it. */}
      <svg
        aria-hidden
        viewBox="0 0 56 56"
        className="pointer-events-none absolute -inset-0.5 overflow-visible"
      >
        <circle
          cx="28"
          cy="28"
          r="27"
          fill="none"
          strokeWidth="1.25"
          className="stroke-white/20 [filter:drop-shadow(0_0_4px_rgba(255,255,255,0.12))]"
        />
      </svg>
      {locked && <LockRing key={ringKey} draw={ringKey > 0} mine={mine} />}
      {stacks.map(({ doubled, ...stack }, i) => (
        // Centered on the circle; extra chips rise above it instead of resizing anything.
        <div
          key={i}
          data-bet-stack={i}
          className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 gap-1"
          style={stackOffset(i, stacks.length, spacing, across, dir)}
        >
          <ChipStack {...stack} flyIn={flyIn} />
          {/* The double's stack drops in beside the first when it's placed. */}
          {doubled && <ChipStack {...stack} />}
        </div>
      ))}
    </div>
  );
}
