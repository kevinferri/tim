import { beforeEach, describe, expect, it } from "vitest";
import { prismaClient, resetDb } from "@/test/db";
import {
  getGamesBadge,
  getWordsmithState,
  setWordsmithEnabled,
  submitGuess,
} from "./model";
import { getAnswer, isAcceptedWord } from "./words";
import { getGameDate } from "../lib/day";

// Friday Nov 13, 2026 10:00 EST
const NOW = new Date("2026-11-13T15:00:00.000Z");
// The next game day after Friday NOW.
const MONDAY = new Date("2026-11-16T15:00:00.000Z");
const SATURDAY = new Date("2026-11-14T15:00:00.000Z");
const ANSWER = getAnswer(getGameDate(NOW));
const WRONG = ["crane", "plumb", "sight", "dowdy", "gawky", "lemon"].filter(
  (w) => w !== ANSWER,
);

beforeEach(resetDb);

async function createUser(name: string) {
  return prismaClient.user.create({
    data: {
      googleId: `google-${crypto.randomUUID()}`,
      name,
      displayName: name,
      email: `${crypto.randomUUID()}@example.com`,
    },
  });
}

async function createCircle(
  ownerId: string,
  memberIds: string[],
  enabled = true,
) {
  const circle = await prismaClient.circle.create({
    data: {
      name: "Circle",
      userId: ownerId,
      members: { connect: memberIds.map((id) => ({ id })) },
    },
  });
  if (enabled) await setWordsmithEnabled(circle.id, true);
  return circle;
}

async function guess(
  circleId: string,
  userId: string,
  word: string,
  now = NOW,
) {
  return submitGuess({ circleId, userId, guess: word, now });
}

async function state(circleId: string, userId: string, now = NOW) {
  const s = await getWordsmithState({ circleId, userId, now });
  if (!s.enabled) throw new Error("expected enabled");
  return s;
}

it("test words are all accepted guesses", () => {
  expect(WRONG.length).toBeGreaterThanOrEqual(5);
  for (const w of [...WRONG, ANSWER]) expect(isAcceptedWord(w)).toBe(true);
});

describe("submitGuess", () => {
  it("scores guesses and hides the answer until finished", async () => {
    const a = await createUser("Ana");
    const circle = await createCircle(a.id, [a.id]);

    const play = await guess(circle.id, a.id, WRONG[0]);
    expect(play.rows).toHaveLength(1);
    expect(play.finished).toBe(false);
    expect(play.answer).toBeNull();

    const solved = await guess(circle.id, a.id, ANSWER.toUpperCase());
    expect(solved.solved).toBe(true);
    expect(solved.answer).toBe(ANSWER);
    expect(solved.rows[1].scores).toEqual(Array(5).fill("hit"));
  });

  it("finishes as a loss after six misses and rejects more guesses", async () => {
    const a = await createUser("Ana");
    const circle = await createCircle(a.id, [a.id]);
    let play;
    for (const w of WRONG.slice(0, 6)) play = await guess(circle.id, a.id, w);
    expect(play!.finished).toBe(true);
    expect(play!.solved).toBe(false);
    expect(play!.answer).toBe(ANSWER);
    await expect(guess(circle.id, a.id, ANSWER)).rejects.toThrow(
      "already finished",
    );
  });

  it.each([
    ["too short", "cat", "5 letters"],
    ["not a word", "xqzvk", "Not in the word list"],
  ])("rejects %s", async (_label, word, message) => {
    const a = await createUser("Ana");
    const circle = await createCircle(a.id, [a.id]);
    await expect(guess(circle.id, a.id, word)).rejects.toThrow(message);
  });

  it("rejects guesses from a circle with the game off", async () => {
    const a = await createUser("Ana");
    const circle = await createCircle(a.id, [a.id], false);
    await expect(guess(circle.id, a.id, WRONG[0])).rejects.toThrow("off");
  });

  it("is one play per day across all of a user's circles", async () => {
    const a = await createUser("Ana");
    const c1 = await createCircle(a.id, [a.id]);
    const c2 = await createCircle(a.id, [a.id]);
    await guess(c1.id, a.id, WRONG[0]);
    await guess(c2.id, a.id, ANSWER);

    const s = await state(c1.id, a.id);
    expect(s.myPlay.rows.map((r) => r.word)).toEqual([WRONG[0], ANSWER]);
    expect(s.myPlay.solved).toBe(true);
    expect(await prismaClient.wordsmithPlay.count()).toBe(1);
  });
});

