"use client";

import {
  getMessagePositionFlags,
  useTopicHighlightsContext,
  useTopicMessagesContext,
} from "@/components/topics/current-topic-provider";
import { Message, MessageProps } from "@/components/topics/message";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HIGHLIGHT_PERIODS, HighlightPeriod } from "@/lib/highlight-period";
import { cn } from "@/lib/utils";

export function TopHighlightsHeader() {
  const { period, setPeriod } = useTopicHighlightsContext();

  return (
    <div className="flex items-center justify-center gap-0.5">
      <span>Top highlights</span>
      <Select
        value={period}
        onValueChange={(v) => setPeriod(v as HighlightPeriod)}
      >
        <SelectTrigger className="h-7 w-auto gap-1 border-0 pl-1.5 pr-1 text-[length:inherit] text-muted-foreground shadow-none hover:bg-accent hover:text-accent-foreground focus:ring-0 focus-visible:ring-1 data-[state=open]:bg-accent">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {HIGHLIGHT_PERIODS.map((p) => (
            <SelectItem key={p.value} value={p.value}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function TopHighlights() {
  const { topHighlights, isLoadingPeriod, period } =
    useTopicHighlightsContext();
  const { recency } = useTopicMessagesContext();

  if (topHighlights.length === 0 && !isLoadingPeriod) {
    return (
      <div className="px-5 pt-4 text-center text-sm text-muted-foreground">
        {period === "allTime"
          ? "No highlights yet"
          : `No highlights ${HIGHLIGHT_PERIODS.find((p) => p.value === period)?.label}`}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "transition-opacity",
        isLoadingPeriod && "pointer-events-none opacity-50",
      )}
    >
      {topHighlights.map((message: MessageProps, i) => {
        return (
          <Message
            key={message.id}
            {...message}
            {...getMessagePositionFlags(recency, message.id)}
            // Toolbar placement is relative to this list, not the transcript.
            isFirstMessage={i === 0}
          />
        );
      })}
    </div>
  );
}
