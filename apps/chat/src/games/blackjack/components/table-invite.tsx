"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { PlayingCard, cardOverlap } from "@/games/casino";
import { blackjackTablePath } from "../lib/table-link";
import { BlackjackIcon } from "./icon";

/** A sit-down message's whole body: who's at which table, and a way to join them, laid out like a link preview. */
export function TableInvite({ circleId }: { circleId: string }) {
  return (
    // Matches AttachmentFrame, which can't be imported here without a cycle.
    <figure className="w-full max-w-full overflow-hidden rounded-lg border bg-secondary/40 transition-colors hover:bg-secondary sm:max-w-md">
      <Link
        href={blackjackTablePath(circleId)}
        className="group flex items-stretch gap-3 p-2.5"
      >
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
          <span className="text-sm font-semibold leading-snug">
            Entered the casino
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {/* Down a pixel: centered on the caps, it reads high next to mostly lowercase text. */}
            <BlackjackIcon className="size-3.5 shrink-0 translate-y-px" />
            Sat at the blackjack table
          </span>
          {/* A span with button styles: the whole card is the link. */}
          <span
            className={buttonVariants({
              variant: "secondary",
              size: "sm",
              // The card hovers to bg-secondary too; a foreground tint keeps the button visible on it.
              className: "mt-1.5 w-fit group-hover:bg-foreground/[0.12]",
            })}
          >
            Join me
          </span>
        </div>
        {/* Fills the card's height: square beside the usual text, taller if it wraps. */}
        <div className="flex min-h-20 w-20 shrink-0 items-center justify-center rounded-md bg-emerald-800 shadow-[inset_0_0_10px_rgba(0,0,0,0.45)] ring-1 ring-black/20 dark:bg-[#123a2f]">
          <div className="flex scale-[1.15]">
            <PlayingCard
              card={{ rank: "A", suit: "spades" }}
              size="sm"
              dealDelayMs={null}
            />
            <PlayingCard
              card={null}
              size="sm"
              dealDelayMs={null}
              className={cn(
                cardOverlap("sm"),
                "origin-bottom-left transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:rotate-[8deg] motion-reduce:transition-none",
              )}
            />
          </div>
        </div>
      </Link>
    </figure>
  );
}
