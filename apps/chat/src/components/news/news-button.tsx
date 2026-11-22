"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HEADER_CIRCLE_SIZE, NAV_ICON_CIRCLE } from "@/lib/nav-icon";
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
  placement,
  className,
}: {
  circleId: string;
  /** "header": the circle name row. "rail": the minimized sidebar. */
  placement: "header" | "rail";
  className?: string;
}) {
  const inHeader = placement === "header";
  const openPanel = useNewsStore((s) => s.openPanel);
  const hasUnread = useHasUnreadNews(circleId);
  const label = hasUnread ? "News feed (new stories)" : "News feed";

  return (
    <TooltipProvider>
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <Button
            variant={inHeader ? "ghost" : "secondary"}
            size="icon"
            className={cn(
              "relative rounded-full",
              inHeader &&
                cn(
                  "group hover:bg-transparent active:scale-100",
                  HEADER_CIRCLE_SIZE,
                ),
              className,
            )}
            aria-label={label}
            onClick={openPanel}
          >
            {/* The dot rides on the icon, so it stays put however wide the button is. */}
            <span className={cn(inHeader && NAV_ICON_CIRCLE)}>
              <span className="relative">
                <NewsGlyph className="h-4 w-4" />
                {hasUnread && <UnreadDot className="-right-1 -top-1" />}
              </span>
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side={inHeader ? "bottom" : "right"}>
          News feed
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
