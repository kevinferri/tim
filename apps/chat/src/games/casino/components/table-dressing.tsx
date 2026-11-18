import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { CHIP_COLORS } from "./chips";

// Each chip lies on its side in the rack, so a tube shows a column of chip edges this tall.
const CHIP_EDGE = 3.5;
const TUBE_W = 26;
const TUBE_H = 28;
// The spot pattern repeats every two chips (spots alternate sides, like a real stack) and this wide.
const PATTERN_W = 12;

/** The dealer's chip rack along the table's edge: one tube per chip value, smallest first. Decorative. */
export function ChipRack() {
  return (
    <div
      aria-hidden
      className="flex gap-1 rounded-b-xl bg-black/60 px-2 pb-1.5 pt-1 shadow-inner ring-1 ring-white/10"
    >
      {CHIP_COLORS.map((chip) => (
        <RackTube key={chip.value} chip={chip} />
      ))}
    </div>
  );
}

function RackTube({ chip }: { chip: (typeof CHIP_COLORS)[number] }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return (
    <svg width={TUBE_W} height={TUBE_H} className="rounded-sm">
      <defs>
        {/* Two chip edges: face color, a dark seam under each, white spots offset between them. */}
        <pattern
          id={`${id}-edges`}
          width={PATTERN_W}
          height={CHIP_EDGE * 2}
          patternUnits="userSpaceOnUse"
        >
          <rect width={PATTERN_W} height={CHIP_EDGE * 2} fill={chip.face} />
          <rect
            x="1"
            y="0"
            width="4"
            height={CHIP_EDGE - 0.6}
            fill={chip.spot}
          />
          <rect
            x="7"
            y={CHIP_EDGE}
            width="4"
            height={CHIP_EDGE - 0.6}
            fill={chip.spot}
          />
          <rect
            y={CHIP_EDGE - 0.6}
            width={PATTERN_W}
            height="0.6"
            fill={chip.edge}
          />
          <rect
            y={CHIP_EDGE * 2 - 0.6}
            width={PATTERN_W}
            height="0.6"
            fill={chip.edge}
          />
        </pattern>
        {/* A round tube: darker at the sides, lit down the middle. */}
        <linearGradient id={`${id}-tube`} x1="0" x2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0.4" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.15" />
          <stop offset="1" stopColor="#000" stopOpacity="0.4" />
        </linearGradient>
      </defs>
      <rect width={TUBE_W} height={TUBE_H} fill={`url(#${id}-edges)`} />
      <rect width={TUBE_W} height={TUBE_H} fill={`url(#${id}-tube)`} />
      <rect
        x="0.5"
        y="0.5"
        width={TUBE_W - 1}
        height={TUBE_H - 1}
        rx="2"
        fill="none"
        stroke="#000"
        strokeOpacity="0.45"
      />
    </svg>
  );
}

// In SVG units. The name shrinks to fit up to MAX_W wide, then truncates; short names don't grow past MIN_W's scale.
const NAME_SIZE = 20;
const MIN_W = 150;
const MAX_W = 340;
const PAD = 6;
const HEIGHT = 60;

/** The circle's name over "CASINO", embroidered into the felt: satin-stitched thread, a stitched outline, a slight rise. Decorative. */
export function FeltLogo({
  name,
  className,
  style,
}: {
  name: string;
  className?: string;
  style?: CSSProperties;
}) {
  const id = useId();
  const satin = `${id}-satin`;
  const raise = `${id}-raise`;
  const measureRef = useRef<SVGTextElement>(null);
  const [fit, setFit] = useState<{ text: string; w: number } | null>(null);

  // Measure the real lettering on a hidden copy React leaves empty, trimming characters until it fits.
  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const label = name.toUpperCase();
    let text = label;
    el.textContent = text;
    while (el.getBBox().width > MAX_W - 2 * PAD && text.length > 1) {
      text = text.slice(0, -1).trimEnd();
      el.textContent = `${text}…`;
    }
    const shown = text === label ? label : `${text}…`;
    setFit({ text: shown, w: Math.max(MIN_W, el.getBBox().width + 2 * PAD) });
  }, [name]);

  const w = fit?.w ?? MIN_W;
  const thread = {
    fill: `url(#${satin})`,
    stroke: "#c9dccf",
    strokeDasharray: "1.1 0.7",
    strokeLinejoin: "round" as const,
  };
  return (
    <svg
      aria-hidden
      viewBox={`${-w / 2} 0 ${w} ${HEIGHT}`}
      className={className}
      style={{ ...style, visibility: fit ? undefined : "hidden" }}
    >
      <defs>
        {/* Satin stitch: tight diagonal threads, light with a darker sheen between. */}
        <pattern
          id={satin}
          width="1.4"
          height="1.4"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(55)"
        >
          <rect width="1.4" height="1.4" fill="#d6e6db" />
          <rect width="0.5" height="1.4" fill="#9db8a8" />
        </pattern>
        {/* Thread sits on the felt: a soft shadow below, a faint lit edge above. */}
        <filter id={raise} x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow
            dx="0"
            dy="0.7"
            stdDeviation="0.45"
            floodColor="#000"
            floodOpacity="0.6"
          />
          <feDropShadow
            dx="0"
            dy="-0.3"
            stdDeviation="0.2"
            floodColor="#fff"
            floodOpacity="0.15"
          />
        </filter>
      </defs>
      <g
        filter={`url(#${raise})`}
        fontFamily="Georgia, 'Times New Roman', serif"
        fontWeight="700"
        textAnchor="middle"
      >
        <text
          ref={measureRef}
          y="30"
          fontSize={NAME_SIZE}
          letterSpacing="3"
          visibility="hidden"
        />
        <text
          y="30"
          fontSize={NAME_SIZE}
          letterSpacing="3"
          strokeWidth={0.5}
          {...thread}
        >
          {fit?.text}
        </text>
        <text
          y="50"
          fontSize="9"
          letterSpacing="5"
          strokeWidth={0.35}
          {...thread}
        >
          CASINO
        </text>
      </g>
    </svg>
  );
}
