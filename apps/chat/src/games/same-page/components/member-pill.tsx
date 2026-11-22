"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/components/ui/user-avatar";
import { cn } from "@/lib/utils";
import { PRESS } from "@/lib/press";

type Props = {
  member: {
    displayName: string;
    name: string | null;
    imageUrl: string | null;
  };
  selected: boolean;
  onClick: () => void;
};

// The avatar tells apart members who share a display name.
export function MemberPill({ member, selected, onClick }: Props) {
  return (
    <button
      type="button"
      className={cn(
        "flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-3 text-sm transition",
        PRESS,
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-background hover:bg-muted",
      )}
      onClick={onClick}
      aria-pressed={selected}
    >
      <Avatar className="size-6 active:scale-100">
        <AvatarImage
          className="rounded-full"
          src={member.imageUrl ?? undefined}
          alt=""
        />
        <AvatarFallback className="text-[10px] font-medium text-foreground">
          {getInitials(member.name ?? member.displayName)}
        </AvatarFallback>
      </Avatar>
      {member.displayName}
    </button>
  );
}
