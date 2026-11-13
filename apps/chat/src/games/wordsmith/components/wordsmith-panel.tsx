"use client";

import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChartIcon, PersonIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { gameRoomBadgeQueryKey, useNotifyCircle } from "@/games/game-room";
import { WORD_LENGTH } from "../lib/rules";
import {
  fetchWordsmith,
  postWordsmith,
  wordsmithQueryKey,
  type CircleResult,
  type MyPlay,
  type WordsmithState,
} from "./api";
import { EmptyState } from "./empty-state";
import { Keyboard, letterStates } from "./keyboard";
import { WordsmithIcon } from "./wordsmith-icon";
import { SmallGrid, Tile } from "./tiles";
import type { WordsmithView } from "./view-store";

type EnabledState = Extract<WordsmithState, { enabled: true }>;

const SOLVED_LINES = [
  "First try!",
  "Brilliant",
  "Sharp",
  "Nice",
  "Solid",
  "Just made it",
];

type Props = {
  circleId: string;
  view: WordsmithView;
  onViewChange: (view: WordsmithView) => void;
};

function useSetEnabled(circleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (enabled: boolean) =>
      postWordsmith(circleId, {
        action: enabled ? "enable" : "disable",
      }).catch(() => {
        throw new Error("Couldn’t update Wordsmith");
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wordsmithQueryKey(circleId) });
      queryClient.invalidateQueries({
        queryKey: gameRoomBadgeQueryKey(circleId),
      });
    },
  });
}

