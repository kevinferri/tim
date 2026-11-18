import { useId } from "react";
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
