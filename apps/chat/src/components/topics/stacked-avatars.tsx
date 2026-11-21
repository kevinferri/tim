"use client";

import { Fragment, type ReactNode } from "react";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ActiveUser } from "@/components/dashboard/active-circle-members-store";
import { cn } from "@/lib/utils";

type Props = {
  users: ActiveUser[];
  /** Faces shown before the rest collapse into +N. */
  maxFaces?: number;
  /** Matches what's behind the stack, so each face reads as cut out of the next. */
  ringClass: string;
  /** Spread the faces apart on hover, with a name tooltip on each. Off inside another tooltip: opening one closes the other. */
  unfurl?: boolean;
};

export function StackedAvatars({
  users,
  maxFaces = 3,
  ringClass,
  unfurl = false,
}: Props) {
  const faces = users.slice(0, maxFaces);
  const hidden = users.slice(faces.length);
  const slots = faces.length + (hidden.length > 0 ? 1 : 0);
  // Every slot after the first: overlapped at rest, a small gap when spread.
  const slot = (i: number) =>
    cn(
      "relative rounded-full ring-2 transition-[margin,transform] duration-200 ease-out",
      ringClass,
      i > 0 && "-ml-1.5",
      unfurl && i > 0 && "group-hover/stack:ml-1",
      unfurl && "hover:z-10 hover:-translate-y-px",
    );
  // A slight stagger, opening from the right edge outward.
  const delay = (i: number) =>
    unfurl ? { transitionDelay: `${(slots - 1 - i) * 15}ms` } : undefined;

  const tip = (key: string, trigger: ReactNode, label: string) =>
    unfurl ? (
      <Tooltip key={key}>
        <TooltipTrigger asChild>{trigger}</TooltipTrigger>
        <TooltipContent side="bottom">{label}</TooltipContent>
      </Tooltip>
    ) : (
      <Fragment key={key}>{trigger}</Fragment>
    );

  const stack = (
    <div className="group/stack flex items-center">
      {faces.map((user, i) =>
        tip(
          user.id,
          <span className={slot(i)} style={delay(i)}>
            <UserAvatar
              id={user.id}
              name={user.name}
              displayName={user.displayName}
              imageUrl={user.imageUrl}
              createdAt={user.createdAt}
              size="xs"
              showStatus={false}
              status={user.status}
              lastStatusUpdate={user.lastStatusUpdate}
            />
          </span>,
          user.displayName,
        ),
      )}
      {hidden.length > 0 &&
        tip(
          "more",
          <span
            className={cn(
              slot(faces.length),
              "flex size-6 items-center justify-center bg-sidebar shadow-[inset_0_0_0_100px_hsl(var(--muted-foreground)/0.25)] text-[10px] font-medium text-muted-foreground",
            )}
            style={delay(faces.length)}
          >
            +{hidden.length}
          </span>,
          hidden.map((u) => u.displayName).join(", "),
        )}
    </div>
  );

  return (
    <TooltipProvider delayDuration={300} skipDelayDuration={0}>
      {stack}
    </TooltipProvider>
  );
}
