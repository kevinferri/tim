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
import { cn } from "@/lib/utils";
import { MAX_GUESSES, WORD_LENGTH } from "../lib/rules";
import { Tile } from "./tiles";

type Props = {
  className?: string;
  /** Stop a parent button/card from receiving the click. */
  stopPropagation?: boolean;
};

export function WordsmithInfoButton({ className, stopPropagation }: Props) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="iconSm"
          className={cn("text-muted-foreground", className)}
          aria-label="How Wordsmith works"
          onClick={(e) => {
            if (stopPropagation) e.stopPropagation();
          }}
        >
          <InfoCircledIcon className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md gap-0 p-0 sm:max-w-md">
        <DialogHeader className="border-b px-5 py-4 text-left">
          <DialogTitle>How Wordsmith works</DialogTitle>
          <DialogDescription className="sr-only">
            Rules for the Wordsmith daily word game
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 px-5 py-4 text-sm">
          <section className="space-y-1.5">
            <h3 className="font-medium">How to Play</h3>
            <p className="text-muted-foreground leading-relaxed">
              Find the hidden {WORD_LENGTH}-letter word in {MAX_GUESSES}{" "}
              guesses. Everyone on Tim gets the same word, and a new one arrives
              at midnight EST every weekday. You play once a day and your result
              shows in every circle that has Wordsmith on.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-medium">Reading the tiles</h3>
            <div className="flex items-center gap-3 text-muted-foreground">
              <Tile letter="a" score="hit" size="sm" />
              <span>Right letter, right spot</span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <Tile letter="b" score="near" size="sm" />
              <span>In the word, but somewhere else</span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <Tile letter="c" score="miss" size="sm" />
              <span>Not in the word</span>
            </div>
          </section>

          <section className="space-y-1.5">
            <h3 className="font-medium">Your circle</h3>
            <p className="text-muted-foreground leading-relaxed">
              Until you finish, you only see who’s done and how many guesses
              they took. Once you finish, everyone’s guesses are revealed.
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
