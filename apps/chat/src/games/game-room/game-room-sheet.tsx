"use client";

import { Cross2Icon, ChevronLeftIcon } from "@radix-ui/react-icons";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { BadgeDot, useGameBadges } from "./badges";
import { useMarkRoomSeen } from "./room-seen";
import { useGameRoomStore } from "./store";
import {
  GAME_CATEGORIES,
  type ComingSoonGame,
  type GameBadge,
  type GameDefinition,
} from "./types";

type Props = {
  circleId: string;
  games: GameDefinition[];
  comingSoon?: ComingSoonGame[];
};

export function GameRoomSheet({ circleId, games, comingSoon = [] }: Props) {
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
  useMarkRoomSeen(circleId, open, badges);

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
            <div className="flex flex-col gap-5 p-3">
              {GAME_CATEGORIES.map((category) => {
                const playable = games.filter(
                  (g) => g.category === category.id,
                );
                const upcoming = comingSoon.filter(
                  (g) => g.category === category.id,
                );
                if (playable.length + upcoming.length === 0) return null;
                return (
                  <section
                    key={category.id}
                    aria-label={category.label}
                    className="flex flex-col gap-2"
                  >
                    <SectionSeparator label={category.label} />
                    {playable.map((game) => (
                      <GameCard
                        key={game.id}
                        game={game}
                        badge={badges[game.id] ?? null}
                        onOpen={() => openGame(game.id)}
                      />
                    ))}
                    {upcoming.map((game) => (
                      <ComingSoonCard key={game.id} game={game} />
                    ))}
                  </section>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
}

function SectionSeparator({ label }: { label: string }) {
  return (
    <div
      className="px-1 pt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground"
      aria-hidden
    >
      {label}
    </div>
  );
}

function GameCard({
  game,
  badge,
  onOpen,
}: {
  game: GameDefinition;
  badge: GameBadge;
  onOpen: () => void;
}) {
  return (
    <div
      className={cn(
        "relative rounded-lg border bg-card transition-colors",
        "hover:bg-accent/40 focus-within:ring-2 focus-within:ring-ring",
      )}
    >
      <button
        type="button"
        className="flex w-full items-start gap-3 px-3 py-3 pr-10 text-left focus-visible:outline-none"
        onClick={onOpen}
      >
        <div className="relative mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md border bg-background">
          <game.Icon className="size-5" />
          <BadgeDot badge={badge} className="-right-1 -top-1" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium">
            {game.name}
            {badge && (
              <span className="sr-only">
                {badge === "play" ? " (not played yet)" : " (new results)"}
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
  );
}

function ComingSoonCard({ game }: { game: ComingSoonGame }) {
  return (
    <div
      className="flex items-start gap-3 rounded-lg border bg-card px-3 py-3"
      aria-disabled
    >
      <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground">
        <game.Icon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-muted-foreground">{game.name}</span>
          <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
            Coming soon
          </Badge>
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {game.tagline}
        </div>
      </div>
    </div>
  );
}
