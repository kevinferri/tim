import { Prisma } from "@prisma/client";
import { NotificationType } from "@tim/socket-types";
import { prismaClient } from "@/lib/prisma/client";
import { ApiError } from "@/lib/api-error";
import {
  isCircleAdmin,
  isGameEnabled,
  notifyCircleMembers,
  setGameEnabled,
} from "@/games/game-room/server";
import type { GameBadge } from "@/games/game-room";
import { SPELL_IT_OUT_GAME_ID } from "../lib/game-id";
import { getGameDate, isGameDay } from "../lib/day";
import {
  isFinished,
  isWellFormedGuess,
  MAX_GUESSES,
  normalizeGuess,
  scoreGuess,
  WORD_LENGTH,
  type LetterScore,
} from "../lib/rules";
import { computeStats } from "../lib/stats";
import { getAnswer, isAcceptedWord } from "./words";

const MEMBER_SELECT = {
  id: true,
  displayName: true,
  name: true,
  imageUrl: true,
} as const;

export class SpellItOutValidationError extends ApiError {
  constructor(message: string) {
    super(400, message);
    this.name = "SpellItOutValidationError";
  }
}

export { isCircleAdmin };

export function isSpellItOutEnabled(circleId: string) {
  return isGameEnabled(circleId, SPELL_IT_OUT_GAME_ID);
}

/** Caller must have checked isCircleAdmin. Plays are kept either way. */
export function setSpellItOutEnabled(circleId: string, enabled: boolean) {
  return setGameEnabled(circleId, SPELL_IT_OUT_GAME_ID, enabled);
}

type PlayRow = { guesses: string[]; solved: boolean; finishedAt: Date | null };

function scoreRows(guesses: string[], answer: string) {
  return guesses.map((word) => ({ word, scores: scoreGuess(word, answer) }));
}

function toMyPlay(play: PlayRow | null, answer: string) {
  const guesses = play?.guesses ?? [];
  const finished = !!play?.finishedAt;
  return {
    rows: scoreRows(guesses, answer),
    solved: play?.solved ?? false,
    finished,
    answer: finished ? answer : null,
  };
}

/** Plays are global per user, so the viewer is "in" a circle only if it has the game on. */
async function requireEnabled(circleId: string) {
  if (!(await isSpellItOutEnabled(circleId))) {
    throw new SpellItOutValidationError("Spell It Out is off in this circle");
  }
}

