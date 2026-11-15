import { beforeEach, describe, expect, it } from "vitest";
import { pgClient, resetDb } from "../test/db";
import { isGameEnabled } from "./circle-games";

beforeEach(resetDb);

async function createCircle() {
  const [user] = await pgClient("users")
    .insert({
      id: crypto.randomUUID(),
      googleId: `google-${crypto.randomUUID()}`,
      name: "Test User",
      displayName: "Test",
    })
    .returning(["id"]);
  const [circle] = await pgClient("circles")
    .insert({ id: crypto.randomUUID(), name: "Test Circle", userId: user.id })
    .returning(["id"]);
  return circle.id as string;
}

describe("isGameEnabled", () => {
  it("is true only when the circle has a row for that game", async () => {
    const circleId = await createCircle();
    const otherCircleId = await createCircle();
    await pgClient("circle_games").insert({ circleId, gameId: "blackjack" });

    expect(await isGameEnabled({ circleId, gameId: "blackjack" })).toBe(true);
    expect(await isGameEnabled({ circleId, gameId: "wordsmith" })).toBe(false);
    expect(
      await isGameEnabled({ circleId: otherCircleId, gameId: "blackjack" }),
    ).toBe(false);
  });
});
