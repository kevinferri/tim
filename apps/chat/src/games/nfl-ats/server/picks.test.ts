import { beforeEach, describe, expect, it } from "vitest";
import { prismaClient, resetDb } from "@/test/db";
import { setGameEnabled } from "@/games/game-room/server";
import { NFL_ATS_GAME_ID } from "../lib/game-id";
import {
  getNflAtsBadge,
  getNflAtsState,
  submitPick,
  setNflAtsEnabled,
} from "./picks";

// Monday Nov 23, 2026, 6am Eastern (EST = UTC-5).
const MONDAY = new Date("2026-11-23T11:00:00.000Z");
const THURSDAY_KICKOFF = new Date("2026-11-26T01:15:00.000Z");
const SUNDAY_KICKOFF = new Date("2026-11-29T18:00:00.000Z");
const AFTER_THURSDAY = new Date("2026-11-26T02:00:00.000Z");

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

/** An admin-owned circle with the game on, plus a second member who isn't admin. */
async function createCircle({ enabled = true }: { enabled?: boolean } = {}) {
  const admin = await createUser("Admin");
  const member = await createUser("Member");
  const circle = await prismaClient.circle.create({
    data: {
      name: "Circle",
      userId: admin.id,
      members: { connect: [{ id: admin.id }, { id: member.id }] },
    },
  });
  if (enabled) await setGameEnabled(circle.id, NFL_ATS_GAME_ID, true);
  return { circle, admin, member };
}

async function createSlate() {
  const week = await prismaClient.nflAtsWeek.create({
    data: { season: 2026, startsOn: "2026-11-23" },
  });
  const thursday = await prismaClient.nflAtsGame.create({
    data: {
      weekId: week.id,
      eventId: "evt-thu",
      homeTeam: "Detroit Lions",
      awayTeam: "Chicago Bears",
      kickoffAt: THURSDAY_KICKOFF,
      spread: -3.5,
    },
  });
  const sunday = await prismaClient.nflAtsGame.create({
    data: {
      weekId: week.id,
      eventId: "evt-sun",
      homeTeam: "Philadelphia Eagles",
      awayTeam: "Dallas Cowboys",
      kickoffAt: SUNDAY_KICKOFF,
      spread: 2.5,
    },
  });
  return { week, thursday, sunday };
}

describe("getNflAtsState", () => {
  it("reports off, and no slate, until the circle turns it on", async () => {
    const { circle, admin } = await createCircle({ enabled: false });
    await createSlate();

    const state = await getNflAtsState({
      circleId: circle.id,
      userId: admin.id,
      now: MONDAY,
    });

    expect(state).toEqual({ enabled: false, isAdmin: true });
  });

  it("marks only the circle's creator as admin", async () => {
    const { circle, member } = await createCircle();

    const state = await getNflAtsState({
      circleId: circle.id,
      userId: member.id,
      now: MONDAY,
    });

    expect(state.isAdmin).toBe(false);
  });

  it("returns this week's games in kickoff order, none picked yet", async () => {
    const { circle, admin } = await createCircle();
    await createSlate();

    const state = await getNflAtsState({
      circleId: circle.id,
      userId: admin.id,
      now: MONDAY,
    });

    if (!state.enabled) throw new Error("expected enabled");
    expect(state.weekStartsOn).toBe("2026-11-23");
    expect(state.games.map((g) => g.homeTeam)).toEqual([
      "Detroit Lions",
      "Philadelphia Eagles",
    ]);
    expect(state.games.every((g) => g.myPick === null)).toBe(true);
    expect(state.games.every((g) => !g.locked)).toBe(true);
  });

  it("shows only the viewer's own pick", async () => {
    const { circle, admin, member } = await createCircle();
    const { thursday } = await createSlate();
    await submitPick({
      circleId: circle.id,
      userId: member.id,
      gameId: thursday.id,
      side: "away",
      now: MONDAY,
    });

    const mine = await getNflAtsState({
      circleId: circle.id,
      userId: member.id,
      now: MONDAY,
    });
    const theirs = await getNflAtsState({
      circleId: circle.id,
      userId: admin.id,
      now: MONDAY,
    });

    if (!mine.enabled || !theirs.enabled) throw new Error("expected enabled");
    expect(mine.games.find((g) => g.id === thursday.id)?.myPick).toBe("away");
    expect(theirs.games.find((g) => g.id === thursday.id)?.myPick).toBeNull();
  });

  it("locks a game once it has kicked off, leaving the rest open", async () => {
    const { circle, admin } = await createCircle();
    const { thursday, sunday } = await createSlate();

    const state = await getNflAtsState({
      circleId: circle.id,
      userId: admin.id,
      now: AFTER_THURSDAY,
    });

    if (!state.enabled) throw new Error("expected enabled");
    expect(state.games.find((g) => g.id === thursday.id)?.locked).toBe(true);
    expect(state.games.find((g) => g.id === sunday.id)?.locked).toBe(false);
  });

  it("has no games before the season's first slate", async () => {
    const { circle, admin } = await createCircle();

    const state = await getNflAtsState({
      circleId: circle.id,
      userId: admin.id,
      now: MONDAY,
    });

    if (!state.enabled) throw new Error("expected enabled");
    expect(state.weekStartsOn).toBeNull();
    expect(state.games).toEqual([]);
  });
});

