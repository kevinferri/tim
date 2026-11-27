import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./odds-api", () => ({
  fetchSlate: vi.fn(),
  fetchFinalScores: vi.fn(),
  OddsApiError: class OddsApiError extends Error {},
}));

import { prismaClient, resetDb } from "@/test/db";
import { setGameEnabled } from "@/games/game-room/server";
import { NFL_ATS_GAME_ID } from "../lib/game-id";
import type { SlateGame } from "../lib/odds";
import { fetchFinalScores, fetchSlate } from "./odds-api";
import { runNflAtsJobs } from "./jobs";

// Monday Nov 23, 2026, 6am Eastern (EST = UTC-5).
const MONDAY = new Date("2026-11-23T11:00:00.000Z");
const FRIDAY = new Date("2026-11-27T12:00:00.000Z");

beforeEach(async () => {
  await resetDb();
  vi.mocked(fetchSlate).mockReset();
  vi.mocked(fetchFinalScores).mockReset();
  vi.mocked(fetchFinalScores).mockResolvedValue([]);
});

function slateGame(overrides: Partial<SlateGame> = {}): SlateGame {
  return {
    eventId: "evt-1",
    homeTeam: "Philadelphia Eagles",
    awayTeam: "Dallas Cowboys",
    kickoffAt: new Date("2026-11-26T01:15:00.000Z"),
    spread: -3.5,
    ...overrides,
  };
}

async function createCircle({ enabled }: { enabled: boolean }) {
  const owner = await prismaClient.user.create({
    data: {
      googleId: `google-${crypto.randomUUID()}`,
      name: "Alice",
      displayName: "Alice",
      email: `${crypto.randomUUID()}@example.com`,
    },
  });
  const circle = await prismaClient.circle.create({
    data: {
      name: "Circle",
      userId: owner.id,
      members: { connect: { id: owner.id } },
    },
  });
  if (enabled) await setGameEnabled(circle.id, NFL_ATS_GAME_ID, true);
  return circle;
}

describe("runNflAtsJobs", () => {
  it("does nothing, and spends nothing, while no circle has the game on", async () => {
    await createCircle({ enabled: false });

    await runNflAtsJobs(MONDAY);

    expect(fetchSlate).not.toHaveBeenCalled();
    expect(fetchFinalScores).not.toHaveBeenCalled();
    expect(await prismaClient.nflAtsWeek.count()).toBe(0);
  });

  it("publishes the week's slate once the game is on", async () => {
    await createCircle({ enabled: true });
    vi.mocked(fetchSlate).mockResolvedValue([slateGame()]);

    await runNflAtsJobs(MONDAY);

    const week = await prismaClient.nflAtsWeek.findFirstOrThrow({
      include: { games: true },
    });
    expect(week.startsOn).toBe("2026-11-23");
    expect(week.games).toHaveLength(1);
  });

  it("doesn't refetch the slate on a later run in the same week", async () => {
    await createCircle({ enabled: true });
    vi.mocked(fetchSlate).mockResolvedValue([slateGame()]);

    await runNflAtsJobs(MONDAY);
    await runNflAtsJobs(new Date("2026-11-23T19:00:00.000Z"));

    expect(fetchSlate).toHaveBeenCalledTimes(1);
    expect(await prismaClient.nflAtsGame.count()).toBe(1);
  });

  it("grades a game once it has finished", async () => {
    await createCircle({ enabled: true });
    vi.mocked(fetchSlate).mockResolvedValue([slateGame()]);
    await runNflAtsJobs(MONDAY);

    vi.mocked(fetchFinalScores).mockResolvedValue([
      { eventId: "evt-1", homeScore: 24, awayScore: 17 },
    ]);
    await runNflAtsJobs(FRIDAY);

    const game = await prismaClient.nflAtsGame.findUniqueOrThrow({
      where: { eventId: "evt-1" },
    });
    expect(game.homeScore).toBe(24);
    expect(game.completedAt).not.toBeNull();
  });

  it("still grades when the slate fetch fails", async () => {
    await createCircle({ enabled: true });
    vi.mocked(fetchSlate).mockResolvedValue([slateGame()]);
    await runNflAtsJobs(MONDAY);

    // A later run can't reach the API for a new slate, but results are in.
    vi.mocked(fetchSlate).mockRejectedValue(new Error("quota exhausted"));
    vi.mocked(fetchFinalScores).mockResolvedValue([
      { eventId: "evt-1", homeScore: 24, awayScore: 17 },
    ]);

    await runNflAtsJobs(new Date("2026-11-30T11:00:00.000Z"));

    const game = await prismaClient.nflAtsGame.findUniqueOrThrow({
      where: { eventId: "evt-1" },
    });
    expect(game.completedAt).not.toBeNull();
  });
});
