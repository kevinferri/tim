"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { NewsGlyph } from "./news-glyph";
import { useNewsStore } from "./news-store";
import { useHasUnreadNews } from "./use-news";

function UnreadDot({
  className = "right-0.5 top-0.5",
}: {
  className?: string;
}) {
  return (
    <span
      className={`absolute h-2 w-2 rounded-full bg-sky-500 ring-2 ring-background ${className}`}
      aria-hidden
    />
  );
}

/** Circle sidebar entry point to the News panel, styled like the Game room button beside it. */
export function NewsButton({
  circleId,
  isMinimized,
}: {
  circleId: string;
  isMinimized: boolean;
}) {
  const openPanel = useNewsStore((s) => s.openPanel);
  const hasUnread = useHasUnreadNews(circleId);
  const label = hasUnread ? "News (new stories)" : "News";

  if (isMinimized) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="relative rounded-full"
              aria-label={label}
              onClick={openPanel}
            >
              <NewsGlyph className="h-4 w-4" />
              {hasUnread && <UnreadDot />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">News</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Button
      variant="ghost"
      className="flex w-full gap-3"
      aria-label={label}
      onClick={openPanel}
    >
      <span>News</span>
      <span className="relative">
        <NewsGlyph className="h-4 w-4" />
        {hasUnread && <UnreadDot className="-right-1 -top-1" />}
      </span>
    </Button>
  );
}
