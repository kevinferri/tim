"use client";

import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export type TopicLinkCandidate = {
  id: string;
  name: string;
};

type Props = {
  topics: TopicLinkCandidate[];
  selectedIndex: number;
  onSelect: (topic: TopicLinkCandidate) => void;
  onHover: (index: number) => void;
};

export function TopicLinkAutocomplete({
  topics,
  selectedIndex,
  onSelect,
  onHover,
}: Props) {
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    itemRefs.current[selectedIndex]?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  return (
    <div
      role="listbox"
      className="absolute bottom-full left-0 right-0 z-50 mb-2 max-h-64 rounded-md border bg-popover text-popover-foreground shadow-md"
    >
      <ScrollArea className="max-h-64">
        <div className="p-1">
          {topics.map((topic, index) => {
            const isSelected = index === selectedIndex;

            return (
              <div
                key={topic.id}
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                role="option"
                aria-selected={isSelected}
                // mousedown (not click) fires before the textarea blurs, so
                // selection still lands while the input keeps focus
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(topic);
                }}
                onMouseEnter={() => onHover(index)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm",
                  isSelected ? "bg-accent text-accent-foreground" : "",
                )}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
                  #
                </span>
                <span>{topic.name}</span>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
