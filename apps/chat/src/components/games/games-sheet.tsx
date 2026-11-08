"use client";

import { Cross2Icon, ChevronLeftIcon } from "@radix-ui/react-icons";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GAME_REGISTRY } from "@/components/games/game-registry";
import { useGamesUiStore } from "@/components/games/games-ui-store";
import { SamePagePanel } from "@/components/games/same-page-panel";
import { SamePageInfoButton } from "@/components/games/same-page-info";
import { SamePageIcon } from "@/components/games/same-page-icon";
import { cn } from "@/lib/utils";

type Props = {
  circleId: string;
};

export function GamesSheet({ circleId }: Props) {
  const {
    open,
    activeGameId,
    samePageView,
    close,
    openSamePage,
    backToHub,
    setSamePageView,
  } = useGamesUiStore();

  const samePageViewLabel =
    samePageView === "play"
      ? "Play"
      : samePageView === "results"
        ? "Results"
        : "Standings";

  const title =
    activeGameId === "same-page"
      ? `Same Page · ${samePageViewLabel}`
      : "Game Room";

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
        <SheetTitle className="sr-only">{title}</SheetTitle>
        <div className="flex items-center gap-1 border-b px-3 py-3 shrink-0">
          {activeGameId && (
            <Button
              variant="ghost"
              size="iconSm"
              onClick={backToHub}
              aria-label="Back to Game Room"
            >
              <ChevronLeftIcon />
            </Button>
          )}
          {activeGameId === "same-page" && (
            <SamePageIcon className="size-4 shrink-0 text-muted-foreground" />
          )}
          <div className="min-w-0 flex-1 truncate font-semibold">
            {activeGameId === "same-page" ? (
              <>
                Same Page
                <span className="text-sm font-normal text-muted-foreground">
                  {" "}
                  · {samePageViewLabel}
                </span>
              </>
            ) : (
              title
            )}
          </div>
          {activeGameId === "same-page" && <SamePageInfoButton />}
          <Button
            variant="ghost"
            size="iconSm"
            onClick={close}
            aria-label="Close Game Room"
          >
            <Cross2Icon />
          </Button>
        </div>

        {activeGameId === "same-page" ? (
          <SamePagePanel
            circleId={circleId}
            view={samePageView}
            onViewChange={setSamePageView}
          />
        ) : (
          <ScrollArea className="flex-1">
            <div className="flex flex-col gap-2 p-3">
              <p className="text-sm text-muted-foreground px-1 pb-1">
                More coming soon.
              </p>
              {GAME_REGISTRY.map((game) => (
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
                    onClick={() => openSamePage("play")}
                  >
                    {game.id === "same-page" && (
                      <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md border bg-background">
                        <SamePageIcon className="size-5" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{game.name}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {game.tagline}
                      </div>
                    </div>
                  </button>
                  {game.id === "same-page" && (
                    <div className="absolute right-1.5 top-1.5">
                      <SamePageInfoButton stopPropagation />
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
