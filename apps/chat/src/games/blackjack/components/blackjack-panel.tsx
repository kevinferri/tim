"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChartIcon } from "@radix-ui/react-icons";
import { useSelf } from "@/components/auth/self-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { getInitials } from "@/components/ui/user-avatar";
import { cn } from "@/lib/utils";
import { UpDown, chipText, useTableSeats } from "@/games/casino";
import { BLACKJACK_GAME_ID } from "../lib/game-id";
import { blackjackTablePath } from "../lib/table-link";
import { useGameRoomStore } from "@/games/game-room";
import {
  blackjackQueryKey,
  blackjackStandingsQueryKey,
  fetchBlackjack,
  fetchStandings,
  setBlackjackEnabled,
  type UpDownStanding,
} from "./api";
import { EmptyState } from "./empty-state";
import { BlackjackIcon } from "./icon";
import type { BlackjackView } from "./view-store";

type Props = {
  circleId: string;
  view: BlackjackView;
  onViewChange: (view: BlackjackView) => void;
  /** The tab on screen, for the sheet's title; null while loading or off. */
  onShownChange: (shown: BlackjackView | null) => void;
};

export function useSetBlackjackEnabled(circleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (enabled: boolean) => setBlackjackEnabled(circleId, enabled),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: blackjackQueryKey(circleId) }),
  });
}

