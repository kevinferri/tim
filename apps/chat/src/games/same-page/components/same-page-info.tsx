"use client";

import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** Stop a parent button/card from receiving the click. */
  stopPropagation?: boolean;
};

export function SamePageInfoButton({ className, stopPropagation }: Props) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="iconSm"
          className={cn("text-muted-foreground", className)}
          aria-label="How Same Page works"
          onClick={(e) => {
            if (stopPropagation) e.stopPropagation();
          }}
        >
          <InfoCircledIcon className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md gap-0 p-0 sm:max-w-md">
        <DialogHeader className="border-b px-5 py-4 text-left">
          <DialogTitle>How Same Page works</DialogTitle>
          <DialogDescription className="sr-only">
            Rules for the Same Page daily game
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[min(70vh,28rem)]">
          <div className="space-y-4 px-5 py-4 text-sm">
            <section className="space-y-1.5">
              <h3 className="font-medium">How to Play</h3>
              <p className="text-muted-foreground leading-relaxed">
                Weekdays only. A prompt drops at 6am EST. Answer in 3 words or
                fewer, optionally call who you think matched you, then lock it
                in. Answers can’t be changed. Results reveal together at 4pm
                EST.
              </p>
            </section>

            <section className="space-y-1.5">
              <h3 className="font-medium">Your Result</h3>
              <ul className="list-disc space-y-1 pl-4 text-muted-foreground leading-relaxed">
                <li>
                  <span className="text-foreground">Same Page</span> — you
                  thought alike
                </li>
                <li>
                  <span className="text-foreground">Called it</span> — your
                  answers matched
                </li>
                <li>
                  <span className="text-foreground">Just you</span> — nobody
                  else shared your answer
                </li>
              </ul>
            </section>

            <section className="space-y-1.5">
              <h3 className="font-medium">The Sock 🧦</h3>
              <p className="text-muted-foreground leading-relaxed">
                If you’re the only person with a unique answer (and at least 3
                people played), you get stuck with the Sock. If more than one
                person is unique, or everyone matched someone, it doesn’t move.
              </p>
            </section>

            <section className="space-y-1.5">
              <h3 className="font-medium">Standings</h3>
              <p className="text-muted-foreground leading-relaxed">
                Lifetime stats never reset: played, streaks, match rate, call
                accuracy, and how often you’ve worn the Sock. Miss a weekday and
                your streak resets; weekends don’t count.
              </p>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
