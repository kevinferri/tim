"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LockClosedIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { gameRoomBadgeQueryKey } from "@/games/game-room";
import {
  formatKickoffTime,
  formatSpread,
  formatWeekLabel,
  groupByKickoffDay,
  spreadForSide,
} from "../lib/format";
import { NFL_ATS_PUBLISH_LABEL } from "../lib/schedule";
import type { PickSide } from "../lib/grade";
import {
  fetchNflAts,
  nflAtsQueryKey,
  nflAtsStandingsQueryKey,
  postNflAts,
  type NflAtsState,
  type PickableGame,
} from "./api";
import { EmptyState } from "./empty-state";
import { LastWeekView } from "./last-week-view";
import { NflAtsIcon } from "./nfl-ats-icon";
import { StandingsView } from "./standings-view";
import type { NflAtsView } from "./view-store";

type EnabledState = Extract<NflAtsState, { enabled: true }>;

type Props = {
  circleId: string;
  view: NflAtsView;
  onViewChange: (view: NflAtsView) => void;
};

function useSetEnabled(circleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (enabled: boolean) =>
      postNflAts(circleId, {
        action: enabled ? "enable" : "disable",
      }).catch(() => {
        throw new Error("Couldn’t update Pick ’em");
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: nflAtsQueryKey(circleId) });
      queryClient.invalidateQueries({
        queryKey: nflAtsStandingsQueryKey(circleId),
      });
      queryClient.invalidateQueries({
        queryKey: gameRoomBadgeQueryKey(circleId),
      });
    },
  });
}

function usePick(circleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ gameId, side }: { gameId: string; side: PickSide }) =>
      postNflAts(circleId, { action: "pick", gameId, side }),
    // The server owns the lock, so a rejected pick has to re-read rather than keep an optimistic value.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: nflAtsQueryKey(circleId) });
      queryClient.invalidateQueries({
        queryKey: gameRoomBadgeQueryKey(circleId),
      });
    },
  });
}

