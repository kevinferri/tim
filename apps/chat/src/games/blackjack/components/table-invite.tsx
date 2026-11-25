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
        {/* The table's felt colors (table-layout.tsx). */}
        <div className="flex size-12 shrink-0 items-center justify-center self-center text-emerald-800">
          <BlackjackIcon className="size-7 transition-transform duration-300 group-hover:-rotate-6 motion-reduce:transition-none" />
        </div>
      </Link>
    </figure>
  );
}
