"use client";

import { Button } from "@/components/ui/button";
import { Highlights } from "./message";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { StarFilledIcon, StarIcon } from "@radix-ui/react-icons";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

type Props = {
  messageId: string;
  highlights: Highlights;
  highlightedBySelf: boolean;
  onHighlight: () => void;
};

const DELAY = 100;
const HIGHLIGHT_ICON_COLOR = "#dfa0a1";

export const HighlightTooltip = (props: Props) => {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={DELAY}>
        <TooltipTrigger
          className="text-xs"
          onClick={(event) => event.preventDefault()}
        >
          <div className="flex gap-0.5 items-center w-9">
            <Button
              variant="ghost"
              size="iconSm"
              asChild
              className="h-6 w-6 p-1 hover:bg-slate-200 dark:hover:bg-slate-700"
              onClick={props.onHighlight}
            >
              {props.highlightedBySelf ? (
                <StarFilledIcon color={HIGHLIGHT_ICON_COLOR} />
              ) : (
                <StarIcon color={HIGHLIGHT_ICON_COLOR} />
              )}
            </Button>
            {props.highlights.length}
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="left"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <div className="flex gap-2">
            {props.highlights.length > 0
              ? props.highlights.map(({ highlightedBy }) => {
                  return (
                    <Avatar key={highlightedBy.imageUrl} className="h-7 w-7">
                      <AvatarImage
                        className="rounded-full"
                        src={highlightedBy.imageUrl ?? undefined}
                      />
                    </Avatar>
                  );
                })
              : "This message has no highlights"}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
