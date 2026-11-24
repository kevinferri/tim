import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./odds-api", () => ({
  fetchSlate: vi.fn(),
  fetchFinalScores: vi.fn(),
  OddsApiError: class OddsApiError extends Error {},
}));

import { prismaClient, resetDb } from "@/test/db";
import type { SlateGame } from "../lib/odds";
import { fetchFinalScores, fetchSlate } from "./odds-api";
import {
  applyFinalScores,
  ensureWeekSlate,
  getGamesAwaitingResult,
  gradeFinishedGames,
} from "./model";

// Monday Nov 23, 2026, 6am Eastern (EST = UTC-5).
const MONDAY = new Date("2026-11-23T11:00:00.000Z");
const THURSDAY_KICKOFF = new Date("2026-11-26T01:15:00.000Z");
const FRIDAY = new Date("2026-11-27T12:00:00.000Z");

beforeEach(async () => {
  await resetDb();
  vi.mocked(fetchSlate).mockReset();
  vi.mocked(fetchFinalScores).mockReset();
});

function slateGame(overrides: Partial<SlateGame> = {}): SlateGame {
  return {
    eventId: "evt-1",
    homeTeam: "Philadelphia Eagles",
    awayTeam: "Dallas Cowboys",
    kickoffAt: THURSDAY_KICKOFF,
    spread: -3.5,
    ...overrides,
  };
}

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

describe("ensureWeekSlate", () => {
  it("stores the fetched slate under the week's Monday", async () => {
    vi.mocked(fetchSlate).mockResolvedValue([
      slateGame(),
      slateGame({ eventId: "evt-2", homeTeam: "Chicago Bears" }),
    ]);

    const weekId = await ensureWeekSlate(MONDAY);

    const week = await prismaClient.nflAtsWeek.findUniqueOrThrow({
      where: { id: weekId! },
      include: { games: true },
    });
    expect(week.season).toBe(2026);
    expect(week.startsOn).toBe("2026-11-23");
    expect(week.games).toHaveLength(2);
    expect(week.games[0].spread).toBe(-3.5);
  });

  it("doesn't fetch again once the week has a slate", async () => {
    vi.mocked(fetchSlate).mockResolvedValue([slateGame()]);
    await ensureWeekSlate(MONDAY);

    await ensureWeekSlate(new Date("2026-11-23T19:00:00.000Z"));

    expect(fetchSlate).toHaveBeenCalledTimes(1);
    expect(await prismaClient.nflAtsGame.count()).toBe(1);
  });

  it("leaves a game that already belongs to an earlier week where it is", async () => {
    // Last week's slate, still holding Monday night's game.
    vi.mocked(fetchSlate).mockResolvedValue([slateGame({ eventId: "mnf" })]);
    const previousWeekId = await ensureWeekSlate(
      new Date("2026-11-16T11:00:00.000Z"),
    );

    // This week's fetch sweeps that same game up again, plus a new one.
    vi.mocked(fetchSlate).mockResolvedValue([
      slateGame({ eventId: "mnf" }),
      slateGame({ eventId: "evt-new" }),
    ]);
    const weekId = await ensureWeekSlate(MONDAY);

    const mnf = await prismaClient.nflAtsGame.findUniqueOrThrow({
      where: { eventId: "mnf" },
    });
    expect(mnf.weekId).toBe(previousWeekId);
    expect(weekId).not.toBeNull();
    expect(
      await prismaClient.nflAtsGame.count({ where: { weekId: weekId! } }),
    ).toBe(1);
  });

  it("writes no empty week when the slate comes back empty", async () => {
    vi.mocked(fetchSlate).mockResolvedValue([]);

    expect(await ensureWeekSlate(MONDAY)).toBeNull();
    expect(await prismaClient.nflAtsWeek.count()).toBe(0);
  });
});

describe("getGamesAwaitingResult", () => {
  it("is only games that have kicked off and have no score yet", async () => {
    vi.mocked(fetchSlate).mockResolvedValue([
      slateGame({ eventId: "started" }),
      slateGame({
        eventId: "later",
        kickoffAt: new Date("2026-11-30T18:00:00.000Z"),
      }),
    ]);
    await ensureWeekSlate(MONDAY);

    const awaiting = await getGamesAwaitingResult(FRIDAY);

    expect(awaiting.map((game) => game.eventId)).toEqual(["started"]);
  });
});