export function BlackjackPanel({
  circleId,
  view,
  onViewChange,
  onShownChange,
}: Props) {
  const { data, isLoading, error } = useQuery({
    queryKey: blackjackQueryKey(circleId),
    queryFn: () => fetchBlackjack(circleId),
  });
  // Settings is the admin's only; anyone else picking it (e.g. from another circle) sees Play.
  const activeView = view === "settings" && !data?.isAdmin ? "play" : view;
  const shown = data?.enabled ? activeView : null;
  useEffect(() => {
    onShownChange(shown);
    return () => onShownChange(null);
  }, [shown, onShownChange]);

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
        Couldn’t load Blackjack. Try again.
      </div>
    );
  }

  if (!data.enabled) {
    return (
      <div className="flex flex-1 flex-col justify-center">
        <BlackjackOff circleId={circleId} isAdmin={data.isAdmin} />
      </div>
    );
  }

  const tabs: [BlackjackView, string][] = [
    ["play", "Play"],
    ["standings", "Standings"],
    ...(data.isAdmin
      ? [["settings", "Settings"] as [BlackjackView, string]]
      : []),
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex gap-1 border-b px-2 py-1.5 shrink-0">
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
          {activeView === "play" && <PlayView circleId={circleId} />}
          {activeView === "standings" && <StandingsView circleId={circleId} />}
          {activeView === "settings" && (
            <SettingsView
              circleId={circleId}
              onTurnedOff={() => onViewChange("play")}
            />
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

/** The off state, in the Game room and on the table page; `onTurnedOn` runs after the circle's admin turns it on. */
export function BlackjackOff({
  circleId,
  isAdmin,
  onTurnedOn,
}: {
  circleId: string;
  isAdmin: boolean;
  onTurnedOn?: () => void;
}) {
  const setEnabled = useSetBlackjackEnabled(circleId);

  return (
    <EmptyState
      icon={<BlackjackIcon />}
      title="Blackjack is off for this circle"
      description={
        isAdmin
          ? "Turning it on opens a live table for everyone in this circle. Every hand counts toward each player’s all-time up/down."
          : "Only the circle’s creator can turn it on."
      }
      action={
        isAdmin && (
          <div className="flex flex-col items-center gap-2">
            <Button
              size="sm"
              onClick={() => setEnabled.mutate(true, { onSuccess: onTurnedOn })}
              disabled={setEnabled.isPending}
            >
              Turn on Blackjack
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
  );
}

function useStandings(circleId: string) {
  return useQuery({
    queryKey: blackjackStandingsQueryKey(circleId),
    queryFn: () => fetchStandings(circleId),
  });
}

function PlayView({ circleId }: { circleId: string }) {
  const close = useGameRoomStore((s) => s.close);

  return (
    <div className="flex flex-col items-center gap-4 px-4 py-8 text-center">
      <div className="space-y-1">
        <div className="text-sm font-medium">The table is open</div>
        <div className="text-sm text-muted-foreground">
          Pull up a seat and play against the dealer with your circle.
        </div>
      </div>
      <AtTheTable circleId={circleId} />
      <Button asChild size="sm">
        {/* Its own tab, so the chat stays open beside it. */}
        <Link
          href={blackjackTablePath(circleId)}
          target="_blank"
          rel="noopener"
          onClick={close}
        >
          Go to the table
        </Link>
      </Button>
    </div>
  );
}

const MAX_FACES = 5;

/** "Marcus is playing", "Marcus, Socrates and Confucius are playing", "Marcus, Socrates and 2 others are playing". */
function playingSentence(names: string[]) {
  if (names.length === 1) return `${names[0]} is playing`;
  const shown = names.length > 3 ? names.slice(0, 2) : names.slice(0, -1);
  const rest = names.length - shown.length;
  const last = names.length > 3 ? `${rest} others` : names[names.length - 1];
  return `${shown.join(", ")} and ${last} are playing`;
}

function AtTheTable({ circleId }: { circleId: string }) {
  const occupants = useTableSeats({ circleId, game: BLACKJACK_GAME_ID });
  // One fixed height for loading, empty and full, so the button below never moves.
  const box = "flex h-14 flex-col items-center justify-center gap-2";
  if (!occupants) return <div className={box} aria-hidden />;
  if (occupants.length === 0) {
    return (
      <div className={cn(box, "text-xs text-muted-foreground")}>
        {/* An empty seat where the faces go, so both states keep one shape. */}
        <div className="size-7 rounded-full border-2 border-dashed border-muted-foreground/40" />
        No one’s playing yet — be the first
      </div>
    );
  }
  const faces = occupants.slice(0, MAX_FACES);
  const more = occupants.length - faces.length;
  return (
    <div className={box}>
      <ul className="flex -space-x-2">
        {faces.map((o) => (
          <li key={o.userId} title={o.displayName}>
            <Avatar className="size-7 ring-2 ring-background">
              <AvatarImage
                className="rounded-full"
                src={o.imageUrl ?? undefined}
                alt=""
              />
              <AvatarFallback className="text-[10px] font-medium">
                {getInitials(o.name ?? o.displayName)}
              </AvatarFallback>
            </Avatar>
          </li>
        ))}
        {more > 0 && (
          <li className="flex size-7 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground ring-2 ring-background">
            +{more}
          </li>
        )}
      </ul>
      <div className="text-xs text-muted-foreground">
        {playingSentence(occupants.map((o) => o.displayName))}
      </div>
    </div>
  );
}

const playedLabel = ({ handsPlayed: n, wagered }: UpDownStanding) =>
  `${n.toLocaleString()} ${n === 1 ? "hand" : "hands"} · ${chipText(wagered)} wagered`;

function StandingsView({ circleId }: { circleId: string }) {
  const self = useSelf();
  const { data, isLoading } = useStandings(circleId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );
  }

  const rows = data ?? [];
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<BarChartIcon />}
        title="No standings yet"
        description="Play a hand to get on the board."
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <span>All time</span>
        <span>Up/Down</span>
      </div>
      {rows.map((row, index) => (
        <StandingRow
          key={row.user.id}
          row={row}
          rank={index + 1}
          mine={row.user.id === self.id}
        />
      ))}
    </div>
  );
}

function StandingRow({
  row,
  rank,
  mine,
}: {
  row: UpDownStanding;
  rank: number;
  mine: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm",
        mine && "border-foreground/20 bg-accent/50",
      )}
    >
      <span className="w-4 shrink-0 text-xs tabular-nums text-muted-foreground">
        {rank}
      </span>
      <Avatar className="size-6">
        <AvatarImage src={row.user.imageUrl ?? undefined} alt="" />
        <AvatarFallback className="text-[10px]">
          {getInitials(row.user.displayName)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">
          {row.user.displayName}
          {mine && (
            <span className="font-normal text-muted-foreground"> (you)</span>
          )}
        </div>
        <div className="text-xs text-muted-foreground tabular-nums">
          {playedLabel(row)}
        </div>
      </div>
      <UpDown net={row.net} className="shrink-0 font-medium" />
    </div>
  );
}

// Admin-only.
function SettingsView({
  circleId,
  onTurnedOff,
}: {
  circleId: string;
  onTurnedOff: () => void;
}) {
  const setEnabled = useSetBlackjackEnabled(circleId);

  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="font-medium">Turn off Blackjack</div>
      <p className="text-muted-foreground">
        Closes the table to new players in this circle. Anyone seated can finish
        up, everyone’s up/down is kept, and you can turn it back on anytime.
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
        Turn off Blackjack for this circle
      </Button>
      {setEnabled.error && (
        <p className="text-destructive">{setEnabled.error.message}</p>
      )}
    </div>
  );
}
