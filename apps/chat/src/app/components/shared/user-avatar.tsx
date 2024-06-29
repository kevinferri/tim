"use client";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { VariantProps, cva } from "class-variance-authority";
import { Sheet, SheetContent, SheetTrigger } from "../ui/sheet";
import { useFetch, useTimeZone } from "@/lib/hooks";
import {
  CalendarIcon,
  EnvelopeClosedIcon,
  StarIcon,
} from "@radix-ui/react-icons";
import { UserStatsForTopicResponse } from "@/api/topics/[topicId]/user-stats/[userId]/route";
import { useState } from "react";
import { Message, MessageProps } from "@/topics/message";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { Skeleton } from "../ui/skeleton";

export function getInitials(name?: string) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((x) => x.charAt(0))
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

function getHlScoreEmoji(score?: number) {
  if (!score) {
    return ["0️⃣", "No"];
  }

  if (score > 120) {
    return ["🦄", "Legendary"];
  }

  if (score > 100) {
    return ["🏆", "Elite"];
  }

  if (score > 80) {
    return ["🔥", "Great"];
  }

  if (score > 60) {
    return ["👍", "Good"];
  }

  if (score > 40) {
    return ["😐", "Average"];
  }

  if (score > 20) {
    return ["😬", "Poor"];
  }

  return ["😭", "Pathetic"];
}

type Props = VariantProps<typeof variants> & {
  id: string;
  topicId?: string | null;
  name?: string | null;
  imageUrl?: string | null;
  createdAt?: Date;
  disableSheet?: boolean;
};

const variants = cva("shadow-md", {
  variants: {
    variant: {
      default: "",
      typing:
        "animate-typing shadow-[0_0_1px_white,inset_0_0_1px_white,0_0_2px_#9333ea,0_0_5px_#9333ea,0_0_10px_#9333ea]",
      idle: "opacity-50",
    },
    size: {
      default: "h-9 w-9",
      sm: "h-8 w-8",
      xs: "h-6 w-6",
    },
  },
  defaultVariants: {
    size: "default",
    variant: "default",
  },
});

function StatsLoader() {
  return <Skeleton className="w-[30px] h-8" />;
}

export function UserAvatar(props: Props) {
  const initials = getInitials(props.name ?? undefined);
  const { timeZone } = useTimeZone();
  const [open, setOpen] = useState(false);
  const { data } = useFetch<UserStatsForTopicResponse>(
    `/api/topics/${props.topicId}/user-stats/${props.id}`,
    { skip: !props.topicId || !open }
  );

  const [emoji, rating] = getHlScoreEmoji(data?.highlightScore);

  const since = props.createdAt
    ? new Date(props.createdAt).toLocaleDateString("en-US", {
        timeZone,
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : undefined;

  const trigger = (
    <Avatar
      onClick={() => setOpen(true)}
      className={cn(
        variants({ size: props.size, variant: props.variant }),
        props.topicId ? "cursor-pointer hover:opacity-80" : ""
      )}
    >
      <AvatarImage className="rounded-full" src={props.imageUrl ?? undefined} />
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  );

  if (!props.topicId || !!props.disableSheet) return trigger;

  return (
    <Sheet onOpenChange={setOpen}>
      <SheetTrigger>{trigger}</SheetTrigger>
      <SheetContent className="p-0 min-w-[460px] h-full flex overflow-y-hidden flex-col">
        <div className="flex flex-col gap-4 h-full overflow-y-hidden">
          <div className="bg-secondary w-full flex flex-col items-center px-3 py-6 gap-3 flex-1">
            <Avatar className="w-[140px] h-[140px] shadow-lg">
              <AvatarImage
                src={props.imageUrl ?? undefined}
                className="rounded-full"
              />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>

            <div className="flex flex-col items-center gap-0.5">
              <div className="flex gap-2 items-center">
                <div className="text-2xl font-semibold">
                  {props.name}{" "}
                  {data && (
                    <TooltipProvider>
                      <Tooltip delayDuration={100}>
                        <TooltipTrigger>{emoji}</TooltipTrigger>
                        <TooltipContent side="top">
                          {rating} highlight score
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </div>

              {since && (
                <div className="flex items-center text-xs text-muted-foreground gap-1">
                  <CalendarIcon /> Joined {since}
                </div>
              )}
            </div>

            <div className="flex justify-between mt-3 w-full">
              <div className="flex flex-col items-center flex-1">
                <div className="text-xl">
                  <div
                    className={`text 2xl ${
                      data?.highlightScore
                        ? "bg-highlight rounded-md px-1.5 dark:text-secondary"
                        : ""
                    }`}
                  >
                    {data?.highlightScore ?? <StatsLoader />}
                  </div>
                </div>
                <div className="text-sm flex items-center gap-1">
                  <StarIcon /> Score
                </div>
              </div>

              <div className="flex flex-col items-center flex-1">
                <div className="text-2xl">
                  <div className="text-2xl">
                    {data?.messagesSent ?? <StatsLoader />}
                  </div>
                </div>
                <div className="text-sm flex items-center gap-1.5">
                  <EnvelopeClosedIcon /> Sent
                </div>
              </div>

              <div className="flex flex-col items-center flex-1">
                <div className="text-2xl">
                  {data?.highlightsRecieved ?? <StatsLoader />}
                </div>
                <div className="text-sm flex items-center gap-1">
                  <StarIcon /> Recieved
                </div>
              </div>

              <div className="flex flex-col items-center flex-1">
                <div className="text-2xl">
                  {data?.highlightsGiven ?? <StatsLoader />}
                </div>
                <div className="text-sm flex items-center gap-1">
                  <StarIcon /> Given
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 text-center flex-1">
            {data?.topicName && (
              <>
                Top highlights in{" "}
                <span className="font-pronounced">{data?.topicName}</span>
              </>
            )}
          </div>

          {data?.topHighlights.length === 0 && (
            <div className="px-6 text-center">
              <div className="text-muted-foreground text-sm">
                {props.name} hasn&rsquo;t recieved any highlights in this topic
              </div>
            </div>
          )}

          <div className="basis-full overflow-y-scroll">
            {data?.topHighlights.map((message: MessageProps) => {
              return (
                <Message
                  key={`${message.id}-user-avatar`}
                  {...message}
                  variant="minimal"
                  context="user-sheet"
                />
              );
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