describe("applyFinalScores", () => {
  async function seedGameWithPicks() {
    vi.mocked(fetchSlate).mockResolvedValue([slateGame()]);
    await ensureWeekSlate(MONDAY);
    const game = await prismaClient.nflAtsGame.findUniqueOrThrow({
      where: { eventId: "evt-1" },
    });

    const [alice, bob] = await Promise.all([
      createUser("Alice"),
      createUser("Bob"),
    ]);
    await prismaClient.nflAtsPick.createMany({
      data: [
        { userId: alice.id, gameId: game.id, side: "home" },
        { userId: bob.id, gameId: game.id, side: "away" },
      ],
    });
    return { game, alice, bob };
  }

  it("stores the score and grades both sides of it", async () => {
    const { game, alice, bob } = await seedGameWithPicks();

    // Home favored by 3.5 and wins by 7, so home covers.
    await applyFinalScores(
      [{ eventId: "evt-1", homeScore: 24, awayScore: 17 }],
      FRIDAY,
    );

    const stored = await prismaClient.nflAtsGame.findUniqueOrThrow({
      where: { id: game.id },
    });
    expect(stored.homeScore).toBe(24);
    expect(stored.completedAt).toEqual(FRIDAY);

    const picks = await prismaClient.nflAtsPick.findMany({
      orderBy: { side: "asc" },
    });
    expect(picks.find((p) => p.userId === alice.id)?.result).toBe("win");
    expect(picks.find((p) => p.userId === bob.id)?.result).toBe("loss");
  });

  it("grades a push as a push for everyone", async () => {
    vi.mocked(fetchSlate).mockResolvedValue([slateGame({ spread: -3 })]);
    await ensureWeekSlate(MONDAY);
    const game = await prismaClient.nflAtsGame.findUniqueOrThrow({
      where: { eventId: "evt-1" },
    });
    const alice = await createUser("Alice");
    await prismaClient.nflAtsPick.create({
      data: { userId: alice.id, gameId: game.id, side: "home" },
    });

    await applyFinalScores(
      [{ eventId: "evt-1", homeScore: 24, awayScore: 21 }],
      FRIDAY,
    );

    const pick = await prismaClient.nflAtsPick.findFirstOrThrow();
    expect(pick.result).toBe("push");
  });

  it("won't regrade a game it has already settled", async () => {
    const { game } = await seedGameWithPicks();
    await applyFinalScores(
      [{ eventId: "evt-1", homeScore: 24, awayScore: 17 }],
      FRIDAY,
    );

    // A corrected score arriving late must not overwrite a settled game.
    await applyFinalScores(
      [{ eventId: "evt-1", homeScore: 0, awayScore: 50 }],
      FRIDAY,
    );

    const stored = await prismaClient.nflAtsGame.findUniqueOrThrow({
      where: { id: game.id },
    });
    expect(stored.homeScore).toBe(24);
    const picks = await prismaClient.nflAtsPick.findMany();
    expect(picks.map((p) => p.result).sort()).toEqual(["loss", "win"]);
  });

  it("ignores a score for a game that isn't on any slate", async () => {
    await applyFinalScores(
      [{ eventId: "not-ours", homeScore: 24, awayScore: 17 }],
      FRIDAY,
    );

    expect(await prismaClient.nflAtsGame.count()).toBe(0);
  });
});

describe("gradeFinishedGames", () => {
  it("spends no API call when nothing has kicked off", async () => {
    vi.mocked(fetchSlate).mockResolvedValue([
      slateGame({ kickoffAt: new Date("2026-11-30T18:00:00.000Z") }),
    ]);
    await ensureWeekSlate(MONDAY);

    expect(await gradeFinishedGames(MONDAY)).toEqual([]);
    expect(fetchFinalScores).not.toHaveBeenCalled();
  });

  it("returns the weeks it settled a game in", async () => {
    vi.mocked(fetchSlate).mockResolvedValue([slateGame()]);
    const weekId = await ensureWeekSlate(MONDAY);
    vi.mocked(fetchFinalScores).mockResolvedValue([
      { eventId: "evt-1", homeScore: 24, awayScore: 17 },
    ]);

    expect(await gradeFinishedGames(FRIDAY)).toEqual([weekId]);
  });
});
