"use client";

import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { EmojiCandidate } from "@/lib/emoji-shortcodes";

type Props = {
  emojis: EmojiCandidate[];
  selectedIndex: number;
  onSelect: (emoji: EmojiCandidate) => void;
  onHover: (index: number) => void;
};

export function EmojiAutocomplete({
  emojis,
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
          {emojis.map((emoji, index) => (
            <div
              key={emoji.shortcode}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              role="option"
              aria-selected={index === selectedIndex}
              // mousedown fires before the textarea blurs, keeping focus
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(emoji);
              }}
              onMouseEnter={() => onHover(index)}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm",
                index === selectedIndex
                  ? "bg-accent text-accent-foreground"
                  : "",
              )}
            >
              <span className="text-lg leading-none">{emoji.native}</span>
              <span>:{emoji.shortcode}:</span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
