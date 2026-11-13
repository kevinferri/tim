import { beforeEach, describe, expect, it } from "vitest";
import { prismaClient, resetDb } from "@/test/db";
import { getSeenBadgeKeys, markBadgesSeen } from "./seen";

beforeEach(resetDb);

const MORNING = new Date("2026-11-13T14:00:00Z"); // 9am Eastern
const AFTERNOON = new Date("2026-11-13T21:30:00Z"); // 4:30pm Eastern
const NEXT_DAY = new Date("2026-11-14T14:00:00Z");

async function setup() {
  const user = await prismaClient.user.create({
    data: {
      googleId: `google-${crypto.randomUUID()}`,
      name: "Owner",
      displayName: "Owner",
      email: `${crypto.randomUUID()}@example.com`,
    },
  });
  const circle = await prismaClient.circle.create({
    data: {
      name: "Circle",
      userId: user.id,
      members: { connect: [{ id: user.id }] },
    },
  });
  return { userId: user.id, circleId: circle.id };
}

describe("Game room seen badges", () => {
  it("adds to today's keys and starts fresh the next day", async () => {
    const ids = await setup();

    await expect(getSeenBadgeKeys({ ...ids, now: MORNING })).resolves.toEqual(
      [],
    );

    await markBadgesSeen({
      ...ids,
      badgeKeys: ["same-page:play", "wordsmith:play"],
      now: MORNING,
    });
    await markBadgesSeen({
      ...ids,
      badgeKeys: ["same-page:play", "same-page:results"],
      now: AFTERNOON,
    });
    await expect(getSeenBadgeKeys({ ...ids, now: AFTERNOON })).resolves.toEqual(
      ["same-page:play", "wordsmith:play", "same-page:results"],
    );

    await expect(getSeenBadgeKeys({ ...ids, now: NEXT_DAY })).resolves.toEqual(
      [],
    );
    await markBadgesSeen({
      ...ids,
      badgeKeys: ["wordsmith:play"],
      now: NEXT_DAY,
    });
    await expect(getSeenBadgeKeys({ ...ids, now: NEXT_DAY })).resolves.toEqual([
      "wordsmith:play",
    ]);
  });

  it("keeps each circle separate", async () => {
    const ids = await setup();
    const other = await prismaClient.circle.create({
      data: {
        name: "Other",
        userId: ids.userId,
        members: { connect: [{ id: ids.userId }] },
      },
    });

    await markBadgesSeen({
      ...ids,
      badgeKeys: ["same-page:play"],
      now: MORNING,
    });
    await expect(
      getSeenBadgeKeys({
        userId: ids.userId,
        circleId: other.id,
        now: MORNING,
      }),
    ).resolves.toEqual([]);
  });
});
