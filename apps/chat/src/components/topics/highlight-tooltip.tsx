"use client";
import uniqBy from "lodash.uniqby";
import { Button } from "@/components/ui/button";
import { Highlights } from "@/components/topics/message";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { StarFilledIcon, StarIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

type Props = {
  className?: string;
  messageId: string;
  highlights: Highlights;
  highlightedBySelf: boolean;
  onHighlight: () => void;
};

const DELAY = 100;
const HIGHLIGHT_ICON_COLOR = "#dfa0a1";

export const HighlightTooltip = (props: Props) => {
  const highlights = uniqBy(props.highlights, "userId");

  return (
    <TooltipProvider>
      <Tooltip delayDuration={DELAY}>
        <TooltipTrigger
          className="text-xs cursor-default"
          onClick={(event) => event.preventDefault()}
        >
          <div
            className={cn(
              "flex gap-0.5 items-center w-9 mt-2",
              props.className
            )}
          >
            <Button
              variant="ghost"
              size="iconSm"
              asChild
              className="cursor-pointer h-6 w-6 p-1 hover:bg-slate-200 dark:hover:bg-slate-700"
              onClick={props.onHighlight}
              type="button"
            >
              {props.highlightedBySelf ? (
                <StarFilledIcon color={HIGHLIGHT_ICON_COLOR} />
              ) : (
                <StarIcon color={HIGHLIGHT_ICON_COLOR} />
              )}
            </Button>
            {highlights.length}
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="left"
          onPointerDownOutside={(e) => e.preventDefault()}
          className={`px-2 ${highlights.length === 0 ? "hidden" : ""}`}
        >
          <div className="flex gap-1.5">
            {highlights.map(({ createdBy, id }) => {
              if (!createdBy) return null;
              return (
                <Avatar key={id} className="h-7 w-7">
                  <AvatarImage
                    className="rounded-full"
                    src={createdBy.imageUrl ?? undefined}
                  />
                </Avatar>
              );
            })}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
