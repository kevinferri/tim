"use client";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { MessageData } from "@/components/topics/message";
import { cn } from "@/lib/utils";
import { VariantProps, cva } from "class-variance-authority";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useDateFormatter } from "@/lib/hooks/use-date-formatter";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarIcon,
  EnvelopeClosedIcon,
  StarFilledIcon,
  StarIcon,
} from "@radix-ui/react-icons";
import { UserStatsForTopicResponse } from "@/app/api/topics/[topicId]/user-stats/[userId]/route";
import { ReactNode, useState } from "react";
import { Message, MessageProps } from "@/components/topics/message";
import {
  TooltipProvider,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserStatus } from "@/components/dashboard/user-status";
import { useUserStatus } from "@/components/dashboard/user-status-store";
import { CommandIcon } from "@/components/topics/command-icon";
import { COMMANDS, type CommandName } from "@tim/commands";
import { ReplyIcon } from "@/components/icons/reply-icon";
import type { BadgeRarity } from "@/lib/profile-badges";

export function getInitials(name?: string) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((x) => x.charAt(0))
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

function formatNumber(num: number): string {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  }
  return num.toString();
}

type Props = VariantProps<typeof variants> & {
  id: string;
  topicId?: string | null;
  name?: string | null;
  status: string | null;
  lastStatusUpdate: Date | null;
  imageUrl?: string | null;
  createdAt?: Date;
  disableSheet?: boolean;
  showStatus?: boolean;
  isOnline?: boolean;
  // Hide a status set after this time (e.g. a message's send time), since a status describes now.
  statusVisibleAt?: Date;
  // Renders this instead of the avatar circle as the clickable element that opens the profile sheet -- the sheet's own content is unaffected either way.
  children?: ReactNode;
};

