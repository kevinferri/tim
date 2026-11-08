"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import type { SamePageView } from "@/components/games/games-ui-store";

type Member = {
  id: string;
  displayName: string;
  name: string | null;
  imageUrl: string | null;
};

type SamePageState = {
  phase: "closed" | "play" | "results";
  gameDate: string;
  prompt: string | null;
  answeredCount: number;
  memberCount: number;
  myAnswer: {
    text: string;
    calledUser: Member | null;
    createdAt: string;
  } | null;
  sock: { holder: Member; heldSince: string | null } | null;
  members: Member[];
  results: {
    answers: Array<{
      user: Member;
      text: string;
      calledUser: Member | null;
      matchCount: number;
      calledIt: boolean;
      alone: boolean;
      gotSock: boolean;
    }>;
    summary: {
      matched: number;
      of: number;
      calledIt: boolean;
      alone: boolean;
      samePage: boolean;
    } | null;
    aloneCount: number;
    sockAwardedTo: Member | null;
  } | null;
  stats: {
    played: number;
    currentStreak: number;
    bestStreak: number;
    matchedRounds: number;
    correctCalls: number;
    callAttempts: number;
    samePageDays: number;
    socksEarned: number;
    sockDaysHeld: number;
  } | null;
  badge: "play" | "results" | null;
};

type Props = {
  circleId: string;
  view: SamePageView;
  onViewChange: (view: SamePageView) => void;
};

async function fetchState(circleId: string): Promise<SamePageState> {
  const res = await fetch(`/api/circles/${circleId}/same-page`);
  if (!res.ok) throw new Error("Failed to load Same Page");
  return res.json();
}

