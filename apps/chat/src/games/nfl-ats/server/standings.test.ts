import { beforeEach, describe, expect, it } from "vitest";
import { prismaClient, resetDb } from "@/test/db";
import { getStandings } from "./standings";

// Tue Dec 1, 2026, 6am Eastern: this week starts Mon Nov 30, last week Nov 23.
const THIS_WEEK = new Date("2026-12-01T11:00:00.000Z");

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

async function createCircle(names: string[]) {
  const users = [];
  for (const name of names) users.push(await createUser(name));
  const circle = await prismaClient.circle.create({
    data: {
      name: "Circle",
      userId: users[0].id,
      members: { connect: users.map((u) => ({ id: u.id })) },
    },
  });
  return { circle, users };
}

let gameSeq = 0;

/** A graded game in the given week, with one pick per entry in `results`. */
async function gradedGame(
  startsOn: string,
  results: { userId: string; result: "win" | "loss" | "push" }[],
) {
  const week = await prismaClient.nflAtsWeek.upsert({
    where: { season_startsOn: { season: 2026, startsOn } },
    create: { season: 2026, startsOn },
    update: {},
    select: { id: true },
  });
  gameSeq += 1;
  const game = await prismaClient.nflAtsGame.create({
    data: {
      weekId: week.id,
      eventId: `evt-${gameSeq}`,
      homeTeam: "Home",
      awayTeam: "Away",
      kickoffAt: new Date(`${startsOn}T18:00:00.000Z`),
      spread: -3.5,
      homeScore: 24,
      awayScore: 17,
      completedAt: new Date(`${startsOn}T22:00:00.000Z`),
    },
  });
  for (const { userId, result } of results) {
    await prismaClient.nflAtsPick.create({
      data: { userId, gameId: game.id, side: "home", result },
    });
  }
  return game;
}

describe("getStandings", () => {
  it("lists every member, even one who has never picked", async () => {
    const { circle, users } = await createCircle(["Ann", "Bo", "Cy"]);

    const standings = await getStandings({
      circleId: circle.id,
      userId: users[0].id,
      now: THIS_WEEK,
    });

    expect(standings.rows).toHaveLength(3);
    expect(standings.rows.every((r) => r.winPct === null)).toBe(true);
  });

  it("tallies the season and ranks on percentage", async () => {
    const { circle, users } = await createCircle(["Ann", "Bo"]);
    const [ann, bo] = users;
    await gradedGame("2026-11-23", [
      { userId: ann.id, result: "win" },
      { userId: bo.id, result: "loss" },
    ]);
    await gradedGame("2026-11-30", [
      { userId: ann.id, result: "win" },
      { userId: bo.id, result: "win" },
    ]);

    const standings = await getStandings({
      circleId: circle.id,
      userId: ann.id,
      now: THIS_WEEK,
    });

    expect(
      standings.rows.map((r) => [r.user.displayName, r.season, r.winPct]),
    ).toEqual([
      ["Ann", { wins: 2, losses: 0, pushes: 0 }, 1],
      ["Bo", { wins: 1, losses: 1, pushes: 0 }, 0.5],
    ]);
  });

  it("splits last week out from the season", async () => {
    const { circle, users } = await createCircle(["Ann"]);
    const [ann] = users;
    await gradedGame("2026-11-23", [{ userId: ann.id, result: "win" }]);
    await gradedGame("2026-11-23", [{ userId: ann.id, result: "loss" }]);
    await gradedGame("2026-11-30", [{ userId: ann.id, result: "win" }]);

    const standings = await getStandings({
      circleId: circle.id,
      userId: ann.id,
      now: THIS_WEEK,
    });

    expect(standings.lastWeekStartsOn).toBe("2026-11-23");
    expect(standings.rows[0].lastWeek).toEqual({
      wins: 1,
      losses: 1,
      pushes: 0,
    });
    expect(standings.rows[0].season).toEqual({
      wins: 2,
      losses: 1,
      pushes: 0,
    });
  });

  it("has no last-week column when nobody played last week", async () => {
    const { circle, users } = await createCircle(["Ann"]);
    await gradedGame("2026-11-30", [{ userId: users[0].id, result: "win" }]);

    const standings = await getStandings({
      circleId: circle.id,
      userId: users[0].id,
      now: THIS_WEEK,
    });

    expect(standings.lastWeekStartsOn).toBeNull();
    expect(standings.rows[0].lastWeek).toBeNull();
  });

  it("leaves pushes out of the percentage but keeps them in the record", async () => {
    const { circle, users } = await createCircle(["Ann"]);
    const [ann] = users;
    await gradedGame("2026-11-30", [{ userId: ann.id, result: "win" }]);
    await gradedGame("2026-11-30", [{ userId: ann.id, result: "push" }]);

    const standings = await getStandings({
      circleId: circle.id,
      userId: ann.id,
      now: THIS_WEEK,
    });

    expect(standings.rows[0].season).toEqual({
      wins: 1,
      losses: 0,
      pushes: 1,
    });
    expect(standings.rows[0].winPct).toBe(1);
  });

  it("ignores picks that haven't been graded", async () => {
    const { circle, users } = await createCircle(["Ann"]);
    const week = await prismaClient.nflAtsWeek.create({
      data: { season: 2026, startsOn: "2026-11-30" },
    });
    const game = await prismaClient.nflAtsGame.create({
      data: {
        weekId: week.id,
        eventId: "evt-ungraded",
        homeTeam: "Home",
        awayTeam: "Away",
        kickoffAt: new Date("2026-12-03T01:15:00.000Z"),
        spread: -3,
      },
    });
    await prismaClient.nflAtsPick.create({
      data: { userId: users[0].id, gameId: game.id, side: "home" },
    });

    const standings = await getStandings({
      circleId: circle.id,
      userId: users[0].id,
      now: THIS_WEEK,
    });

    expect(standings.rows[0].season).toEqual({
      wins: 0,
      losses: 0,
      pushes: 0,
    });
    expect(standings.rows[0].winPct).toBeNull();
  });

  it("counts only this circle's members", async () => {
    const { circle, users } = await createCircle(["Ann"]);
    const outsider = await createUser("Zed");
    await gradedGame("2026-11-30", [
      { userId: users[0].id, result: "win" },
      { userId: outsider.id, result: "win" },
    ]);

    const standings = await getStandings({
      circleId: circle.id,
      userId: users[0].id,
      now: THIS_WEEK,
    });

    expect(standings.rows.map((r) => r.user.displayName)).toEqual(["Ann"]);
  });

  it("marks the viewer's own row", async () => {
    const { circle, users } = await createCircle(["Ann", "Bo"]);

    const standings = await getStandings({
      circleId: circle.id,
      userId: users[1].id,
      now: THIS_WEEK,
    });

    expect(standings.rows.filter((r) => r.isYou).map((r) => r.user.id)).toEqual(
      [users[1].id],
    );
  });

  it("sinks members with nothing decided below everyone who has played", async () => {
    const { circle, users } = await createCircle(["Ann", "Bo"]);
    // Bo is 0-1; Ann hasn't picked. A losing record still outranks no record.
    await gradedGame("2026-11-30", [{ userId: users[1].id, result: "loss" }]);

    const standings = await getStandings({
      circleId: circle.id,
      userId: users[0].id,
      now: THIS_WEEK,
    });

    expect(standings.rows.map((r) => r.user.displayName)).toEqual([
      "Bo",
      "Ann",
    ]);
  });
});