export async function submitGuess({
  circleId,
  userId,
  guess: rawGuess,
  now = new Date(),
}: {
  circleId: string;
  userId: string;
  guess: string;
  now?: Date;
}) {
  await requireEnabled(circleId);

  const gameDate = getGameDate(now);
  if (!isGameDay(gameDate)) {
    throw new SpellItOutValidationError(
      "Spell It Out takes weekends off. Back Monday!",
    );
  }

  const guess = normalizeGuess(rawGuess);
  if (!isWellFormedGuess(guess)) {
    throw new SpellItOutValidationError(`Guesses are ${WORD_LENGTH} letters`);
  }
  if (!isAcceptedWord(guess)) {
    throw new SpellItOutValidationError("Not in the word list");
  }

  const answer = getAnswer(gameDate);
  const where = { userId_gameDate: { userId, gameDate } };
  const existing = await prismaClient.spellItOutPlay.findUnique({ where });

  if (existing?.finishedAt) {
    throw new SpellItOutValidationError("You’ve already finished today");
  }

  const guesses = [...(existing?.guesses ?? []), guess];
  const solved = guess === answer;
  const data = {
    guesses,
    solved,
    finishedAt: isFinished(guesses.length, solved) ? now : null,
  };

  try {
    await prismaClient.$transaction(async (tx) => {
      if (!existing) {
        await tx.spellItOutPlay.create({ data: { userId, gameDate, ...data } });
      } else {
        // updatedAt acts as a version so two tabs can't both append onto the same guess list.
        const { count } = await tx.spellItOutPlay.updateMany({
          where: { id: existing.id, updatedAt: existing.updatedAt },
          data,
        });
        if (count === 0) {
          throw new ApiError(409, "Guess already in progress, try again");
        }
      }
      // Only the circle it was finished from is notified, though the result shows in every enabled circle.
      if (data.finishedAt) {
        await notifyCircleMembers(tx, {
          circleId,
          actorId: userId,
          type: NotificationType.SpellItOutFinished,
        });
      }
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new ApiError(409, "Guess already in progress, try again");
    }
    throw err;
  }

  return toMyPlay({ ...data }, answer);
}

export async function getGamesBadge({
  circleId,
  userId,
  now = new Date(),
}: {
  circleId: string;
  userId: string;
  now?: Date;
}): Promise<GameBadge> {
  const gameDate = getGameDate(now);
  if (!isGameDay(gameDate)) return null;
  if (!(await isSpellItOutEnabled(circleId))) return null;
  const play = await prismaClient.spellItOutPlay.findUnique({
    where: { userId_gameDate: { userId, gameDate } },
    select: { finishedAt: true },
  });
  return play?.finishedAt ? null : "play";
}

export type CircleResult = {
  user: {
    id: string;
    displayName: string;
    name: string | null;
    imageUrl: string | null;
  };
  isYou: boolean;
  status: "playing" | "solved" | "failed";
  guessCount: number;
  /** Full rows only once the viewer has finished, so nothing is spoiled. */
  rows: { word: string; scores: LetterScore[] }[] | null;
};

async function getCircleResults(
  circleId: string,
  gameDate: string,
  answer: string,
  viewer: { id: string; finished: boolean },
): Promise<CircleResult[]> {
  const circle = await prismaClient.circle.findUnique({
    where: { id: circleId },
    select: { members: { select: MEMBER_SELECT } },
  });
  const members = circle?.members ?? [];
  const plays = await prismaClient.spellItOutPlay.findMany({
    where: { gameDate, userId: { in: members.map((m) => m.id) } },
    select: { userId: true, guesses: true, solved: true, finishedAt: true },
  });
  const byUser = new Map(plays.map((p) => [p.userId, p]));

  const results: CircleResult[] = [];
  for (const user of members) {
    const play = byUser.get(user.id);
    if (!play) continue;
    const finished = !!play.finishedAt;
    results.push({
      user,
      isYou: user.id === viewer.id,
      status: !finished ? "playing" : play.solved ? "solved" : "failed",
      guessCount: finished ? play.guesses.length : 0,
      rows:
        viewer.finished && finished ? scoreRows(play.guesses, answer) : null,
    });
  }

  const rank = (r: CircleResult) =>
    r.status === "solved" ? r.guessCount : r.status === "failed" ? 10 : 20;
  return results.sort(
    (a, b) =>
      rank(a) - rank(b) || a.user.displayName.localeCompare(b.user.displayName),
  );
}

async function getStats(userId: string, today: string) {
  const plays = await prismaClient.spellItOutPlay.findMany({
    where: { userId },
    select: { gameDate: true, guesses: true, solved: true, finishedAt: true },
  });
  return computeStats(
    plays.map((p) => ({
      gameDate: p.gameDate,
      guessCount: p.guesses.length,
      solved: p.solved,
      finished: !!p.finishedAt,
    })),
    today,
  );
}

export async function getSpellItOutState({
  circleId,
  userId,
  now = new Date(),
}: {
  circleId: string;
  userId: string;
  now?: Date;
}) {
  const [enabled, isAdmin] = await Promise.all([
    isSpellItOutEnabled(circleId),
    isCircleAdmin(circleId, userId),
  ]);
  if (!enabled) return { enabled: false as const, isAdmin };

  const gameDate = getGameDate(now);
  if (!isGameDay(gameDate)) {
    return {
      enabled: true as const,
      isAdmin,
      gameDate,
      isGameDay: false,
      maxGuesses: MAX_GUESSES,
      myPlay: toMyPlay(null, ""),
      circleResults: [],
      stats: await getStats(userId, gameDate),
    };
  }

  const answer = getAnswer(gameDate);
  const play = await prismaClient.spellItOutPlay.findUnique({
    where: { userId_gameDate: { userId, gameDate } },
    select: { guesses: true, solved: true, finishedAt: true },
  });
  const myPlay = toMyPlay(play, answer);

  const [circleResults, stats] = await Promise.all([
    getCircleResults(circleId, gameDate, answer, {
      id: userId,
      finished: myPlay.finished,
    }),
    getStats(userId, gameDate),
  ]);

  return {
    enabled: true as const,
    isAdmin,
    gameDate,
    isGameDay: true,
    maxGuesses: MAX_GUESSES,
    myPlay,
    circleResults,
    stats,
  };
}