describe("getWordsmithState", () => {
  it("shows circle-mates' letters only after the viewer finishes", async () => {
    const a = await createUser("Ana");
    const b = await createUser("Ben");
    const circle = await createCircle(a.id, [a.id, b.id]);
    await guess(circle.id, b.id, WRONG[0]);
    await guess(circle.id, b.id, ANSWER);

    const before = await state(circle.id, a.id);
    expect(before.circleResults).toEqual([
      expect.objectContaining({
        isYou: false,
        status: "solved",
        guessCount: 2,
        rows: null,
      }),
    ]);

    await guess(circle.id, a.id, ANSWER);
    const after = await state(circle.id, a.id);
    const ben = after.circleResults.find((r) => r.user.id === b.id);
    expect(ben?.rows?.map((r) => r.word)).toEqual([WRONG[0], ANSWER]);
  });

  it("doesn't reveal a friend's guess count while they're still playing", async () => {
    const a = await createUser("Ana");
    const b = await createUser("Ben");
    const circle = await createCircle(a.id, [a.id, b.id]);
    await guess(circle.id, b.id, WRONG[0]);
    await guess(circle.id, a.id, ANSWER);

    const s = await state(circle.id, a.id);
    expect(s.circleResults.find((r) => r.user.id === b.id)).toEqual(
      expect.objectContaining({ status: "playing", guessCount: 0, rows: null }),
    );
  });

  it("includes you, ranked with everyone else", async () => {
    const a = await createUser("Ana");
    const b = await createUser("Ben");
    const circle = await createCircle(a.id, [a.id, b.id]);
    await guess(circle.id, b.id, WRONG[0]);
    await guess(circle.id, b.id, ANSWER);
    await guess(circle.id, a.id, ANSWER);

    const s = await state(circle.id, a.id);
    expect(
      s.circleResults.map((r) => [r.user.displayName, r.isYou, r.guessCount]),
    ).toEqual([
      ["Ana", true, 1],
      ["Ben", false, 2],
    ]);
    expect(s.circleResults[0].rows).toHaveLength(1);
  });

  it("lists only members of this circle", async () => {
    const a = await createUser("Ana");
    const b = await createUser("Ben");
    const outsider = await createUser("Out");
    const circle = await createCircle(a.id, [a.id, b.id]);
    const other = await createCircle(outsider.id, [outsider.id]);
    await guess(other.id, outsider.id, ANSWER);

    expect((await state(circle.id, a.id)).circleResults).toEqual([]);
  });

  it("builds stats from history", async () => {
    const a = await createUser("Ana");
    const circle = await createCircle(a.id, [a.id]);
    await guess(circle.id, a.id, ANSWER);
    const mondayAnswer = getAnswer(getGameDate(MONDAY));
    await guess(circle.id, a.id, mondayAnswer, MONDAY);

    const s = await state(circle.id, a.id, MONDAY);
    expect(s.stats).toMatchObject({
      played: 2,
      currentStreak: 2,
      bestStreak: 2,
    });
    expect(s.stats.distribution[0]).toBe(2);
    expect(s.myPlay.rows).toHaveLength(1);
  });
});

describe("getGamesBadge", () => {
  it("is 'play' until today's game is finished, and off when disabled", async () => {
    const a = await createUser("Ana");
    const circle = await createCircle(a.id, [a.id]);
    const badge = () =>
      getGamesBadge({ circleId: circle.id, userId: a.id, now: NOW });

    expect(await badge()).toBe("play");
    await guess(circle.id, a.id, WRONG[0]);
    expect(await badge()).toBe("play");
    await guess(circle.id, a.id, ANSWER);
    expect(await badge()).toBeNull();

    await setWordsmithEnabled(circle.id, false);
    expect(
      await getGamesBadge({ circleId: circle.id, userId: a.id, now: MONDAY }),
    ).toBeNull();
  });
});

describe("weekends", () => {
  it("has no word, badge, or results, and keeps stats", async () => {
    const a = await createUser("Ana");
    const circle = await createCircle(a.id, [a.id]);
    await guess(circle.id, a.id, ANSWER);

    await expect(guess(circle.id, a.id, WRONG[0], SATURDAY)).rejects.toThrow(
      /weekends off/,
    );
    await expect(
      getGamesBadge({ circleId: circle.id, userId: a.id, now: SATURDAY }),
    ).resolves.toBeNull();

    const s = await state(circle.id, a.id, SATURDAY);
    expect(s).toMatchObject({
      isGameDay: false,
      myPlay: { rows: [], finished: false, answer: null },
      circleResults: [],
      stats: { played: 1, currentStreak: 1 },
    });
  });
});

describe("finish notifications", () => {
  const notifications = () =>
    prismaClient.notification.findMany({
      select: { recipientId: true, actorId: true, circleId: true, type: true },
    });

  it("notifies circle-mates once the game is finished, not on each guess", async () => {
    const a = await createUser("Ana");
    const b = await createUser("Ben");
    const circle = await createCircle(a.id, [a.id, b.id]);

    await guess(circle.id, a.id, WRONG[0]);
    expect(await notifications()).toEqual([]);

    await guess(circle.id, a.id, ANSWER);
    expect(await notifications()).toEqual([
      {
        recipientId: b.id,
        actorId: a.id,
        circleId: circle.id,
        type: "wordsmith:finished",
      },
    ]);
  });

  it("notifies on a loss too", async () => {
    const a = await createUser("Ana");
    const b = await createUser("Ben");
    const circle = await createCircle(a.id, [a.id, b.id]);
    for (const w of WRONG.slice(0, 6)) await guess(circle.id, a.id, w);
    expect(await notifications()).toHaveLength(1);
  });

  it("only notifies the circle it was finished from", async () => {
    const a = await createUser("Ana");
    const b = await createUser("Ben");
    const c = await createUser("Cy");
    const playedFrom = await createCircle(a.id, [a.id, b.id]);
    await createCircle(a.id, [a.id, b.id, c.id]);

    await guess(playedFrom.id, a.id, ANSWER);
    expect(await notifications()).toEqual([
      expect.objectContaining({ recipientId: b.id, circleId: playedFrom.id }),
    ]);
  });

  it("sends nothing when nobody else is in the circle", async () => {
    const a = await createUser("Ana");
    const circle = await createCircle(a.id, [a.id]);
    await guess(circle.id, a.id, ANSWER);
    expect(await notifications()).toEqual([]);
  });
});
