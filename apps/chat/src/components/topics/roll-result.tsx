import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { remainingAnimationMs } from "@/components/topics/message-utils";

type Props = {
  content: string;
  // From the "/roll d20" prompt -- the result string doesn't carry the side count.
  sides: number;
  // Labels the die "d20" when the message text is hidden.
  showSides?: boolean;
  createdAt?: Date;
};

// Matches the fixed format rollDice() in command-handler.ts produces ("🎲
// rolled a 10") -- falls back to plain text if that format ever drifts out
// of sync.
const ROLL_PATTERN = /^🎲 rolled (a|an) (\d+)$/;

// Matches the die-bounce/die-spin durations in tailwind.config.js.
const ROLL_DURATION_MS = 1500;

const DIE_SIZE = 56;

// The shuffle slows down along with the spin.
const SHUFFLE_TICK_START_MS = 50;
const SHUFFLE_TICK_END_MS = 220;

// Front face first; it lands on the result.
const FACE_TRANSFORMS = [
  "",
  "rotateY(180deg)",
  "rotateY(90deg)",
  "rotateY(-90deg)",
  "rotateX(90deg)",
  "rotateX(-90deg)",
];

// Mirrors rollDice() in command-handler.ts. Takes what follows "/roll".
export function sidesFromPrompt(prompt: string): number {
  const arg = prompt.trim().split(/\s+/)[0] ?? "";
  const sides = parseInt(arg.replace(/^d/i, ""), 10);
  return Number.isInteger(sides) && sides > 0 ? sides : 6;
}

function randomFaces(sides: number) {
  return FACE_TRANSFORMS.map(() => Math.floor(Math.random() * sides) + 1);
}

// Shuffling values for every face while rolling, null once settled.
function useShuffledFaces(sides: number, createdAtMs?: number) {
  const [faces, setFaces] = useState<number[] | null>(() =>
    remainingAnimationMs(ROLL_DURATION_MS, createdAtMs) > 0
      ? randomFaces(sides)
      : null,
  );

  useEffect(() => {
    const remaining = remainingAnimationMs(ROLL_DURATION_MS, createdAtMs);
    if (remaining <= 0) {
      setFaces(null);
      return;
    }

    const endsAt = Date.now() + remaining;
    let tick: ReturnType<typeof setTimeout>;
    const scheduleTick = () => {
      const progress = 1 - (endsAt - Date.now()) / ROLL_DURATION_MS;
      const delay =
        SHUFFLE_TICK_START_MS +
        (SHUFFLE_TICK_END_MS - SHUFFLE_TICK_START_MS) * progress ** 2;
      tick = setTimeout(() => {
        setFaces(randomFaces(sides));
        scheduleTick();
      }, delay);
    };
    scheduleTick();
    const timeout = setTimeout(() => {
      clearTimeout(tick);
      setFaces(null);
    }, remaining);

    return () => {
      clearTimeout(tick);
      clearTimeout(timeout);
    };
  }, [sides, createdAtMs]);

  return faces;
}

function faceTextSize(value: number) {
  const digits = String(value).length;
  if (digits <= 2) return "text-2xl";
  if (digits === 3) return "text-lg";
  if (digits === 4) return "text-sm";
  if (digits === 5) return "text-xs";
  return "text-[9px]";
}

function DieFace(props: { transform: string; children: ReactNode }) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center rounded-[10px] border border-slate-300 bg-gradient-to-br from-white to-slate-100 shadow-[inset_0_0_6px_rgba(15,23,42,0.12)]"
      style={{ transform: `${props.transform} translateZ(${DIE_SIZE / 2}px)` }}
    >
      {props.children}
    </div>
  );
}

export function RollResult(props: Props) {
  const match = props.content.match(ROLL_PATTERN);
  // Primitive -- callers may pass a fresh Date object every render.
  const createdAtMs =
    match && props.createdAt ? new Date(props.createdAt).getTime() : undefined;
  const shuffledFaces = useShuffledFaces(props.sides, createdAtMs);
  const isRolling = shuffledFaces !== null;
  // Negative delay resumes the animations mid-way if this remounts during a roll.
  const [tumbleDelayMs] = useState(
    () =>
      remainingAnimationMs(ROLL_DURATION_MS, createdAtMs) - ROLL_DURATION_MS,
  );

  if (!match) {
    return (
      <div className="whitespace-pre-line break-word leading-normal">
        {props.content}
      </div>
    );
  }

  const result = Number(match[2]);
  const animationDelay = isRolling
    ? { animationDelay: `${tumbleDelayMs}ms` }
    : undefined;

  return (
    // Room for the tumbling corners; the negative margin keeps the die on the text's left edge.
    <div
      role="img"
      aria-label={isRolling ? "Rolling a die" : `Rolled ${result}`}
      className="-ml-3 flex w-fit flex-col items-center gap-1 p-3"
    >
      {/* Bounce and spin are separate elements so each gets its own easing. */}
      <div
        className={cn("[perspective:400px]", isRolling && "animate-die-bounce")}
        style={animationDelay}
      >
        <div
          className={cn(
            "relative [transform-style:preserve-3d]",
            isRolling && "animate-die-spin",
          )}
          style={{ width: DIE_SIZE, height: DIE_SIZE, ...animationDelay }}
        >
          {/* Once settled only the front face is drawn -- the edge-on side faces peek out at its rounded corners. */}
          {(isRolling ? FACE_TRANSFORMS : FACE_TRANSFORMS.slice(0, 1)).map(
            (transform, i) => {
              const value = shuffledFaces ? shuffledFaces[i] : result;
              return (
                <DieFace key={i} transform={transform}>
                  <span
                    key={isRolling ? "rolling" : "settled"}
                    className={cn(
                      "font-bold tabular-nums leading-none",
                      faceTextSize(value),
                      isRolling
                        ? "text-slate-500"
                        : "animate-in fade-in zoom-in-75 duration-300 ease-out text-slate-900",
                    )}
                  >
                    {value}
                  </span>
                </DieFace>
              );
            },
          )}
        </div>
      </div>
      {props.showSides && (
        <span className="text-[11px] font-medium text-muted-foreground">
          d{props.sides}
        </span>
      )}
    </div>
  );
}
