import { beforeEach, describe, expect, it } from "vitest";
import { prismaClient, resetDb } from "@/test/db";
import {
  getCircleIdsWithGame,
  isCircleAdmin,
  isGameEnabled,
  setGameEnabled,
} from "./index";

beforeEach(resetDb);

async function createCircle() {
  const [owner, member] = await Promise.all(
    ["Owner", "Member"].map((name) =>
      prismaClient.user.create({
        data: {
          googleId: `google-${crypto.randomUUID()}`,
          name,
          displayName: name,
          email: `${crypto.randomUUID()}@example.com`,
        },
      }),
    ),
  );
  const circle = await prismaClient.circle.create({
    data: {
      name: "Circle",
      userId: owner.id,
      members: { connect: [{ id: owner.id }, { id: member.id }] },
    },
  });
  return { circle, owner, member };
}

describe("game room settings", () => {
  it("keeps every game off by default and toggles each game independently", async () => {
    const { circle } = await createCircle();

    await expect(isGameEnabled(circle.id, "same-page")).resolves.toBe(false);

    await setGameEnabled(circle.id, "same-page", true);
    await setGameEnabled(circle.id, "same-page", true);
    await expect(isGameEnabled(circle.id, "same-page")).resolves.toBe(true);
    await expect(isGameEnabled(circle.id, "other-game")).resolves.toBe(false);
    await expect(getCircleIdsWithGame("same-page")).resolves.toEqual([
      circle.id,
    ]);

    await setGameEnabled(circle.id, "same-page", false);
    await expect(isGameEnabled(circle.id, "same-page")).resolves.toBe(false);
    await expect(getCircleIdsWithGame("same-page")).resolves.toEqual([]);
  });

  it("only treats the circle's creator as admin", async () => {
    const { circle, owner, member } = await createCircle();

    await expect(isCircleAdmin(circle.id, owner.id)).resolves.toBe(true);
    await expect(isCircleAdmin(circle.id, member.id)).resolves.toBe(false);
  });
});
