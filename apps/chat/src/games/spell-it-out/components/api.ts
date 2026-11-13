// Client calls and cache keys for the Spell It Out API route.
import type { LetterScore } from "../lib/rules";
import type { SpellItOutStats } from "../lib/stats";

export type Member = {
  id: string;
  displayName: string;
  name: string | null;
  imageUrl: string | null;
};

export type GuessRow = { word: string; scores: LetterScore[] };

export type MyPlay = {
  rows: GuessRow[];
  solved: boolean;
  finished: boolean;
  answer: string | null;
};

export type CircleResult = {
  user: Member;
  isYou: boolean;
  status: "playing" | "solved" | "failed";
  guessCount: number;
  rows: GuessRow[] | null;
};

export type SpellItOutState =
  | {
      enabled: true;
      isAdmin: boolean;
      gameDate: string;
      /** False on weekends: no word, no results. */
      isGameDay: boolean;
      maxGuesses: number;
      myPlay: MyPlay;
      circleResults: CircleResult[];
      stats: SpellItOutStats;
    }
  | { enabled: false; isAdmin: boolean };

const url = (circleId: string, badge?: boolean) =>
  `/api/circles/${circleId}/spell-it-out${badge ? "?view=badge" : ""}`;

export const spellItOutQueryKey = (circleId: string) => [
  "spell-it-out",
  circleId,
];

export async function fetchSpellItOut<T = SpellItOutState>(
  circleId: string,
  badge?: boolean,
) {
  const res = await fetch(url(circleId, badge));
  if (!res.ok) throw new Error("Couldn’t load Spell It Out");
  return (await res.json()) as T;
}

/** Throws the route's own error message (e.g. "Not in the word list") when present. */
export async function postSpellItOut<T = unknown>(
  circleId: string,
  body: Record<string, unknown>,
) {
  const res = await fetch(url(circleId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data as T;
}
