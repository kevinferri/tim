import { beforeEach, describe, expect, it } from "vitest";
import { prismaClient, resetDb } from "@/test/db";
import { getUpDownStandings } from "./standings";

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

async function createCircle(ownerId: string) {
  return prismaClient.circle.create({
    data: { name: "Casino Circle", userId: ownerId },
  });
}

describe("getUpDownStandings", () => {
  it("sums each player's games in the circle, sorted by net", async () => {
    const [ada, bo, cy] = await Promise.all(
      ["Ada", "Bo", "Cy"].map(createUser),
    );
    const circle = await createCircle(ada.id);
    const other = await createCircle(ada.id);
    await prismaClient.casinoPlayerStats.createMany({
      data: [
        {
          circleId: circle.id,
          userId: ada.id,
          game: "blackjack",
          net: -300,
          wagered: 500,
          handsPlayed: 10,
        },
        {
          circleId: circle.id,
          userId: ada.id,
          game: "poker",
          net: 100,
          wagered: 40,
          handsPlayed: 2,
        },
        {
          circleId: circle.id,
          userId: bo.id,
          game: "blackjack",
          net: 450,
          wagered: 350,
          handsPlayed: 7,
        },
        // Another circle's numbers don't count here.
        {
          circleId: other.id,
          userId: bo.id,
          game: "blackjack",
          net: 9_000,
          wagered: 9_000,
          handsPlayed: 50,
        },
        // A row with no hands yet (seated, never played) is left off.
        {
          circleId: circle.id,
          userId: cy.id,
          game: "blackjack",
          net: 0,
          wagered: 0,
          handsPlayed: 0,
        },
      ],
    });

    const rows = await getUpDownStandings(circle.id);

    expect(
      rows.map((r) => [r.user.displayName, r.net, r.wagered, r.handsPlayed]),
    ).toEqual([
      ["Bo", 450, 350, 7],
      ["Ada", -200, 540, 12],
    ]);
  });

  it("returns nothing for a circle nobody has played in", async () => {
    const ada = await createUser("Ada");
    const circle = await createCircle(ada.id);
    await expect(getUpDownStandings(circle.id)).resolves.toEqual([]);
  });
});
