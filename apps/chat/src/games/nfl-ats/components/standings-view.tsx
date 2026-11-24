"use client";

import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import { getInitials } from "@/components/ui/user-avatar";
import { cn } from "@/lib/utils";
import { formatRecord, formatWinPercentage } from "../lib/grade";
import { formatWeekLabel } from "../lib/format";
import {
  fetchStandings,
  nflAtsStandingsQueryKey,
  type StandingsRow,
} from "./api";
import { EmptyState } from "./empty-state";
import { NflAtsIcon } from "./nfl-ats-icon";

export function StandingsView({ circleId }: { circleId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: nflAtsStandingsQueryKey(circleId),
    queryFn: () => fetchStandings(circleId),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
      </div>
    );
  }
  if (error || !data) {
    return (
      <p className="text-sm text-muted-foreground">
        Couldn’t load standings. Try again.
      </p>
    );
  }

  const played = data.rows.some((row) => row.winPct !== null);
  if (!played) {
    return (
      <EmptyState
        icon={<NflAtsIcon />}
        title="No records yet"
        description="Once this week’s games finish, everyone’s record shows up here."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col items-center gap-0.5">
        <p className="text-xs font-medium text-muted-foreground">
          {data.season} season
        </p>
        {data.lastWeekStartsOn && (
          <p className="text-xs text-muted-foreground">
            Last week: {formatWeekLabel(data.lastWeekStartsOn)}
          </p>
        )}
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground">
            <th className="w-7 py-1 text-left font-normal">#</th>
            <th className="py-1 text-left font-normal">Member</th>
            <th className="py-1 pl-2 text-right font-normal">Last wk</th>
            <th className="py-1 pl-2 text-right font-normal">Season</th>
            <th className="py-1 pl-2 text-right font-normal">Pct</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, index) => (
            <Row
              key={row.user.id}
              row={row}
              // Everyone with nothing decided shares the bottom, unranked.
              rank={row.winPct === null ? null : index + 1}
              showLastWeek={data.lastWeekStartsOn !== null}
            />
          ))}
        </tbody>
      </table>

      <p className="text-center text-xs text-muted-foreground">
        Pct is wins over decided picks — a push counts for neither side.
      </p>
    </div>
  );
}

function Row({
  row,
  rank,
  showLastWeek,
}: {
  row: StandingsRow;
  rank: number | null;
  showLastWeek: boolean;
}) {
  const { user } = row;
  return (
    <tr
      className={cn(
        "border-t",
        // bg-muted disappears against the sidebar in light mode; a foreground tint doesn't.
        row.isYou && "bg-foreground/[0.06]",
      )}
    >
      <td className="py-1.5 text-xs text-muted-foreground">{rank ?? "—"}</td>
      <td className="py-1.5">
        <div className="flex items-center gap-2">
          <Avatar className="size-5">
            <AvatarImage src={user.imageUrl ?? undefined} />
            <AvatarFallback className="text-[10px]">
              {getInitials(user.displayName)}
            </AvatarFallback>
          </Avatar>
          <span className={cn("truncate", row.isYou && "font-medium")}>
            {user.displayName}
          </span>
        </div>
      </td>
      <td className="py-1.5 pl-2 text-right tabular-nums text-muted-foreground">
        {showLastWeek && row.lastWeek ? formatRecord(row.lastWeek) : "—"}
      </td>
      <td className="py-1.5 pl-2 text-right tabular-nums">
        {formatRecord(row.season)}
      </td>
      <td className="py-1.5 pl-2 text-right font-medium tabular-nums">
        {formatWinPercentage(row.season)}
      </td>
    </tr>
  );
}