export function NflAtsPanel({ circleId, view, onViewChange }: Props) {
  const { data, isLoading, error } = useQuery({
    queryKey: nflAtsQueryKey(circleId),
    queryFn: () => fetchNflAts(circleId),
  });

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-12">
        <Spinner />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Couldn’t load Pick ’em. Try again.
      </div>
    );
  }
  if (!data.enabled) {
    return <NflAtsOff circleId={circleId} isAdmin={data.isAdmin} />;
  }

  const tabs: [NflAtsView, string][] = [
    ["picks", "Picks"],
    ["last-week", "Last week"],
    ["standings", "Standings"],
    ...(data.isAdmin ? [["settings", "Settings"] as [NflAtsView, string]] : []),
  ];
  const activeView = view === "settings" && !data.isAdmin ? "picks" : view;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 gap-1 border-b px-2 py-1.5">
        {tabs.map(([id, label]) => (
          <Button
            key={id}
            size="sm"
            variant={activeView === id ? "secondary" : "ghost"}
            className="h-7 text-xs"
            onClick={() => onViewChange(id)}
          >
            {label}
          </Button>
        ))}
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-4 p-4">
          {activeView === "picks" && (
            <PicksView circleId={circleId} data={data} />
          )}
          {activeView === "last-week" && <LastWeekView circleId={circleId} />}
          {activeView === "standings" && <StandingsView circleId={circleId} />}
          {activeView === "settings" && (
            <SettingsView
              circleId={circleId}
              onTurnedOff={() => onViewChange("picks")}
            />
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function PicksView({
  circleId,
  data,
}: {
  circleId: string;
  data: EnabledState;
}) {
  const pick = usePick(circleId);

  if (!data.weekStartsOn || data.games.length === 0) {
    return (
      <EmptyState
        icon={<NflAtsIcon />}
        title="No games up yet"
        description={`This week’s slate posts ${NFL_ATS_PUBLISH_LABEL}, with the lines fixed as they are then.`}
      />
    );
  }

  const made = data.games.filter((g) => g.myPick).length;
  const open = data.games.filter((g) => !g.locked && !g.myPick).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-0.5">
        <p className="text-xs font-medium text-muted-foreground">
          {formatWeekLabel(data.weekStartsOn)}
        </p>
        <p className="text-xs text-muted-foreground">
          {made} of {data.games.length} picked
          {open > 0 && ` · ${open} still open`}
        </p>
      </div>

      {pick.error && (
        <p className="text-center text-sm text-destructive">
          {pick.error.message}
        </p>
      )}

      {groupByKickoffDay(data.games).map(({ day, games }) => (
        <section key={day} className="flex flex-col gap-2">
          <div className="text-xs font-medium text-muted-foreground">{day}</div>
          {games.map((game) => (
            <GameRow
              key={game.id}
              game={game}
              onPick={(side) => pick.mutate({ gameId: game.id, side })}
              disabled={pick.isPending}
            />
          ))}
        </section>
      ))}

      <p className="text-center text-xs text-muted-foreground">
        Pick any game until it kicks off — you can change a pick up to then.
      </p>
    </div>
  );
}

const RESULT_LABEL = {
  win: "Won",
  loss: "Lost",
  push: "Push",
} as const;

function GameRow({
  game,
  onPick,
  disabled,
}: {
  game: PickableGame;
  onPick: (side: PickSide) => void;
  disabled: boolean;
}) {
  const hasScore = game.homeScore !== null && game.awayScore !== null;

  return (
    <div className="rounded-md border p-2">
      <div className="flex gap-1.5">
        <SideButton
          game={game}
          side="away"
          onPick={onPick}
          disabled={disabled}
        />
        <SideButton
          game={game}
          side="home"
          onPick={onPick}
          disabled={disabled}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between px-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          {game.locked && <LockClosedIcon className="size-3" />}
          {hasScore
            ? `Final ${game.awayScore}–${game.homeScore}`
            : formatKickoffTime(game.kickoffAt)}
        </span>
        {game.myResult && (
          <span
            className={cn(
              "font-medium",
              game.myResult === "win" &&
                "text-emerald-600 dark:text-emerald-400",
              game.myResult === "loss" && "text-destructive",
            )}
          >
            {RESULT_LABEL[game.myResult]}
          </span>
        )}
      </div>
    </div>
  );
}

function SideButton({
  game,
  side,
  onPick,
  disabled,
}: {
  game: PickableGame;
  side: PickSide;
  onPick: (side: PickSide) => void;
  disabled: boolean;
}) {
  const picked = game.myPick === side;
  const team = side === "home" ? game.homeTeam : game.awayTeam;
  const line = formatSpread(spreadForSide(game.spread, side));

  return (
    <button
      type="button"
      // A locked game still shows which side you took, so it can't be a disabled control.
      aria-pressed={picked}
      disabled={disabled || game.locked}
      onClick={() => onPick(side)}
      className={cn(
        "flex flex-1 flex-col gap-0.5 rounded px-2 py-1.5 text-left transition-colors",
        // bg-secondary/muted vanish against the sidebar in light mode; a foreground tint doesn't.
        picked ? "bg-foreground/[0.12] font-medium" : "bg-transparent",
        !game.locked && !picked && "hover:bg-foreground/[0.06]",
        game.locked && "cursor-default opacity-70",
      )}
    >
      <span className="truncate text-sm">{team}</span>
      <span className="text-xs text-muted-foreground">{line}</span>
    </button>
  );
}

function NflAtsOff({
  circleId,
  isAdmin,
}: {
  circleId: string;
  isAdmin: boolean;
}) {
  const setEnabled = useSetEnabled(circleId);
  return (
    <div className="flex flex-1 flex-col justify-center">
      <EmptyState
        icon={<NflAtsIcon />}
        title="Pick ’em is off for this circle"
        description={
          isAdmin
            ? `Turning it on posts the week’s NFL slate here ${NFL_ATS_PUBLISH_LABEL}, for everyone to pick against the spread.`
            : "The circle’s admin can turn it on."
        }
        action={
          isAdmin && (
            <div className="flex flex-col items-center gap-2">
              <Button
                size="sm"
                onClick={() => setEnabled.mutate(true)}
                disabled={setEnabled.isPending}
              >
                Turn on Pick ’em
              </Button>
              {setEnabled.error && (
                <p className="text-sm text-destructive">
                  {setEnabled.error.message}
                </p>
              )}
            </div>
          )
        }
      />
    </div>
  );
}

function SettingsView({
  circleId,
  onTurnedOff,
}: {
  circleId: string;
  onTurnedOff: () => void;
}) {
  const setEnabled = useSetEnabled(circleId);
  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="font-medium">Turn off Pick ’em</div>
      <p className="text-muted-foreground">
        Removes it from this circle’s Game room and stops new slates posting.
        Everyone keeps their picks, and you can turn it back on anytime.
      </p>
      <Button
        variant="destructive"
        size="sm"
        className="self-start"
        onClick={() =>
          setEnabled.mutate(false, { onSuccess: () => onTurnedOff() })
        }
        disabled={setEnabled.isPending}
      >
        Turn off Pick ’em for this circle
      </Button>
      {setEnabled.error && (
        <p className="text-destructive">{setEnabled.error.message}</p>
      )}
    </div>
  );
}