export function WordsmithPanel({ circleId, view, onViewChange }: Props) {
  const { data, isLoading, error } = useQuery({
    queryKey: wordsmithQueryKey(circleId),
    queryFn: () => fetchWordsmith(circleId),
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
        Couldn’t load Wordsmith. Try again.
      </div>
    );
  }
  if (!data.enabled) {
    return <WordsmithOff circleId={circleId} isAdmin={data.isAdmin} />;
  }

  const tabs: [WordsmithView, string][] = [
    ["play", "Play"],
    ["results", "Results"],
    ["stats", "Stats"],
    ...(data.isAdmin
      ? [["settings", "Settings"] as [WordsmithView, string]]
      : []),
  ];
  const activeView = view === "settings" && !data.isAdmin ? "play" : view;

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
          {(activeView === "play" || activeView === "results") &&
            !data.isGameDay && <WeekendOff />}
          {activeView === "play" && data.isGameDay && (
            <PlayView circleId={circleId} data={data} />
          )}
          {activeView === "results" && data.isGameDay && (
            <ResultsView data={data} />
          )}
          {activeView === "stats" && <StatsView data={data} />}
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

function WordsmithOff({
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
        icon={<WordsmithIcon />}
        title="Wordsmith is off for this circle"
        description={
          isAdmin
            ? "Turning it on lets everyone here play the daily word and see each other’s results."
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
                Turn on Wordsmith
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

function WeekendOff() {
  return (
    <EmptyState
      icon={<WordsmithIcon />}
      title="No word on weekends"
      description="Wordsmith takes weekends off. The next word arrives Monday."
    />
  );
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
  );
}

function PlayView({
  circleId,
  data,
}: {
  circleId: string;
  data: EnabledState;
}) {
  const queryClient = useQueryClient();
  const { myPlay, maxGuesses } = data;
  const [current, setCurrent] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const notifyCircle = useNotifyCircle();

  const submit = useMutation({
    mutationFn: (guess: string) =>
      postWordsmith<{ play: MyPlay }>(circleId, { action: "guess", guess }),
    onSuccess: ({ play }) => {
      setCurrent("");
      setMessage(null);
      queryClient.setQueryData<WordsmithState>(
        wordsmithQueryKey(circleId),
        (prev) => (prev?.enabled ? { ...prev, myPlay: play } : prev),
      );
      if (play.finished) {
        // Finishing unlocks friends' guesses and changes stats.
        queryClient.invalidateQueries({
          queryKey: wordsmithQueryKey(circleId),
        });
        queryClient.invalidateQueries({
          queryKey: gameRoomBadgeQueryKey(circleId),
        });
        notifyCircle(circleId);
      }
    },
    onError: (err: Error) => setMessage(err.message),
  });

  const locked = myPlay.finished || submit.isPending;

  const onKey = useCallback(
    (key: string) => {
      if (locked) return;
      if (key === "enter") {
        if (current.length < WORD_LENGTH) {
          setMessage(`Guesses are ${WORD_LENGTH} letters`);
          return;
        }
        submit.mutate(current);
        return;
      }
      setMessage(null);
      if (key === "backspace") {
        setCurrent((c) => c.slice(0, -1));
        return;
      }
      if (/^[a-z]$/.test(key)) {
        setCurrent((c) => (c.length < WORD_LENGTH ? c + key : c));
      }
    },
    [current, locked, submit],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) {
        return;
      }
      const key = e.key.toLowerCase();
      if (key === "enter" || key === "backspace" || /^[a-z]$/.test(key)) {
        e.preventDefault();
        onKey(key);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onKey]);

  const rows = Array.from({ length: maxGuesses }, (_, i) => {
    const done = myPlay.rows[i];
    if (done) return { word: done.word, scores: done.scores, active: false };
    const isCurrent = i === myPlay.rows.length && !myPlay.finished;
    return { word: isCurrent ? current : "", scores: null, active: isCurrent };
  });

  return (
    <>
      <div className="flex flex-col items-center gap-1.5" role="grid">
        {rows.map((row, i) => (
          <div key={i} className="flex gap-1.5" role="row">
            {Array.from({ length: WORD_LENGTH }, (_, j) => (
              <Tile
                key={j}
                letter={row.word[j]}
                score={row.scores?.[j]}
                active={row.active}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="min-h-5 text-center text-sm" aria-live="polite">
        {message ? (
          <span className="text-destructive">{message}</span>
        ) : submit.isPending ? (
          <span className="text-muted-foreground">Checking…</span>
        ) : null}
      </div>

      {myPlay.finished ? (
        <FinishedSummary
          myPlay={myPlay}
          maxGuesses={maxGuesses}
          gameDate={data.gameDate}
        />
      ) : (
        <Keyboard
          states={letterStates(myPlay.rows)}
          disabled={submit.isPending}
          onKey={onKey}
        />
      )}
    </>
  );
}

function FinishedSummary({
  myPlay,
  maxGuesses,
  gameDate,
}: {
  myPlay: MyPlay;
  maxGuesses: number;
  gameDate: string;
}) {
  const isFriday = new Date(`${gameDate}T00:00:00Z`).getUTCDay() === 5;
  return (
    <div className="rounded-lg border p-3 text-center">
      <div className="font-semibold">
        {myPlay.solved
          ? `${SOLVED_LINES[myPlay.rows.length - 1]} · ${myPlay.rows.length}/${maxGuesses}`
          : "Not today"}
      </div>
      <div className="mt-1 text-sm text-muted-foreground">
        The word was{" "}
        <span className="font-medium uppercase text-foreground">
          {myPlay.answer}
        </span>
        {isFriday
          ? ". The next one arrives Monday."
          : ". A new one arrives at midnight EST."}
      </div>
    </div>
  );
}

function resultLabel(r: CircleResult) {
  if (r.status === "playing") return "Playing…";
  if (r.status === "failed") return "Didn’t get it";
  return `${r.guessCount} ${r.guessCount === 1 ? "guess" : "guesses"}`;
}

function ResultsView({ data }: { data: EnabledState }) {
  const { circleResults, myPlay } = data;

  if (circleResults.length === 0) {
    return (
      <EmptyState
        icon={<PersonIcon />}
        title="Nobody has played yet"
        description="Everyone’s results in this circle show up here as they play."
      />
    );
  }

  return (
    <>
      {!myPlay.finished && (
        <p className="text-sm text-muted-foreground">
          Finish today’s word to see everyone’s guesses.
        </p>
      )}
      <div className="flex flex-col gap-2">
        {circleResults.map((r) => (
          <div
            key={r.user.id}
            className="flex items-start justify-between gap-3 rounded-md border px-2.5 py-2 text-sm"
          >
            <div className="min-w-0">
              <div className="truncate font-medium">
                {r.isYou ? "You" : r.user.displayName}
              </div>
              <div
                className={cn(
                  "text-xs",
                  r.status === "solved"
                    ? "text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {resultLabel(r)}
              </div>
            </div>
            {r.rows && <SmallGrid rows={r.rows} />}
          </div>
        ))}
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 text-center">
      <div className="text-xl font-semibold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function StatsView({ data }: { data: EnabledState }) {
  const { stats, myPlay } = data;
  if (stats.played === 0) {
    return (
      <EmptyState
        icon={<BarChartIcon />}
        title="No stats yet"
        description="Finish your first word to start a streak."
      />
    );
  }

  const winRate = Math.round((stats.solved / stats.played) * 100);
  const maxCount = Math.max(1, ...stats.distribution);
  const todayGuesses = myPlay.solved ? myPlay.rows.length : null;

  return (
    <>
      <div className="grid grid-cols-4 gap-2 rounded-lg border px-2 py-3">
        <Stat label="Played" value={String(stats.played)} />
        <Stat label="Solved" value={`${winRate}%`} />
        <Stat label="Streak" value={String(stats.currentStreak)} />
        <Stat label="Best" value={String(stats.bestStreak)} />
      </div>

      <div className="space-y-1.5">
        <div className="text-xs text-muted-foreground">Guesses to solve</div>
        {stats.distribution.map((count, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-3 tabular-nums text-muted-foreground">
              {i + 1}
            </span>
            <div className="flex-1">
              <div
                className={cn(
                  "flex h-5 min-w-fit items-center justify-end rounded px-1.5 font-medium tabular-nums",
                  todayGuesses === i + 1
                    ? "bg-purple-500 text-white"
                    : "bg-muted text-muted-foreground",
                )}
                style={{ width: `${(count / maxCount) * 100}%` }}
              >
                {count}
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Your stats count every day you play, in any circle.
      </p>
    </>
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
  const setEnabled = useSetEnabled(circleId);
  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="font-medium">Turn off Wordsmith</div>
      <p className="text-muted-foreground">
        Removes it from this circle’s Game room. Everyone keeps their stats, and
        you can turn it back on anytime.
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
        Turn off Wordsmith for this circle
      </Button>
      {setEnabled.error && (
        <p className="text-destructive">{setEnabled.error.message}</p>
      )}
    </div>
  );
}
