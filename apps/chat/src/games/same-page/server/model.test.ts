import { beforeEach, describe, expect, it } from "vitest";
import { prismaClient, resetDb } from "@/test/db";
import {
  getGamesBadge,
  getSamePageState,
  isCircleAdmin,
  revealRound,
  markPromptViewed,
  markResultsViewed,
  setSamePageEnabled,
  submitSamePageAnswer,
} from "./model";
import { getEstGameDate } from "../lib/est-day";
import { toMatchKey } from "../lib/matching";

// Monday Nov 9, 2026 10:00 EST = 15:00 UTC (play)
const PLAY_NOW = new Date("2026-11-09T15:00:00.000Z");
// Monday Nov 9, 2026 16:30 EST = 21:30 UTC (results)
const RESULTS_NOW = new Date("2026-11-09T21:30:00.000Z");

beforeEach(resetDb);

async function createUser(name = "Test") {
  return prismaClient.user.create({
    data: {
      googleId: `google-${crypto.randomUUID()}`,
      name,
      displayName: name,
      email: `${crypto.randomUUID()}@example.com`,
    },
  });
}

async function createCircleWithMembers(
  members: { id: string }[],
  ownerId: string,
  { enabled = true } = {},
) {
  const circle = await prismaClient.circle.create({
    data: {
      name: "Same Page Circle",
      userId: ownerId,
      members: { connect: members.map((m) => ({ id: m.id })) },
    },
  });
  if (enabled) await setSamePageEnabled(circle.id, true);
  return circle;
}

describe("getGamesBadge", () => {
  it("clears the play badge once the game is opened, even without answering", async () => {
    const owner = await createUser("Owner");
    const circle = await createCircleWithMembers([owner], owner.id);
    const args = { circleId: circle.id, userId: owner.id, now: PLAY_NOW };

    await expect(getGamesBadge(args)).resolves.toBe("play");
    await markPromptViewed(args);
    await expect(getGamesBadge(args)).resolves.toBeNull();
  });

  it("shows the results badge until results are opened", async () => {
    const owner = await createUser("Owner");
    const circle = await createCircleWithMembers([owner], owner.id);
    const args = { circleId: circle.id, userId: owner.id, now: RESULTS_NOW };

    // Opening the game during play creates today's round.
    await getSamePageState({ ...args, now: PLAY_NOW });
    await expect(getGamesBadge(args)).resolves.toBe("results");
    await markResultsViewed(args);
    await expect(getGamesBadge(args)).resolves.toBeNull();
  });
});

describe("opening the game after close with no round today", () => {
  it("doesn't create or reveal a round, so streaks and the badge are untouched", async () => {
    const owner = await createUser("Owner");
    const circle = await createCircleWithMembers([owner], owner.id);
    await prismaClient.samePagePlayerStats.create({
      data: { circleId: circle.id, userId: owner.id, currentStreak: 3 },
    });
    const args = { circleId: circle.id, userId: owner.id, now: RESULTS_NOW };

    const state = await getSamePageState(args);

    expect(state).toMatchObject({ enabled: true, prompt: null, results: null });
    expect(
      await prismaClient.samePageRound.count({
        where: { circleId: circle.id },
      }),
    ).toBe(0);
    const stats = await prismaClient.samePagePlayerStats.findUniqueOrThrow({
      where: { circleId_userId: { circleId: circle.id, userId: owner.id } },
    });
    expect(stats.currentStreak).toBe(3);
    await expect(getGamesBadge(args)).resolves.toBeNull();
  });
});