const variants = cva("", {
  variants: {
    variant: {
      default: "shadow-md",
      typing: "animate-typing shadow-glow",
      idle: "opacity-50 shadow-md",
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

// RGB triples for each rarity's border light and glow on the score badge.
const RARITY_GLOW: Record<BadgeRarity, string> = {
  common: "148, 163, 184",
  rare: "56, 189, 248",
  epic: "217, 70, 239",
  legendary: "251, 191, 36",
};

// Overwatch-style rarity plates: rarer badges get richer color and a stronger glow.
// Tooltip labels skip dark: variants since tooltips invert the theme; mid-tones read on both.
const RARITY_STYLES: Record<BadgeRarity, { plate: string; label: string }> = {
  common: {
    plate:
      "border-slate-400/60 from-slate-100 to-slate-200 text-slate-700 dark:border-slate-500/60 dark:from-slate-700/70 dark:to-slate-800/70 dark:text-slate-200",
    label: "text-slate-500",
  },
  rare: {
    plate:
      "border-sky-400/80 from-sky-50 to-sky-200 text-sky-900 shadow-[0_0_6px_rgba(56,189,248,0.35)] dark:from-sky-500/30 dark:to-sky-900/50 dark:text-sky-100",
    label: "text-sky-500",
  },
  epic: {
    plate:
      "border-fuchsia-400/80 from-fuchsia-50 to-fuchsia-200 text-fuchsia-900 shadow-[0_0_8px_rgba(217,70,239,0.4)] dark:from-fuchsia-500/30 dark:to-purple-900/50 dark:text-fuchsia-100",
    label: "text-fuchsia-500",
  },
  legendary: {
    plate:
      "border-amber-400 from-amber-100 to-orange-200 text-amber-950 shadow-[0_0_10px_rgba(251,191,36,0.55)] dark:from-amber-400/40 dark:to-orange-700/50 dark:text-amber-50",
    label: "text-amber-500",
  },
};

function StatRow(props: { label: string; icon: ReactNode; value?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      {/* The label gives way (truncates) before the value ever wraps or overflows. */}
      <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
        <span className="shrink-0">{props.icon}</span>
        <span className="truncate">{props.label}</span>
      </span>
      <span className="flex shrink-0 items-center whitespace-nowrap font-medium tabular-nums">
        {typeof props.value === "number"
          ? formatNumber(props.value)
          : (props.value ?? <Skeleton className="h-4 w-5" />)}
      </span>
    </div>
  );
}

// Static list for inside a tooltip, where nested tooltips don't work.
function CommandBreakdown(props: {
  counts: Partial<Record<CommandName, number>>;
}) {
  const used = COMMANDS.filter((command) => props.counts[command.name]);

  return (
    <span className="flex items-center gap-3 pt-1">
      {used.map((command) => (
        <span key={command.name} className="flex items-center gap-1">
          <CommandIcon name={command.name} className="size-4" />
          {formatNumber(props.counts[command.name] ?? 0)}
        </span>
      ))}
    </span>
  );
}

function GotGave(props: { got: number; gave: number; gaveWord: string }) {
  const word = (text: string) => (
    <span className="text-xs font-normal text-muted-foreground">{text}</span>
  );
  return (
    <span className="flex items-center gap-1">
      {formatNumber(props.got)} {word("got")}
      <span className="text-muted-foreground">·</span>
      {formatNumber(props.gave)} {word(props.gaveWord)}
    </span>
  );
}

export function UserAvatar(props: Props) {
  const [open, setOpen] = useState(false);
  const initials = getInitials(props.name ?? undefined);
  const { status, lastStatusUpdate } = useUserStatus(props.id, {
    status: props.status,
    lastStatusUpdate: props.lastStatusUpdate,
  });
  const since = useDateFormatter(props.createdAt, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const { data } = useQuery({
    queryKey: ["user-stats", props.topicId, props.id],
    queryFn: () =>
      fetch(`/api/topics/${props.topicId}/user-stats/${props.id}`).then((r) => {
        if (!r.ok) throw new Error(`Request failed with status ${r.status}`);
        return r.json() as Promise<UserStatsForTopicResponse>;
      }),
    enabled: !!props.topicId && open,
  });

  const score = data?.highlightScore;
  const badges = data?.badges ?? [];
  const showStatus =
    typeof props.showStatus === "undefined" ? true : props.showStatus;

  const trigger = props.children ? (
    <span
      onClick={() => setOpen(true)}
      className="cursor-pointer hover:opacity-80"
    >
      {props.children}
    </span>
  ) : (
    <div className="relative">
      <Avatar
        onClick={() => setOpen(true)}
        className={cn(
          variants({ size: props.size, variant: props.variant }),
          props.topicId ? "cursor-pointer hover:opacity-80" : "",
        )}
      >
        <AvatarImage
          className="rounded-full"
          src={props.imageUrl ?? undefined}
        />
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      {showStatus && (
        <UserStatus
          status={
            props.statusVisibleAt &&
            lastStatusUpdate &&
            new Date(lastStatusUpdate) > new Date(props.statusVisibleAt)
              ? null
              : status
          }
          userId={props.id}
          lastStatusUpdate={lastStatusUpdate}
          isOnline={props.isOnline}
        />
      )}
    </div>
  );

  if (!props.topicId || !!props.disableSheet) return trigger;

  return (
    <Sheet onOpenChange={setOpen}>
      <SheetTrigger>{trigger}</SheetTrigger>
      <SheetTitle className="hidden"></SheetTitle>
      <SheetContent className="p-0 h-full flex overflow-y-hidden flex-col md:min-w-[460px] w-full">
        <div className="flex flex-col gap-4 h-full overflow-y-hidden">
          <div className="w-full flex flex-col gap-5 p-5 shrink-0 border-b bg-secondary/50">
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-3 pr-6">
                <Avatar className="size-12 shrink-0 shadow-md">
                  <AvatarImage
                    src={props.imageUrl ?? undefined}
                    className="rounded-full"
                  />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>

                <div className="flex min-w-0 flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-xl font-semibold">
                      {props.name}
                    </span>
                    {since && (
                      <span className="flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-px text-[10px] text-muted-foreground">
                        <CalendarIcon className="size-2.5" /> Joined {since}
                      </span>
                    )}
                  </div>

                  {status && (
                    <div className="text-xs text-muted-foreground">
                      <UserStatus
                        status={status}
                        userId={props.id}
                        lastStatusUpdate={lastStatusUpdate}
                        variant="minimal"
                      />
                    </div>
                  )}
                </div>
              </div>
              {data && (
                <TooltipProvider>
                  <div className="flex flex-wrap gap-x-1.5 gap-y-2">
                    {badges.map((badge) => (
                      <Tooltip key={badge.key} delayDuration={100}>
                        {/* Skewed plate, counter-skewed content so the text stays upright. */}
                        {badge.key === "score" ? (
                          // The headline score rank: light streams around its border in the rarity color,
                          // over a steady glow. The plate sits 1.5px inside a rotating conic gradient.
                          <TooltipTrigger
                            className="relative -skew-x-12 cursor-default overflow-hidden rounded-sm p-[1.5px]"
                            style={{
                              boxShadow: `0 0 9px rgba(${RARITY_GLOW[badge.rarity]}, 0.5)`,
                            }}
                          >
                            {/* Centered with margins, not translate: the spin animation owns `transform`. */}
                            <span
                              className="pointer-events-none absolute left-1/2 top-1/2 -ml-[100%] -mt-[100%] aspect-square w-[200%] motion-safe:animate-badge-edge"
                              style={{
                                background: `conic-gradient(from 0deg, rgba(${RARITY_GLOW[badge.rarity]}, 0.2), rgba(${RARITY_GLOW[badge.rarity]}, 0.8) 12%, rgba(${RARITY_GLOW[badge.rarity]}, 0.2) 30%, rgba(${RARITY_GLOW[badge.rarity]}, 0.2) 50%, rgba(${RARITY_GLOW[badge.rarity]}, 0.8) 62%, rgba(${RARITY_GLOW[badge.rarity]}, 0.2) 80%)`,
                              }}
                            />
                            <span
                              className={cn(
                                // Solid base under the semi-transparent gradient, so the light only shows at the edge.
                                "relative block rounded-[2px] bg-background bg-gradient-to-b px-2 py-0.5",
                                RARITY_STYLES[badge.rarity].plate,
                              )}
                            >
                              <span className="flex skew-x-12 items-center gap-1 text-[11px] font-semibold uppercase tracking-wide">
                                {badge.emoji} {badge.label}
                              </span>
                            </span>
                          </TooltipTrigger>
                        ) : (
                          <TooltipTrigger
                            className={cn(
                              "-skew-x-12 cursor-default rounded-sm border bg-gradient-to-b px-2 py-0.5",
                              RARITY_STYLES[badge.rarity].plate,
                            )}
                          >
                            <span className="flex skew-x-12 items-center gap-1 text-[11px] font-semibold uppercase tracking-wide">
                              {badge.emoji} {badge.label}
                            </span>
                          </TooltipTrigger>
                        )}
                        <TooltipContent side="bottom">
                          <div className="flex flex-col gap-0.5">
                            <span
                              className={cn(
                                "text-[10px] font-bold uppercase tracking-wider",
                                RARITY_STYLES[badge.rarity].label,
                              )}
                            >
                              {badge.rarity}
                            </span>
                            {badge.tooltip}
                            {badge.commandBreakdown && (
                              <CommandBreakdown
                                counts={badge.commandBreakdown}
                              />
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </TooltipProvider>
              )}
            </div>

            <div className="flex flex-col gap-2 text-sm">
              {/* The got/gave column needs more room than the single values; stack them on narrow sheets. */}
              <div className="grid grid-cols-1 gap-x-8 gap-y-2 min-[420px]:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
                <div className="flex flex-col gap-2">
                  <StatRow
                    label="Score"
                    icon={<StarIcon />}
                    value={
                      data && (score ? Math.round(score.multiplier * 100) : "—")
                    }
                  />
                  <StatRow
                    label="Sent"
                    icon={<EnvelopeClosedIcon />}
                    value={data?.messagesSent}
                  />
                  <StatRow
                    label="Active days"
                    icon={<CalendarIcon />}
                    value={data?.activeDays}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <StatRow
                    label="Highlights"
                    icon={<StarIcon />}
                    value={
                      data && (
                        <GotGave
                          got={data.highlightsReceived}
                          gave={data.highlightsGiven}
                          gaveWord="gave"
                        />
                      )
                    }
                  />
                  <StatRow
                    label="Replies"
                    icon={<ReplyIcon />}
                    value={
                      data && (
                        <GotGave
                          got={data.repliesReceived}
                          gave={data.repliesGiven}
                          gaveWord="sent"
                        />
                      )
                    }
                  />
                  <StatRow
                    label="Mentions"
                    icon={<span className="leading-none">@</span>}
                    value={
                      data && (
                        <GotGave
                          got={data.mentionsReceived}
                          gave={data.mentionsSent}
                          gaveWord="sent"
                        />
                      )
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-center gap-1.5 px-5">
            {data?.topicName && (
              <>
                <StarFilledIcon className="text-highlight-icon" />
                Top highlights in{" "}
                <span className="font-pronounced">{data.topicName}</span>
              </>
            )}
          </div>

          {data?.topHighlights.length === 0 && (
            <div className="px-5 text-center text-sm text-muted-foreground">
              {props.name} hasn&rsquo;t received any highlights in this topic
            </div>
          )}

          <ScrollArea className="basis-full overflow-y-scroll no-scrollbar">
            {data?.topHighlights.map((message: MessageData) => {
              return (
                <Message
                  key={`${message.id}-user-avatar`}
                  {...message}
                  variant="minimal"
                  context="user-sheet"
                />
              );
            })}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
