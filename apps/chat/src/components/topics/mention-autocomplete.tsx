"use client";

import { useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getDisplayName } from "@tim/user-display";
import { cn } from "@/lib/utils";

export type MentionCandidate = {
  id: string;
  name: string;
  imageUrl: string | null;
  isOnline: boolean;
};

type Props = {
  // Pre-sorted by the caller: online members alphabetically, then offline
  // members alphabetically -- this component just groups consecutive runs
  // under an "Online"/"Offline" header rather than re-deriving the order.
  members: MentionCandidate[];
  selectedIndex: number;
  onSelect: (member: MentionCandidate) => void;
  onHover: (index: number) => void;
};

export function MentionAutocomplete({
  members,
  selectedIndex,
  onSelect,
  onHover,
}: Props) {
  let lastSection: boolean | undefined;
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    itemRefs.current[selectedIndex]?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  return (
    <div
      role="listbox"
      className="absolute bottom-full left-0 right-0 z-50 mb-2 max-h-64 overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
    >
      {members.map((member, index) => {
        const showHeader = member.isOnline !== lastSection;
        lastSection = member.isOnline;
        const isSelected = index === selectedIndex;

        return (
          <div key={member.id}>
            {showHeader && (
              <div className="px-2 pt-1.5 pb-1 text-xs font-medium text-muted-foreground first:pt-0.5">
                {member.isOnline ? "Online" : "Offline"}
              </div>
            )}
            <div
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              role="option"
              aria-selected={isSelected}
              // mousedown (not click) fires before the textarea blurs, so
              // selection still lands while the input keeps focus
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(member);
              }}
              onMouseEnter={() => onHover(index)}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm",
                isSelected ? "bg-accent text-accent-foreground" : "",
                member.isOnline ? "" : "opacity-60"
              )}
            >
              <Avatar className="h-6 w-6">
                <AvatarImage src={member.imageUrl ?? undefined} />
                <AvatarFallback className="text-xs">
                  {member.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              {/* Selecting inserts this same display name (see
                  selectMention in topic-message-bar.tsx) -- full name is
                  only ever a hover tooltip, never shown outright. */}
              <span title={member.name}>{getDisplayName(member.name)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