describe("when Same Page is off for the circle", () => {
  it("is off by default and shows no game state or badge", async () => {
    const owner = await createUser("Owner");
    const member = await createUser("Member");
    const circle = await createCircleWithMembers([owner, member], owner.id, {
      enabled: false,
    });

    await expect(
      getSamePageState({
        circleId: circle.id,
        userId: member.id,
        now: PLAY_NOW,
      }),
    ).resolves.toEqual({ enabled: false, isAdmin: false });
    await expect(
      getSamePageState({
        circleId: circle.id,
        userId: owner.id,
        now: PLAY_NOW,
      }),
    ).resolves.toEqual({ enabled: false, isAdmin: true });
    await expect(
      getGamesBadge({ circleId: circle.id, userId: member.id, now: PLAY_NOW }),
    ).resolves.toBeNull();
    expect(
      await prismaClient.samePageRound.count({
        where: { circleId: circle.id },
      }),
    ).toBe(0);
  });

  it("rejects answers", async () => {
    const owner = await createUser("Owner");
    const circle = await createCircleWithMembers([owner], owner.id, {
      enabled: false,
    });

    await expect(
      submitSamePageAnswer({
        circleId: circle.id,
        userId: owner.id,
        text: "Pizza",
        now: PLAY_NOW,
      }),
    ).rejects.toThrow(/isn't turned on/);
  });

  it("only treats the circle's creator as admin", async () => {
    const owner = await createUser("Owner");
    const member = await createUser("Member");
    const circle = await createCircleWithMembers([owner, member], owner.id);

    await expect(isCircleAdmin(circle.id, owner.id)).resolves.toBe(true);
    await expect(isCircleAdmin(circle.id, member.id)).resolves.toBe(false);
  });
});

describe("submitSamePageAnswer", () => {
  it("locks an answer and rejects a second submit", async () => {
    const a = await createUser("Alice");
    const circle = await createCircleWithMembers([a], a.id);

    await submitSamePageAnswer({
      circleId: circle.id,
      userId: a.id,
      text: "Survivor",
      now: PLAY_NOW,
    });

    await expect(
      submitSamePageAnswer({
        circleId: circle.id,
        userId: a.id,
        text: "The Bachelor",
        now: PLAY_NOW,
      }),
    ).rejects.toThrow(/locked/i);
  });

  it("rejects calling yourself", async () => {
    const a = await createUser("Alice");
    const circle = await createCircleWithMembers([a], a.id);

    await expect(
      submitSamePageAnswer({
        circleId: circle.id,
        userId: a.id,
        text: "Survivor",
        calledUserId: a.id,
        now: PLAY_NOW,
      }),
    ).rejects.toThrow(/yourself/i);
  });

  it("rejects calling a non-member", async () => {
    const a = await createUser("Alice");
    const outsider = await createUser("Outsider");
    const circle = await createCircleWithMembers([a], a.id);

    await expect(
      submitSamePageAnswer({
        circleId: circle.id,
        userId: a.id,
        text: "Survivor",
        calledUserId: outsider.id,
        now: PLAY_NOW,
      }),
    ).rejects.toThrow(/circle member/i);
  });

  it("stores a call to another circle member", async () => {
    const a = await createUser("Alice");
    const b = await createUser("Bob");
    const circle = await createCircleWithMembers([a, b], a.id);

    const answer = await submitSamePageAnswer({
      circleId: circle.id,
      userId: a.id,
      text: "Survivor",
      calledUserId: b.id,
      now: PLAY_NOW,
    });

    expect(answer.calledUserId).toBe(b.id);
    expect(answer.matchKey).toBe(toMatchKey("Survivor"));
  });
});

describe("revealRound", () => {
  it("awards Sock to the lone unmatched player and updates streaks/stats", async () => {
    const a = await createUser("Alice");
    const b = await createUser("Bob");
    const c = await createUser("Cara");
    const circle = await createCircleWithMembers([a, b, c], a.id);
    const gameDate = getEstGameDate(PLAY_NOW);

    const round = await prismaClient.samePageRound.create({
      data: {
        circleId: circle.id,
        gameDate,
        prompt: "Name a reality TV show",
      },
    });

    await prismaClient.samePageAnswer.createMany({
      data: [
        {
          roundId: round.id,
          userId: a.id,
          text: "Survivor",
          matchKey: toMatchKey("Survivor"),
          calledUserId: b.id,
        },
        {
          roundId: round.id,
          userId: b.id,
          text: "survivor",
          matchKey: toMatchKey("survivor"),
        },
        {
          roundId: round.id,
          userId: c.id,
          text: "Bachelor",
          matchKey: toMatchKey("Bachelor"),
        },
      ],
    });

    const first = await revealRound(round.id, RESULTS_NOW);
    expect(first?.newlyRevealed).toBe(true);
    expect(first?.round.revealedAt).not.toBeNull();

    const sock = await prismaClient.samePageSock.findUnique({
      where: { circleId: circle.id },
    });
    expect(sock?.holderUserId).toBe(c.id);

    const aliceStats = await prismaClient.samePagePlayerStats.findUnique({
      where: { circleId_userId: { circleId: circle.id, userId: a.id } },
    });
    expect(aliceStats?.played).toBe(1);
    expect(aliceStats?.currentStreak).toBe(1);
    expect(aliceStats?.matchedRounds).toBe(1);
    expect(aliceStats?.correctCalls).toBe(1);
    expect(aliceStats?.callAttempts).toBe(1);

    const caraStats = await prismaClient.samePagePlayerStats.findUnique({
      where: { circleId_userId: { circleId: circle.id, userId: c.id } },
    });
    expect(caraStats?.matchedRounds).toBe(0);
    expect(caraStats?.socksEarned).toBe(1);
    expect(caraStats?.sockDaysHeld).toBe(1);

    // Second reveal is a no-op claim.
    const second = await revealRound(round.id, RESULTS_NOW);
    expect(second?.newlyRevealed).toBe(false);
    const caraAgain = await prismaClient.samePagePlayerStats.findUnique({
      where: { circleId_userId: { circleId: circle.id, userId: c.id } },
    });
    expect(caraAgain?.socksEarned).toBe(1);
  });

  it("resets streak for members who skipped the round", async () => {
    const a = await createUser("Alice");
    const b = await createUser("Bob");
    const circle = await createCircleWithMembers([a, b], a.id);
    const gameDate = getEstGameDate(PLAY_NOW);

    await prismaClient.samePagePlayerStats.create({
      data: {
        circleId: circle.id,
        userId: b.id,
        currentStreak: 3,
        bestStreak: 3,
        played: 3,
      },
    });

    const round = await prismaClient.samePageRound.create({
      data: {
        circleId: circle.id,
        gameDate,
        prompt: "Name a snack",
      },
    });
    await prismaClient.samePageAnswer.create({
      data: {
        roundId: round.id,
        userId: a.id,
        text: "chips",
        matchKey: toMatchKey("chips"),
      },
    });

    await revealRound(round.id, RESULTS_NOW);

    const bob = await prismaClient.samePagePlayerStats.findUnique({
      where: { circleId_userId: { circleId: circle.id, userId: b.id } },
    });
    expect(bob?.currentStreak).toBe(0);
    expect(bob?.bestStreak).toBe(3);
  });
});
