"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import uniqBy from "lodash.uniqby";
import { StarFilledIcon } from "@radix-ui/react-icons";
import { getDisplayName } from "@tim/user-display";
import type { Highlights } from "@/components/topics/message";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { playHighlightChime } from "@/lib/highlight-chime";

export type HighlightBurst = {
  // Bumped each time the count goes up; remounting on it replays the animations.
  key: number;
  // You did it: sparks, a chime and a haptic tick on top.
  own: boolean;
};

type Props = {
  highlights: Highlights;
  highlightedBySelf: boolean;
  onToggle: () => void;
  burst: HighlightBurst;
};

const MAX_FACES = 3;
const SPARK_COUNT = 8;
const SPARK_DISTANCE = 26;
const SPARK_DURATION_MS = 600;

// Shows only a thin ring of the rotating gradient behind it.
const RING_MASK: CSSProperties = {
  padding: 2,
  WebkitMask:
    "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
  WebkitMaskComposite: "xor",
  mask: "linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)",
};

const SWEEP_GRADIENT =
  "conic-gradient(from 0deg, transparent 0%, hsl(var(--highlight-icon)) 10%, transparent 25%, transparent 50%, hsl(var(--highlight-icon)) 60%, transparent 75%)";

function highlighterNames(highlights: Highlights) {
  const names = highlights.map((h) =>
    getDisplayName(h.createdBy?.name ?? null),
  );
  if (names.length <= 3) return names.join(", ");
  return `${names.slice(0, 3).join(", ")} and ${names.length - 3} more`;
}

// Tracks increases in a message's highlight count across renders. Starts at rest,
// so loading or scrolling a message back into view doesn't replay anything.
export function useHighlightBurst(
  count: number,
  highlightedBySelf: boolean,
): HighlightBurst {
  const [burst, setBurst] = useState<HighlightBurst>({ key: 0, own: false });
  const seen = useRef({ count, highlightedBySelf });

  useEffect(() => {
    const prev = seen.current;
    seen.current = { count, highlightedBySelf };
    if (count <= prev.count) return;
    setBurst((b) => ({
      key: b.key + 1,
      own: highlightedBySelf && !prev.highlightedBySelf,
    }));
  }, [count, highlightedBySelf]);

  return burst;
}

// Portaled to the body: the message column clips overflow, which would cut the sparks off.
// Follows the star every frame, since the transcript re-anchors its scroll as the pill appears.
function Sparks(props: { anchor: RefObject<HTMLElement | null> }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = requestAnimationFrame(function follow() {
      const rect = props.anchor.current?.getBoundingClientRect();
      const container = containerRef.current;
      if (rect && container) {
        container.style.left = `${rect.left + rect.width / 2}px`;
        container.style.top = `${rect.top + rect.height / 2}px`;
        container.style.visibility = "visible";
      }
      frame = requestAnimationFrame(follow);
    });
    return () => cancelAnimationFrame(frame);
  }, [props.anchor]);

  return createPortal(
    <div
      ref={containerRef}
      aria-hidden
      className="pointer-events-none invisible fixed z-50 motion-reduce:hidden"
    >
      {Array.from({ length: SPARK_COUNT }, (_, i) => {
        const angle = (i / SPARK_COUNT) * 2 * Math.PI - Math.PI / 2;
        const distance = SPARK_DISTANCE * (i % 2 ? 0.65 : 1);
        return (
          <span
            key={i}
            className={cn(
              "absolute -ml-[2.5px] -mt-[2.5px] rounded-full bg-highlight-icon animate-highlight-spark",
              i % 2 ? "size-1" : "size-[5px]",
            )}
            style={
              {
                "--spark-x": `${Math.cos(angle) * distance}px`,
                "--spark-y": `${Math.sin(angle) * distance}px`,
              } as CSSProperties
            }
          />
        );
      })}
    </div>,
    document.body,
  );
}

// Who highlighted a message, under its content. Renders nothing until someone has.
export function MessageHighlights(props: Props) {
  const starRef = useRef<HTMLSpanElement>(null);
  const [sparkKey, setSparkKey] = useState<number | null>(null);
  const { key: burstKey, own } = props.burst;

  useEffect(() => {
    if (burstKey === 0 || !own) return;
    setSparkKey(burstKey);
    navigator.vibrate?.(10);
    playHighlightChime();
    const timeout = setTimeout(() => setSparkKey(null), SPARK_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [burstKey, own]);

  const highlights = uniqBy(props.highlights, "userId");
  if (highlights.length === 0) return null;

  const faces = highlights.slice(0, MAX_FACES);
  const bursting = burstKey > 0;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <button
            // Remounts on each burst so the flash replays.
            key={burstKey}
            type="button"
            aria-pressed={props.highlightedBySelf}
            aria-label={`${highlights.length} highlight${highlights.length === 1 ? "" : "s"}${props.highlightedBySelf ? ", including yours" : ""}`}
            onClick={props.onToggle}
            onDoubleClick={(e) => e.stopPropagation()}
            className={cn(
              "relative flex h-7 w-fit items-center gap-1.5 rounded-full border py-0.5 pl-2 pr-1 text-xs font-medium tabular-nums transition-colors",
              props.highlightedBySelf
                ? "border-highlight-icon/60 bg-highlight-icon/15 text-foreground hover:bg-highlight-icon/25"
                : "border-border bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground",
              bursting && "motion-safe:animate-highlight-flash",
            )}
          >
            {bursting && (
              <span
                aria-hidden
                className="pointer-events-none absolute -inset-px overflow-hidden rounded-full motion-reduce:hidden"
                style={RING_MASK}
              >
                {/* Centered with margins, not translate: the sweep animation owns `transform`. */}
                <span
                  className="absolute left-1/2 top-1/2 -ml-[100%] -mt-[100%] aspect-square w-[200%] animate-highlight-sweep"
                  style={{ background: SWEEP_GRADIENT }}
                />
              </span>
            )}
            <span
              ref={starRef}
              className={cn(
                "flex",
                bursting && "motion-safe:animate-highlight-pop",
              )}
            >
              <StarFilledIcon className="size-3.5 text-highlight-icon" />
            </span>
            <span
              key={`count-${highlights.length}`}
              className={cn(
                bursting &&
                  "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 duration-300",
              )}
            >
              {highlights.length}
            </span>
            <span className="flex -space-x-1.5">
              {faces.map((h) => (
                <Avatar
                  key={h.id}
                  className="size-5 border-2 border-background active:scale-100"
                >
                  <AvatarImage src={h.createdBy?.imageUrl ?? undefined} />
                  <AvatarFallback className="text-[8px]">
                    {getDisplayName(h.createdBy?.name ?? null).slice(0, 1)}
                  </AvatarFallback>
                </Avatar>
              ))}
            </span>
            {sparkKey !== null && (
              <Sparks key={`sparks-${sparkKey}`} anchor={starRef} />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" align="start">
          Highlighted by {highlighterNames(highlights)}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
