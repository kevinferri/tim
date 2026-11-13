import { beforeEach, describe, expect, it } from "vitest";
import { NotificationType } from "@tim/socket-types";
import { prismaClient, resetDb } from "@/test/db";
import { runSamePageJobs } from "./jobs";
import { revealRound, setSamePageEnabled, submitSamePageAnswer } from "./model";

// Monday Nov 9, 2026 (EST = UTC-5)
const MON_10AM = new Date("2026-11-09T15:00:00.000Z");
const MON_2_30PM = new Date("2026-11-09T19:30:00.000Z");
const MON_4_30PM = new Date("2026-11-09T21:30:00.000Z");
const TUE_10AM = new Date("2026-11-10T15:00:00.000Z");

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

async function createCircle({ enabled }: { enabled: boolean }) {
  const [a, b, c] = await Promise.all(["Alice", "Bob", "Cara"].map(createUser));
  const circle = await prismaClient.circle.create({
    data: {
      name: "Circle",
      userId: a.id,
      members: { connect: [a, b, c].map(({ id }) => ({ id })) },
    },
  });
  if (enabled) await setSamePageEnabled(circle.id, true);
  return { circle, a, b, c };
}

function notificationsFor(circleId: string, type: NotificationType) {
  return prismaClient.notification.findMany({ where: { circleId, type } });
}

describe("runSamePageJobs", () => {
  it("does nothing for circles where Same Page is off", async () => {
    const { circle } = await createCircle({ enabled: false });

    await runSamePageJobs(MON_10AM);

    expect(
      await prismaClient.samePageRound.count({
        where: { circleId: circle.id },
      }),
    ).toBe(0);
    expect(
      await prismaClient.notification.count({ where: { circleId: circle.id } }),
    ).toBe(0);
  });

  it("creates the round and notifies every member once", async () => {
    const { circle, a, b, c } = await createCircle({ enabled: true });

    await runSamePageJobs(MON_10AM);
    await runSamePageJobs(MON_10AM);

    const prompts = await notificationsFor(
      circle.id,
      NotificationType.SamePagePrompt,
    );
    expect(prompts.map((n) => n.recipientId).sort()).toEqual(
      [a.id, b.id, c.id].sort(),
    );
    const round = await prismaClient.samePageRound.findFirstOrThrow({
      where: { circleId: circle.id },
    });
    expect(round.promptNotifiedAt).not.toBeNull();
  });

  it("nudges only members who haven't answered", async () => {
    const { circle, a, b, c } = await createCircle({ enabled: true });
    await runSamePageJobs(MON_10AM);
    await submitSamePageAnswer({
      circleId: circle.id,
      userId: a.id,
      text: "Pizza",
      now: MON_10AM,
    });

    await runSamePageJobs(MON_2_30PM);
    await runSamePageJobs(MON_2_30PM);

    const nudges = await notificationsFor(
      circle.id,
      NotificationType.SamePageNudge,
    );
    expect(nudges.map((n) => n.recipientId).sort()).toEqual(
      [b.id, c.id].sort(),
    );
  });

  it("doesn't send the prompt and the nudge together after a late start", async () => {
    const { circle } = await createCircle({ enabled: true });

    await runSamePageJobs(MON_2_30PM);

    expect(
      await notificationsFor(circle.id, NotificationType.SamePagePrompt),
    ).toHaveLength(3);
    expect(
      await notificationsFor(circle.id, NotificationType.SamePageNudge),
    ).toHaveLength(0);
  });

  it("reveals after close and notifies every member once", async () => {
    const { circle, a } = await createCircle({ enabled: true });
    await runSamePageJobs(MON_10AM);
    await submitSamePageAnswer({
      circleId: circle.id,
      userId: a.id,
      text: "Pizza",
      now: MON_10AM,
    });

    await runSamePageJobs(MON_4_30PM);
    await runSamePageJobs(MON_4_30PM);

    const round = await prismaClient.samePageRound.findFirstOrThrow({
      where: { circleId: circle.id },
    });
    expect(round.revealedAt).not.toBeNull();
    expect(
      await notificationsFor(circle.id, NotificationType.SamePageReveal),
    ).toHaveLength(3);
    const stats = await prismaClient.samePagePlayerStats.findUniqueOrThrow({
      where: { circleId_userId: { circleId: circle.id, userId: a.id } },
    });
    expect(stats.played).toBe(1);
  });

  it("still sends the reveal if someone opened the game and revealed it first", async () => {
    const { circle } = await createCircle({ enabled: true });
    await runSamePageJobs(MON_10AM);
    const round = await prismaClient.samePageRound.findFirstOrThrow({
      where: { circleId: circle.id },
    });
    await revealRound(round.id, MON_4_30PM);

    await runSamePageJobs(MON_4_30PM);

    expect(
      await notificationsFor(circle.id, NotificationType.SamePageReveal),
    ).toHaveLength(3);
  });

  it("catches up on a reveal missed the day before", async () => {
    const { circle, a } = await createCircle({ enabled: true });
    await runSamePageJobs(MON_10AM);
    await submitSamePageAnswer({
      circleId: circle.id,
      userId: a.id,
      text: "Pizza",
      now: MON_10AM,
    });

    // Server was down from Monday morning until Tuesday morning.
    await runSamePageJobs(TUE_10AM);

    const monday = await prismaClient.samePageRound.findUniqueOrThrow({
      where: {
        circleId_gameDate: { circleId: circle.id, gameDate: "2026-11-09" },
      },
    });
    expect(monday.revealedAt).not.toBeNull();
    expect(monday.revealNotifiedAt).not.toBeNull();
    expect(
      await prismaClient.samePageRound.count({
        where: { circleId: circle.id, gameDate: "2026-11-10" },
      }),
    ).toBe(1);
  });

  it("doesn't reveal today's round before close", async () => {
    const { circle } = await createCircle({ enabled: true });

    await runSamePageJobs(MON_2_30PM);

    const round = await prismaClient.samePageRound.findFirstOrThrow({
      where: { circleId: circle.id },
    });
    expect(round.revealedAt).toBeNull();
  });
});