export function SamePagePanel({ circleId, view, onViewChange }: Props) {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["same-page", circleId],
    queryFn: () => fetchState(circleId),
  });

  const [text, setText] = useState("");
  const [calledUserId, setCalledUserId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmNoCall, setConfirmNoCall] = useState(false);

  const submit = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/circles/${circleId}/same-page`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "answer",
          text,
          calledUserId,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Submit failed");
      return body;
    },
    onSuccess: () => {
      setFormError(null);
      queryClient.invalidateQueries({ queryKey: ["same-page", circleId] });
      queryClient.invalidateQueries({ queryKey: ["games-badge", circleId] });
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const markViewed = useMutation({
    mutationFn: async () => {
      await fetch(`/api/circles/${circleId}/same-page`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "view-results" }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["games-badge", circleId] });
    },
  });

  useEffect(() => {
    if (view === "results" && data?.phase === "results") {
      markViewed.mutate();
    }
    // intentionally once when landing on results
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, data?.phase]);

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
        Couldn’t load Same Page. Try again.
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex gap-1 border-b px-2 py-1.5 shrink-0">
        {(
          [
            ["play", "Play"],
            ["results", "Results"],
            ["standings", "Standings"],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            size="sm"
            variant={view === id ? "secondary" : "ghost"}
            className="h-7 text-xs"
            onClick={() => onViewChange(id)}
          >
            {label}
          </Button>
        ))}
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-4 p-4">
          {view === "play" && (
            <PlayView
              data={data}
              text={text}
              setText={(v) => {
                setConfirmNoCall(false);
                setText(v);
              }}
              calledUserId={calledUserId}
              setCalledUserId={(id) => {
                setConfirmNoCall(false);
                setCalledUserId(id);
              }}
              formError={formError}
              submitting={submit.isPending}
              confirmNoCall={confirmNoCall}
              onRequestConfirmNoCall={() => setConfirmNoCall(true)}
              onCancelConfirmNoCall={() => setConfirmNoCall(false)}
              onSubmit={() => submit.mutate()}
            />
          )}
          {view === "results" && <ResultsView data={data} />}
          {view === "standings" && (
            <StandingsView
              circleId={circleId}
              sockHolderId={data.sock?.holder.id ?? null}
            />
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function countAnswerWords(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function PlayPromptHeader({
  prompt,
  answeredCount,
  memberCount,
}: {
  prompt: string | null;
  answeredCount: number;
  memberCount: number;
}) {
  const progress =
    memberCount > 0 ? Math.min(1, answeredCount / memberCount) : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>Today’s prompt</span>
        <span className="tabular-nums">Locks 4pm EST</span>
      </div>
      <p className="text-2xl font-semibold leading-snug text-balance">
        {prompt}
      </p>
      <div className="space-y-1.5">
        <div className="h-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-foreground/70 transition-[width] duration-200 ease-out"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <div className="text-xs text-muted-foreground tabular-nums">
          {answeredCount} of {memberCount} answered
        </div>
      </div>
    </div>
  );
}

function PlayView({
  data,
  text,
  setText,
  calledUserId,
  setCalledUserId,
  formError,
  submitting,
  confirmNoCall,
  onRequestConfirmNoCall,
  onCancelConfirmNoCall,
  onSubmit,
}: {
  data: SamePageState;
  text: string;
  setText: (v: string) => void;
  calledUserId: string | null;
  setCalledUserId: (v: string | null) => void;
  formError: string | null;
  submitting: boolean;
  confirmNoCall: boolean;
  onRequestConfirmNoCall: () => void;
  onCancelConfirmNoCall: () => void;
  onSubmit: () => void;
}) {
  if (data.phase === "closed") {
    return (
      <div className="text-sm text-muted-foreground">
        Same Page runs weekdays, 6am–4pm EST. Come back on a weekday morning.
      </div>
    );
  }

  if (data.phase === "results") {
    return (
      <div className="text-sm text-muted-foreground">
        Today’s round is closed. Check the Results tab for the reveal.
      </div>
    );
  }

  const words = countAnswerWords(text);
  const overWordLimit = words > 3;

  return (
    <div className="flex flex-col gap-6">
      <PlayPromptHeader
        prompt={data.prompt}
        answeredCount={data.answeredCount}
        memberCount={data.memberCount}
      />

      {data.myAnswer ? (
        <div className="space-y-3">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Locked in
          </div>
          <div className="text-xl font-semibold tracking-tight">
            “{data.myAnswer.text}”
          </div>
          {data.myAnswer.calledUser ? (
            <p className="text-sm text-muted-foreground">
              Called {data.myAnswer.calledUser.displayName}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">No match called</p>
          )}
          <p className="text-sm text-muted-foreground">
            Results open at 4pm EST. Hang tight.
          </p>
        </div>
      ) : (
        <form
          className="flex flex-col gap-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim() || submitting || overWordLimit) return;
            // Enter-to-submit habit: don't lock without a call unless they confirm.
            if (
              !calledUserId &&
              data.members.length > 0 &&
              !confirmNoCall
            ) {
              onRequestConfirmNoCall();
              return;
            }
            onSubmit();
          }}
        >
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <label
                className="text-sm font-medium"
                htmlFor="same-page-answer"
              >
                Your answer
              </label>
              <span
                className={cn(
                  "text-xs tabular-nums",
                  overWordLimit
                    ? "text-destructive"
                    : "text-muted-foreground",
                )}
              >
                {words}/3 words
              </span>
            </div>
            <Input
              id="same-page-answer"
              className="h-11 text-base"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="3 words or fewer"
              maxLength={60}
              autoComplete="off"
              autoFocus
            />
          </div>

          <div className="space-y-2.5">
            <div>
              <div className="text-sm font-medium">Who matches you?</div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Optional — pick the person you think answered the same.
              </p>
            </div>
            {data.members.length === 0 ? (
              <div className="text-xs text-muted-foreground">
                No one else in this circle yet.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {data.members.map((m) => {
                  const selected = calledUserId === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-sm transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        selected
                          ? "border-foreground bg-foreground text-background"
                          : "border-border bg-background hover:bg-muted",
                      )}
                      onClick={() =>
                        setCalledUserId(selected ? null : m.id)
                      }
                      aria-pressed={selected}
                    >
                      {m.displayName}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {confirmNoCall && !calledUserId && data.members.length > 0 && (
            <div className="rounded-lg border border-orange-500/40 bg-orange-500/10 p-3 text-sm">
              <div className="font-medium">Call your match first?</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Pick who you think matched you — answers lock forever. You can
                still lock without a call if you want.
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={onCancelConfirmNoCall}
                >
                  Pick someone
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={submitting}
                  onClick={onSubmit}
                >
                  Lock without calling
                </Button>
              </div>
            </div>
          )}

          {formError && (
            <div className="text-xs text-destructive">{formError}</div>
          )}

          {!confirmNoCall && (
            <Button
              type="submit"
              className="w-full"
              disabled={submitting || !text.trim() || overWordLimit}
            >
              {submitting ? "Locking…" : "Lock answer"}
            </Button>
          )}
        </form>
      )}

      {data.sock?.holder && (
        <p className="text-xs text-muted-foreground">
          🧦 {data.sock.holder.displayName} holds the Sock
        </p>
      )}
    </div>
  );
}

function ResultsView({ data }: { data: SamePageState }) {
  if (data.phase !== "results") {
    return (
      <div className="text-sm text-muted-foreground">
        Results drop at 4pm EST. {data.answeredCount} answered so far.
      </div>
    );
  }

  const s = data.results?.summary;
  const sockAwardedTo = data.results?.sockAwardedTo ?? null;

  return (
    <>
      {!data.myAnswer && (
        <div className="text-sm text-muted-foreground">
          You missed today’s round — streak ended. Here’s how everyone else
          did.
        </div>
      )}

      {s && (
        <div className="rounded-lg border p-3">
          <div className="text-sm font-semibold">
            {s.samePage
              ? "Same Page"
              : s.alone
                ? "Just you"
                : `${s.matched} of ${s.of} said the same`}
            {s.calledIt ? " · Called it" : ""}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Same Page · {data.gameDate}
          </div>
        </div>
      )}

      <div className="rounded-lg border px-3 py-2.5 text-sm">
        {sockAwardedTo ? (
          <>
            <div className="font-semibold">
              🧦 {sockAwardedTo.displayName} got stuck with the Sock
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              Odd one out today.
            </div>
          </>
        ) : data.sock?.holder ? (
          <>
            <div className="font-semibold">
              🧦 {data.sock.holder.displayName} still has the Sock
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              No single unique answer, so it didn’t move.
            </div>
          </>
        ) : (
          <>
            <div className="font-semibold">🧦 Nobody has the Sock</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              It goes to whoever had the only unique answer (needs at least 3
              answers).
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {data.results?.answers.map((a) => (
          <div
            key={a.user.id}
            className="flex items-start justify-between gap-2 rounded-md border px-2.5 py-2 text-sm"
          >
            <div className="min-w-0">
              <div className="font-medium truncate">
                {a.user.displayName}
                {a.gotSock ? " 🧦" : ""}
              </div>
              <div className="text-muted-foreground">{a.text}</div>
              {a.calledUser && (
                <div className="mt-0.5 text-xs text-muted-foreground">
                  Called {a.calledUser.displayName}
                  {a.calledIt ? " ✓" : ""}
                </div>
              )}
            </div>
            <div className="shrink-0 text-xs text-muted-foreground text-right">
              {a.gotSock ? "Stuck with the Sock" : a.alone ? "Just you" : null}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function StandingStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-medium tabular-nums">{value}</div>
    </div>
  );
}

function StandingsView({
  circleId,
  sockHolderId,
}: {
  circleId: string;
  sockHolderId: string | null;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["same-page-standings", circleId],
    queryFn: async () => {
      const res = await fetch(
        `/api/circles/${circleId}/same-page?view=standings`,
      );
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{
        standings: Array<{
          user: Member;
          played: number;
          currentStreak: number;
          bestStreak: number;
          matchedRounds: number;
          correctCalls: number;
          callAttempts: number;
          socksEarned: number;
          sockDaysHeld: number;
        }>;
      }>;
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );
  }

  const rows = data?.standings ?? [];
  if (rows.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No standings yet — play a few rounds.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map((row, index) => {
        const matchRate =
          row.played > 0
            ? Math.round((row.matchedRounds / row.played) * 100)
            : 0;
        const callRate =
          row.callAttempts > 0
            ? Math.round((row.correctCalls / row.callAttempts) * 100)
            : 0;
        const hasSock = row.user.id === sockHolderId;
        const socksValue =
          row.socksEarned === 0
            ? "0"
            : row.sockDaysHeld > 0
              ? `${row.socksEarned} · ${row.sockDaysHeld}d ago`
              : String(row.socksEarned);

        return (
          <div
            key={row.user.id}
            className="rounded-lg border px-3 py-2.5 text-sm"
          >
            <div className="flex items-baseline justify-between gap-2">
              <div className="min-w-0 flex items-baseline gap-2">
                <span className="w-4 shrink-0 text-xs tabular-nums text-muted-foreground">
                  {index + 1}
                </span>
                <span className="font-medium truncate">
                  {row.user.displayName}
                  {hasSock ? " 🧦" : ""}
                </span>
              </div>
              <div className="shrink-0 text-xs text-muted-foreground tabular-nums">
                Streak {row.currentStreak}
                <span className="text-muted-foreground/70">
                  {" "}
                  · Best {row.bestStreak}
                </span>
              </div>
            </div>

            <div className="mt-2.5 grid grid-cols-4 gap-2 pl-6">
              <StandingStat label="Played" value={String(row.played)} />
              <StandingStat label="Match" value={`${matchRate}%`} />
              <StandingStat label="Call" value={`${callRate}%`} />
              <StandingStat label="Socks" value={socksValue} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
