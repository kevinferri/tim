import { useState } from "react";
import { cn } from "@/lib/utils";
import { remainingAnimationMs } from "@/components/topics/message-utils";

type Props = {
  content: string;
  createdAt?: Date;
};

// Matches the fixed format eightBall() in command-handler.ts produces --
// "🎱 It is certain." -- so the emoji can be dropped (the message already
// gets a 🎱 icon via CommandIcon) without hand-parsing the whole string.
const EIGHT_BALL_PATTERN = /^🎱 (.+)$/;

// Shake + reveal, see the eight-ball-* keyframes in tailwind.config.js.
const REVEAL_DURATION_MS = 3000;

export function EightBallResult(props: Props) {
  const match = props.content.match(EIGHT_BALL_PATTERN);
  const answer = match ? match[1] : props.content;
  // Decided once at mount so a re-render can't cut the animation short.
  const [animate] = useState(
    () =>
      remainingAnimationMs(
        REVEAL_DURATION_MS,
        props.createdAt ? new Date(props.createdAt).getTime() : undefined,
      ) > 0,
  );

  return (
    // Room for the shake; the negative margin keeps the ball on the text's left edge.
    <div className="-ml-1.5 p-1.5">
      <div
        role="img"
        aria-label={`Magic 8-ball: ${answer}`}
        className={cn(
          "relative flex size-[150px] items-center justify-center rounded-full",
          "bg-[radial-gradient(circle_at_32%_26%,#6b7280_0%,#1f2937_22%,#030712_60%)]",
          animate && "animate-eight-ball-shake",
        )}
      >
        <div className="flex size-[116px] items-center justify-center overflow-hidden rounded-full bg-[radial-gradient(circle,#172554_0%,#020617_75%)] shadow-[inset_0_4px_10px_rgba(0,0,0,0.9)] ring-2 ring-black/80">
          {/* Lifted to keep the corners inside the window; glow is on the inner div since reveal animates `filter`. */}
          <div
            className={cn(
              "relative -top-[9px]",
              animate && "animate-eight-ball-reveal",
            )}
          >
            <div className="relative h-[80px] w-[92px] [filter:drop-shadow(0_0_6px_rgba(59,130,246,0.45))]">
              <div className="absolute inset-0 bg-gradient-to-b from-blue-500 to-blue-800 [clip-path:polygon(50%_0,100%_100%,0_100%)]" />
              <p className="absolute inset-x-[12px] bottom-[3px] top-[36px] flex items-center justify-center text-center text-[9px] font-bold uppercase leading-[1.1] tracking-tight text-white/95">
                {answer.replace(/\.$/, "")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
