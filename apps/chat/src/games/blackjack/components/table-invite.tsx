"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
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
          <span className="text-xs text-muted-foreground">
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
        {/* Fills the card's height: square beside the usual text. */}
        <div className="flex min-h-20 w-20 shrink-0 items-center justify-center rounded-md bg-emerald-600/10 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400">
          <BlackjackIcon className="size-9 transition-transform duration-300 group-hover:-rotate-6 motion-reduce:transition-none" />
        </div>
      </Link>
    </figure>
  );
}
