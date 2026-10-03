"use client";

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

type Props = {
  highlights: Highlights;
  highlightedBySelf: boolean;
  onToggle: () => void;
};

const MAX_FACES = 3;

function highlighterNames(highlights: Highlights) {
  const names = highlights.map((h) =>
    getDisplayName(h.createdBy?.name ?? null),
  );
  if (names.length <= 3) return names.join(", ");
  return `${names.slice(0, 3).join(", ")} and ${names.length - 3} more`;
}

// Who highlighted a message, under its content. Renders nothing until someone has.
export function MessageHighlights(props: Props) {
  const highlights = uniqBy(props.highlights, "userId");
  if (highlights.length === 0) return null;

  const faces = highlights.slice(0, MAX_FACES);

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-pressed={props.highlightedBySelf}
            aria-label={`${highlights.length} highlight${highlights.length === 1 ? "" : "s"}${props.highlightedBySelf ? ", including yours" : ""}`}
            onClick={props.onToggle}
            onDoubleClick={(e) => e.stopPropagation()}
            className={cn(
              "flex h-7 w-fit items-center gap-1.5 rounded-full border py-0.5 pl-2 pr-1 text-xs font-medium tabular-nums transition-colors",
              props.highlightedBySelf
                ? "border-highlight-icon/60 bg-highlight-icon/15 text-foreground hover:bg-highlight-icon/25"
                : "border-border bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <StarFilledIcon className="size-3.5 text-highlight-icon" />
            {highlights.length}
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
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" align="start">
          Highlighted by {highlighterNames(highlights)}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