describe("submitPick", () => {
  it("takes a side, and lets it be changed before kickoff", async () => {
    const { circle, admin } = await createCircle();
    const { sunday } = await createSlate();

    await submitPick({
      circleId: circle.id,
      userId: admin.id,
      gameId: sunday.id,
      side: "home",
      now: MONDAY,
    });
    await submitPick({
      circleId: circle.id,
      userId: admin.id,
      gameId: sunday.id,
      side: "away",
      now: MONDAY,
    });

    const picks = await prismaClient.nflAtsPick.findMany({
      where: { userId: admin.id, gameId: sunday.id },
    });
    expect(picks).toHaveLength(1);
    expect(picks[0].side).toBe("away");
  });

  it("refuses a pick on a game that has kicked off", async () => {
    const { circle, admin } = await createCircle();
    const { thursday } = await createSlate();

    await expect(
      submitPick({
        circleId: circle.id,
        userId: admin.id,
        gameId: thursday.id,
        side: "home",
        now: AFTER_THURSDAY,
      }),
    ).rejects.toThrow(/already kicked off/);

    expect(await prismaClient.nflAtsPick.count()).toBe(0);
  });

  it("still takes a later game after an earlier one has started", async () => {
    const { circle, admin } = await createCircle();
    const { sunday } = await createSlate();

    await submitPick({
      circleId: circle.id,
      userId: admin.id,
      gameId: sunday.id,
      side: "home",
      now: AFTER_THURSDAY,
    });

    expect(await prismaClient.nflAtsPick.count()).toBe(1);
  });

  it("refuses a pick while the game is off for the circle", async () => {
    const { circle, admin } = await createCircle({ enabled: false });
    const { sunday } = await createSlate();

    await expect(
      submitPick({
        circleId: circle.id,
        userId: admin.id,
        gameId: sunday.id,
        side: "home",
        now: MONDAY,
      }),
    ).rejects.toThrow(/isn’t on/);
  });

  it("404s on a game that doesn't exist", async () => {
    const { circle, admin } = await createCircle();

    await expect(
      submitPick({
        circleId: circle.id,
        userId: admin.id,
        gameId: crypto.randomUUID(),
        side: "home",
        now: MONDAY,
      }),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe("getNflAtsBadge", () => {
  it("is nothing while the game is off", async () => {
    const { circle, admin } = await createCircle({ enabled: false });
    await createSlate();

    expect(
      await getNflAtsBadge({
        circleId: circle.id,
        userId: admin.id,
        now: MONDAY,
      }),
    ).toEqual({ badge: null, nextChangeAt: null });
  });

  it("says play while an open game is unpicked, and points at its kickoff", async () => {
    const { circle, admin } = await createCircle();
    await createSlate();

    const badge = await getNflAtsBadge({
      circleId: circle.id,
      userId: admin.id,
      now: MONDAY,
    });

    expect(badge.badge).toBe("play");
    expect(badge.nextChangeAt).toBe(THURSDAY_KICKOFF.toISOString());
  });

  it("clears once every open game has a pick", async () => {
    const { circle, admin } = await createCircle();
    const { thursday, sunday } = await createSlate();
    for (const game of [thursday, sunday]) {
      await submitPick({
        circleId: circle.id,
        userId: admin.id,
        gameId: game.id,
        side: "home",
        now: MONDAY,
      });
    }

    expect(
      (
        await getNflAtsBadge({
          circleId: circle.id,
          userId: admin.id,
          now: MONDAY,
        })
      ).badge,
    ).toBeNull();
  });

  it("stops counting a game you never picked once it kicks off", async () => {
    const { circle, admin } = await createCircle();
    const { sunday } = await createSlate();
    await submitPick({
      circleId: circle.id,
      userId: admin.id,
      gameId: sunday.id,
      side: "home",
      now: MONDAY,
    });

    // Thursday's game went unpicked, but it's started: nothing left to do.
    expect(
      (
        await getNflAtsBadge({
          circleId: circle.id,
          userId: admin.id,
          now: AFTER_THURSDAY,
        })
      ).badge,
    ).toBeNull();
  });
});

describe("setNflAtsEnabled", () => {
  it("turns the game on and off for the circle, keeping picks", async () => {
    const { circle, admin } = await createCircle();
    const { sunday } = await createSlate();
    await submitPick({
      circleId: circle.id,
      userId: admin.id,
      gameId: sunday.id,
      side: "home",
      now: MONDAY,
    });

    await setNflAtsEnabled(circle.id, false);
    expect(
      (
        await getNflAtsState({
          circleId: circle.id,
          userId: admin.id,
          now: MONDAY,
        })
      ).enabled,
    ).toBe(false);
    expect(await prismaClient.nflAtsPick.count()).toBe(1);

    await setNflAtsEnabled(circle.id, true);
    expect(
      (
        await getNflAtsState({
          circleId: circle.id,
          userId: admin.id,
          now: MONDAY,
        })
      ).enabled,
    ).toBe(true);
  });
});
