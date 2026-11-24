"use client";

import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import { getInitials } from "@/components/ui/user-avatar";
import { cn } from "@/lib/utils";
import {
  formatSpread,
  formatWeekLabel,
  groupByKickoffDay,
  spreadForSide,
} from "../lib/format";
import type { PickSide } from "../lib/grade";
import {
  fetchLastWeek,
  nflAtsLastWeekQueryKey,
  type LastWeekGame,
  type StandingsMember,
} from "./api";
import { EmptyState } from "./empty-state";
import { NflAtsIcon } from "./nfl-ats-icon";

export function LastWeekView({ circleId }: { circleId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: nflAtsLastWeekQueryKey(circleId),
    queryFn: () => fetchLastWeek(circleId),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
      </div>
    );
  }
  if (error) {
    return (
      <p className="text-sm text-muted-foreground">
        Couldn’t load last week. Try again.
      </p>
    );
  }
  if (!data) {
    return (
      <EmptyState
        icon={<NflAtsIcon />}
        title="Nothing to look back on yet"
        description="Once a week’s games are final, everyone’s picks show up here."
      />
    );
  }

  const membersById = new Map(data.members.map((m) => [m.id, m]));

  return (
    <div className="flex flex-col gap-4">
      <p className="text-center text-xs font-medium text-muted-foreground">
        {formatWeekLabel(data.startsOn)}
      </p>

      {groupByKickoffDay(data.games).map(({ day, games }) => (
        <section key={day} className="flex flex-col gap-2">
          <div className="text-xs font-medium text-muted-foreground">{day}</div>
          {games.map((game) => (
            <GameResult key={game.id} game={game} membersById={membersById} />
          ))}
        </section>
      ))}
    </div>
  );
}

function GameResult({
  game,
  membersById,
}: {
  game: LastWeekGame;
  membersById: Map<string, StandingsMember>;
}) {
  return (
    <div className="rounded-md border p-2">
      <div className="flex gap-1.5">
        <SideResult game={game} side="away" membersById={membersById} />
        <SideResult game={game} side="home" membersById={membersById} />
      </div>
      <div className="mt-1.5 flex items-center justify-between px-1 text-xs text-muted-foreground">
        <span>
          Final {game.awayScore}–{game.homeScore}
        </span>
        {game.coveringSide === "push" && <span>Push — no one covered</span>}
      </div>
    </div>
  );
}

function SideResult({
  game,
  side,
  membersById,
}: {
  game: LastWeekGame;
  side: PickSide;
  membersById: Map<string, StandingsMember>;
}) {
  const covered = game.coveringSide === side;
  const team = side === "home" ? game.homeTeam : game.awayTeam;
  const line = formatSpread(spreadForSide(game.spread, side));
  const pickers = game.picks
    .filter((pick) => pick.side === side)
    .map((pick) => membersById.get(pick.userId))
    .filter((member): member is StandingsMember => member !== undefined);

  return (
    <div
      className={cn(
        "flex flex-1 flex-col gap-1 rounded px-2 py-1.5",
        // A foreground tint, not bg-secondary, which vanishes against the sidebar in light mode.
        covered ? "bg-foreground/[0.12]" : "bg-transparent",
      )}
    >
      <div className="flex items-baseline justify-between gap-1">
        <span className={cn("truncate text-sm", covered && "font-medium")}>
          {team}
        </span>
        {covered && (
          <span className="shrink-0 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            Covered
          </span>
        )}
      </div>
      <span className="text-xs text-muted-foreground">{line}</span>
      {pickers.length > 0 ? (
        <div className="flex flex-wrap gap-1 pt-0.5">
          {pickers.map((member) => (
            <Avatar
              key={member.id}
              className="size-5"
              title={member.displayName}
            >
              <AvatarImage src={member.imageUrl ?? undefined} />
              <AvatarFallback className="text-[10px]">
                {getInitials(member.displayName)}
              </AvatarFallback>
            </Avatar>
          ))}
        </div>
      ) : (
        <span className="pt-0.5 text-xs text-muted-foreground/70">
          No takers
        </span>
      )}
    </div>
  );
}
