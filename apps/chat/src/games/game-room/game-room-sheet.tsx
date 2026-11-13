"use client";

import { Cross2Icon, ChevronLeftIcon } from "@radix-ui/react-icons";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { BadgeDot, useGameBadges } from "./badges";
import { useGameRoomStore } from "./store";
import type { GameDefinition } from "./types";

type Props = {
  circleId: string;
  games: GameDefinition[];
};

export function GameRoomSheet({ circleId, games }: Props) {
  const {
    open: storeOpen,
    circleId: targetCircleId,
    activeGameId,
    openGame,
    close,
    backToHub,
  } = useGameRoomStore();
  const open =
    storeOpen && (targetCircleId === null || targetCircleId === circleId);
  const activeGame = games.find((g) => g.id === activeGameId) ?? null;
  const badges = useGameBadges(circleId, games);

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      <SheetContent
        side="right"
        className="flex w-3/4 flex-col gap-0 p-0 sm:max-w-md [&>button]:hidden"
      >
        <SheetTitle className="sr-only">
          {activeGame?.name ?? "Game room"}
        </SheetTitle>
        <div className="flex items-center gap-1 border-b px-3 py-3 shrink-0">
          {activeGame && (
            <Button
              variant="ghost"
              size="iconSm"
              onClick={backToHub}
              aria-label="Back to Game room"
            >
              <ChevronLeftIcon />
            </Button>
          )}
          {activeGame && (
            <activeGame.Icon className="size-4 shrink-0 text-muted-foreground" />
          )}
          <div className="min-w-0 flex-1 truncate font-semibold">
            {activeGame ? (
              <>
                {activeGame.name}
                {activeGame.TitleSuffix && (
                  <span className="text-sm font-normal text-muted-foreground">
                    <activeGame.TitleSuffix />
                  </span>
                )}
              </>
            ) : (
              "Game room"
            )}
          </div>
          {activeGame?.InfoButton && <activeGame.InfoButton />}
          <Button
            variant="ghost"
            size="iconSm"
            onClick={close}
            aria-label="Close Game room"
          >
            <Cross2Icon />
          </Button>
        </div>

        {activeGame ? (
          <activeGame.Panel circleId={circleId} />
        ) : (
          <ScrollArea className="flex-1">
            <div className="flex flex-col gap-2 p-3">
              <p className="text-sm text-muted-foreground px-1 pb-1">
                More coming soon.
              </p>
              {games.map((game) => (
                <div
                  key={game.id}
                  className={cn(
                    "relative rounded-lg border bg-card transition-colors",
                    "hover:bg-accent/40 focus-within:ring-2 focus-within:ring-ring",
                  )}
                >
                  <button
                    type="button"
                    className="flex w-full items-start gap-3 px-3 py-3 pr-10 text-left focus-visible:outline-none"
                    onClick={() => openGame(game.id)}
                  >
                    <div className="relative mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md border bg-background">
                      <game.Icon className="size-5" />
                      <BadgeDot
                        badge={badges[game.id] ?? null}
                        className="-right-1 -top-1"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">
                        {game.name}
                        {badges[game.id] && (
                          <span className="sr-only">
                            {badges[game.id] === "play"
                              ? " (not played yet)"
                              : " (new results)"}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {game.tagline}
                      </div>
                    </div>
                  </button>
                  {game.InfoButton && (
                    <div className="absolute right-1.5 top-1.5">
                      <game.InfoButton stopPropagation />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
}
