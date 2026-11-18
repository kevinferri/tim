import { useId, type CSSProperties } from "react";
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

// The "TIM" lettering from the app logo (public/assets/logo.svg), each path with its offset.
const LOGO_LETTERS = [
  {
    d: "M0 0 C0 0.66 0 1.32 0 2 C1.98 1.34 3.96 0.68 6 0 C6.70365602 1.5552912 7.38729378 3.11964827 8.0625 4.6875 C8.44535156 5.55761719 8.82820313 6.42773438 9.22265625 7.32421875 C10.38389559 11.32144963 9.40886076 13.91589949 7.96875 17.734375 C6.50152278 22.68035064 6.57156747 27.58937412 6.43359375 32.71875 C6.20210306 38.79789694 6.20210306 38.79789694 4 41 C0.875 41.125 0.875 41.125 -2 41 C-6.62175739 32.71935135 -5.92591169 23.64026933 -3.5 14.6875 C-3.005 13.140625 -2.51 11.59375 -2 10 C-8.435 10.495 -8.435 10.495 -15 11 C-15.33 12.65 -15.66 14.3 -16 16 C-17.45426071 19.26382374 -19.03632799 22.44817994 -20.625 25.6484375 C-22.0596619 29.14542588 -22.62049759 32.25241366 -23 36 C-22.34 36 -21.68 36 -21 36 C-21.33 37.65 -21.66 39.3 -22 41 C-25.01911587 41.92250763 -26.3995411 42.31690887 -29.25 40.8125 C-31.29582097 38.693614 -31.68555413 37.90862429 -32 35 C-32.12375 33.865625 -32.2475 32.73125 -32.375 31.5625 C-32.35136539 25.33478057 -29.40364602 19.63139924 -27 14 C-27.68707031 13.97421875 -28.37414063 13.9484375 -29.08203125 13.921875 C-29.98308594 13.86515625 -30.88414063 13.8084375 -31.8125 13.75 C-33.15248047 13.68039063 -33.15248047 13.68039063 -34.51953125 13.609375 C-37 13 -37 13 -38.80859375 11.12109375 C-40.25361974 8.54847371 -40.31436545 6.90788037 -40 4 C-37.3148933 1.3148933 -30.37817679 1.85414228 -26.75 1.4375 C-25.62335937 1.29892578 -24.49671875 1.16035156 -23.3359375 1.01757812 C-15.52392534 0.11034788 -7.86129117 -0.16831685 0 0 Z",
    x: 51,
    y: 44,
  },
  {
    d: "M0 0 C3.2555389 1.34051602 3.95071782 1.92607673 6 5 C6.1953125 7.26171875 6.1953125 7.26171875 6.125 9.6875 C6.10695313 10.49574219 6.08890625 11.30398437 6.0703125 12.13671875 C6.04710938 12.75160156 6.02390625 13.36648437 6 14 C12.4992147 11.69819479 18.79616578 7.98089419 22.23046875 1.77734375 C22.61138672 0.89755859 22.61138672 0.89755859 23 0 C26.67852334 0.25080841 28.55599012 0.61441247 31.375 3.0625 C33.50296291 6.90920219 33.42504624 9.76241782 33 14 C32.89429688 15.17820312 32.78859375 16.35640625 32.6796875 17.5703125 C31.88376225 24.84941072 31.00670214 30.80782396 27 37 C24 39 24 39 21.875 38.75 C20 38 20 38 19 36 C18.69648211 30.95624681 18.691361 25.90739626 20 21 C19.45730469 21.34933594 18.91460937 21.69867188 18.35546875 22.05859375 C17.64003906 22.51363281 16.92460938 22.96867187 16.1875 23.4375 C15.12595703 24.11619141 15.12595703 24.11619141 14.04296875 24.80859375 C10.88822042 26.64836094 8.21576123 27.17646905 4.625 27.25 C3.87476562 27.27578125 3.12453125 27.3015625 2.3515625 27.328125 C0 27 0 27 -5 24 C-7.31 29.28 -9.62 34.56 -12 40 C-13.65 40 -15.3 40 -17 40 C-19.71580834 35.36049409 -20.53020491 32.35506958 -20 27 C-18.68103166 23.34389303 -16.98971496 19.90959966 -15.25 16.4375 C-14.8065625 15.51775391 -14.363125 14.59800781 -13.90625 13.65039062 C-6.245393 -2.02056832 -6.245393 -2.02056832 0 0 Z",
    x: 83,
    y: 45,
  },
];

/** "Tim Casino" embroidered into the felt: satin-stitched thread, a stitched outline, and a slight rise. Decorative. */
export function FeltLogo({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  const id = useId();
  const satin = `${id}-satin`;
  const raise = `${id}-raise`;
  const thread = {
    fill: `url(#${satin})`,
    stroke: "#c9dccf",
    strokeWidth: 0.5,
    strokeDasharray: "1.1 0.7",
    strokeLinejoin: "round" as const,
  };
  return (
    <svg aria-hidden viewBox="6 38 116 72" className={className} style={style}>
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
      <g filter={`url(#${raise})`}>
        {LOGO_LETTERS.map((l) => (
          <path
            key={l.x}
            d={l.d}
            transform={`translate(${l.x} ${l.y})`}
            {...thread}
          />
        ))}
        <text
          x="63.5"
          y="103"
          textAnchor="middle"
          fontSize="11"
          fontWeight="700"
          letterSpacing="5"
          {...thread}
          strokeWidth={0.35}
        >
          CASINO
        </text>
      </g>
    </svg>
  );
}
