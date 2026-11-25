import { beforeEach, describe, expect, it } from "vitest";
import { pgClient, resetDb } from "../test/db";
import { loadCircleStanding, recordHand } from "./casino-stats";

beforeEach(resetDb);

async function createUser() {
  const [user] = await pgClient("users")
    .insert({
      id: crypto.randomUUID(),
      googleId: `google-${crypto.randomUUID()}`,
      name: "Test User",
      displayName: "Test",
    })
    .returning(["id"]);
  return user.id as string;
}

async function createCircle(ownerId: string) {
  const [circle] = await pgClient("circles")
    .insert({ id: crypto.randomUUID(), name: "Test Circle", userId: ownerId })
    .returning(["id"]);
  return circle.id as string;
}

async function setup() {
  const userId = await createUser();
  const circleId = await createCircle(userId);
  return { userId, circleId };
}

const statsRow = (circleId: string, userId: string, game: string) =>
  pgClient("casino_player_stats").where({ circleId, userId, game }).first();

describe("loadCircleStanding", () => {
  it("is 0 and never played before a first hand", async () => {
    const { userId, circleId } = await setup();
    expect(await loadCircleStanding(circleId, userId)).toEqual({
      net: 0,
      lastPlayedAt: null,
    });
  });

  it("knows when their last hand in the circle settled, in any game", async () => {
    const { userId, circleId } = await setup();
    const otherCircleId = await createCircle(userId);
    const latest = new Date("2026-11-20T10:00:00.000Z");
    await pgClient("casino_player_stats").insert([
      {
        circleId,
        userId,
        game: "blackjack",
        updatedAt: new Date("2026-11-01"),
      },
      { circleId, userId, game: "texas-holdem", updatedAt: latest },
      {
        circleId: otherCircleId,
        userId,
        game: "blackjack",
        updatedAt: new Date(),
      },
    ]);
    expect((await loadCircleStanding(circleId, userId)).lastPlayedAt).toEqual(
      latest,
    );
  });

  it("sums every game in the circle, and only that circle", async () => {
    const { userId, circleId } = await setup();
    const otherCircleId = await createCircle(userId);
    await pgClient("casino_player_stats").insert([
      { circleId, userId, game: "blackjack", net: 300 },
      { circleId, userId, game: "texas-holdem", net: -500 },
      { circleId: otherCircleId, userId, game: "blackjack", net: 9_000 },
    ]);
    expect((await loadCircleStanding(circleId, userId)).net).toBe(-200);
  });
});

describe("recordHand", () => {
  it("creates the row on a first hand, then accumulates", async () => {
    const { userId, circleId } = await setup();
    const hand = { circleId, userId, game: "blackjack" as const };
    await recordHand({ ...hand, net: 100, wagered: 100 });
    await recordHand({ ...hand, net: -300, wagered: 300 });
    await recordHand({ ...hand, net: 0, wagered: 50 });

    expect(await statsRow(circleId, userId, "blackjack")).toMatchObject({
      net: -200,
      wagered: 450,
      handsPlayed: 3,
    });
    expect((await loadCircleStanding(circleId, userId)).net).toBe(-200);
  });

  it("never loses an update when hands settle at the same time", async () => {
    const { userId, circleId } = await setup();
    const otherId = await createUser();
    await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        recordHand({
          circleId,
          userId: i % 2 ? userId : otherId,
          game: "blackjack",
          net: 10,
          wagered: 10,
        }),
      ),
    );
    for (const id of [userId, otherId]) {
      expect(await statsRow(circleId, id, "blackjack")).toMatchObject({
        net: 100,
        wagered: 100,
        handsPlayed: 10,
      });
    }
  });
});
