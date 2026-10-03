import { describe, it, expect } from "vitest";
import {
  computeProfileBadges,
  currentStreak,
  CircleBadgeAggregates,
  getScoreRank,
  MemberActivity,
} from "./profile-badges";

const NOW = new Date("2026-10-02T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

const emptyCircle: CircleBadgeAggregates = {
  commandCounts: {},
  repliesReceived: {},
  topMessageHighlights: {},
  highlightsGiven: {},
};

const quietActivity: MemberActivity = {
  messages: 12,
  highlightsReceived: 0,
  repliesSent: 0,
  repliesGiven: 0,
  recentSelfHighlights: 0,
  lastMessageAt: new Date(NOW.getTime() - 2 * DAY),
  activeDaysLast30: 3,
  activeDaysTotal: 6,
  joinedAt: new Date("2026-01-01T00:00:00Z"),
  biggestFan: null,
  recentActiveDays: [],
  topicsCreated: 0,
};

function badgeKeys(
  overrides: {
    circle?: Partial<CircleBadgeAggregates>;
    activity?: Partial<MemberActivity>;
  } = {},
) {
  return computeProfileBadges({
    userId: "me",
    circleName: "Sandbox",
    circleCreatorId: "someone-else",
    score: null,
    givingTag: null,
    circle: { ...emptyCircle, ...overrides.circle },
    activity: { ...quietActivity, ...overrides.activity },
    now: NOW,
  }).map((b) => b.key);
}

describe("computeProfileBadges", () => {
  it("gives a quiet member no badges", () => {
    expect(badgeKeys()).toEqual([]);
  });

  it("puts the score rank and giving tag first", () => {
    const badges = computeProfileBadges({
      userId: "me",
      circleName: "Sandbox",
      circleCreatorId: "someone-else",
      score: { multiplier: 1.6, topPercent: 20, bottomPercent: 100, place: 2 },
      givingTag: { kind: "generous", given: 20, received: 4 },
      circle: emptyCircle,
      activity: { ...quietActivity, joinedAt: NOW },
      now: NOW,
    });

    expect(badges.map((b) => b.key)).toEqual(["score", "giving", "new-kid"]);
    expect(badges[0]).toMatchObject({
      label: "Grandmaster",
      rarity: "epic",
      tooltip: "Highlight score 160 · Top 20% in Sandbox",
    });
  });

  it("awards Record Holder for the circle's most-highlighted message", () => {
    expect(
      badgeKeys({ circle: { topMessageHighlights: { me: 9, other: 4 } } }),
    ).toContain("record-holder");
  });

  it("awards One-Hit Wonder when one message carries their highlights", () => {
    expect(
      badgeKeys({
        circle: { topMessageHighlights: { me: 6, other: 10 } },
        activity: { highlightsReceived: 8 },
      }),
    ).toContain("one-hit-wonder");
  });

  it("awards command badges to the top user, ties included", () => {
    expect(
      badgeKeys({
        circle: {
          commandCounts: { me: { roll: 7 }, other: { roll: 7, giphy: 9 } },
        },
      }),
    ).toEqual(["command-roll"]);
  });

  it("needs a minimum before awarding a command badge", () => {
    expect(
      badgeKeys({ circle: { commandCounts: { me: { roll: 2 } } } }),
    ).toEqual([]);
  });

  it("awards Conversation Starter for drawing the most replies", () => {
    expect(
      badgeKeys({ circle: { repliesReceived: { me: 12, other: 3 } } }),
    ).toContain("conversation-starter");
  });

  it("awards Regular as Clockwork, or Ghost when long silent", () => {
    expect(badgeKeys({ activity: { activeDaysLast30: 22 } })).toContain(
      "regular",
    );
    expect(
      badgeKeys({
        activity: { lastMessageAt: new Date(NOW.getTime() - 45 * DAY) },
      }),
    ).toContain("ghost");
  });

  it("awards Firehose and Reply Guy from their own activity", () => {
    expect(
      badgeKeys({ activity: { messages: 120, activeDaysTotal: 4 } }),
    ).toContain("firehose");
    expect(
      badgeKeys({ activity: { messages: 30, repliesSent: 18 } }),
    ).toContain("reply-guy");
  });

  it("calls out a recent self-highlight", () => {
    const badges = computeProfileBadges({
      userId: "me",
      circleName: "Sandbox",
      circleCreatorId: "someone-else",
      score: null,
      givingTag: null,
      circle: emptyCircle,
      activity: { ...quietActivity, recentSelfHighlights: 1 },
      now: NOW,
    });

    expect(badges).toEqual([
      {
        key: "self-highlighter",
        emoji: "🪞",
        label: "Self Highlighter",
        tooltip: "Highlighted their own message once in the last month",
        rarity: "common",
      },
    ]);
  });

  it("shows only the highest message milestone reached", () => {
    const badges = computeProfileBadges({
      userId: "me",
      circleName: "Sandbox",
      circleCreatorId: "someone-else",
      score: null,
      givingTag: null,
      circle: emptyCircle,
      activity: { ...quietActivity, messages: 1234 },
      now: NOW,
    });

    expect(badges).toContainEqual({
      key: "messages-milestone",
      emoji: "🎤",
      label: "1K Club",
      tooltip: "Sent 1,234 messages in Sandbox",
      rarity: "rare",
    });
  });

  it("shows only the highest active-days milestone reached", () => {
    expect(badgeKeys({ activity: { activeDaysTotal: 140 } })).toEqual([
      "days-milestone",
    ]);
    expect(
      computeProfileBadges({
        userId: "me",
        circleName: "Sandbox",
        circleCreatorId: "someone-else",
        score: null,
        givingTag: null,
        circle: emptyCircle,
        activity: { ...quietActivity, activeDaysTotal: 140 },
        now: NOW,
      })[0].label,
    ).toBe("Regular Fixture");
  });

  it("has no milestone under 100 messages", () => {
    expect(badgeKeys({ activity: { messages: 99 } })).toEqual([]);
  });

  it("awards a Commander rank by total commands, with a breakdown", () => {
    const [commander] = computeProfileBadges({
      userId: "me",
      circleName: "Sandbox",
      circleCreatorId: "someone-else",
      score: null,
      givingTag: null,
      circle: {
        ...emptyCircle,
        // Not the top user of any command, so no per-command "most uses" badges.
        commandCounts: {
          me: { roll: 9, giphy: 9, "8ball": 9 },
          other: { roll: 40, giphy: 40, "8ball": 40 },
        },
      },
      activity: quietActivity,
      now: NOW,
    });

    expect(commander).toMatchObject({
      key: "commander",
      label: "Commander I",
      rarity: "common",
      tooltip: "Used 27 commands in Sandbox",
      commandBreakdown: { roll: 9, giphy: 9, "8ball": 9 },
    });
    const ranks = (total: number) =>
      computeProfileBadges({
        userId: "me",
        circleName: "Sandbox",
        circleCreatorId: "someone-else",
        score: null,
        givingTag: null,
        circle: {
          ...emptyCircle,
          commandCounts: { me: { roll: total }, other: { roll: 99_999 } },
        },
        activity: quietActivity,
        now: NOW,
      }).find((b) => b.key === "commander");
    expect(ranks(24)).toBeUndefined();
    expect(ranks(149)?.label).toBe("Commander I");
    expect(ranks(150)).toMatchObject({ label: "Commander II", rarity: "rare" });
    expect(ranks(750)?.rarity).toBe("epic");
    expect(ranks(3000)?.rarity).toBe("legendary");
  });

  it("names their biggest fan by first name", () => {
    const [fan] = computeProfileBadges({
      userId: "me",
      circleName: "Sandbox",
      circleCreatorId: "someone-else",
      score: null,
      givingTag: null,
      circle: emptyCircle,
      activity: {
        ...quietActivity,
        biggestFan: { name: "Simone de Beauvoir", highlights: 5 },
      },
      now: NOW,
    });

    expect(fan.label).toBe("Biggest Fan: Simone");
  });

  it("shows every earned badge, rarest first, with no cap", () => {
    const badges = computeProfileBadges({
      userId: "me",
      circleName: "Sandbox",
      circleCreatorId: "me",
      score: { multiplier: 0.2, topPercent: 100, bottomPercent: 10, place: 10 },
      givingTag: { kind: "even", given: 10, received: 10 },
      circle: {
        commandCounts: { me: { roll: 9, giphy: 9, "8ball": 9, tim: 9 } },
        repliesReceived: { me: 10 },
        topMessageHighlights: { me: 10 },
        highlightsGiven: { me: 20 },
      },
      activity: {
        ...quietActivity,
        recentSelfHighlights: 2,
        activeDaysLast30: 25,
        joinedAt: NOW,
      },
      now: NOW,
    });

    expect(badges.length).toBeGreaterThan(5);
    const rank = { common: 0, rare: 1, epic: 2, legendary: 3 };
    const ranks = badges.map((b) => rank[b.rarity]);
    expect(ranks).toEqual([...ranks].sort((a, b) => b - a));
    expect(badges[0].rarity).toBe("legendary");
    expect(badges.map((b) => b.key)).toEqual(
      expect.arrayContaining([
        "score",
        "giving",
        "new-kid",
        "self-highlighter",
      ]),
    );
  });

  it("awards Founder to the circle's creator", () => {
    const badges = computeProfileBadges({
      userId: "me",
      circleName: "Sandbox",
      circleCreatorId: "me",
      score: null,
      givingTag: null,
      circle: emptyCircle,
      activity: quietActivity,
      now: NOW,
    });
    expect(badges[0]).toMatchObject({ key: "founder", rarity: "legendary" });
  });

  it("awards Hype Man to the top highlight giver", () => {
    expect(
      badgeKeys({ circle: { highlightsGiven: { me: 12, other: 9 } } }),
    ).toEqual(["hype-man"]);
    expect(
      badgeKeys({ circle: { highlightsGiven: { me: 8, other: 2 } } }),
    ).toEqual([]);
  });

  it("awards On a Streak with rarity by length", () => {
    const days = (n: number) =>
      Array.from({ length: n }, (_, i) =>
        new Date(NOW.getTime() - i * DAY).toISOString().slice(0, 10),
      );
    const streakBadge = (n: number) =>
      computeProfileBadges({
        userId: "me",
        circleName: "Sandbox",
        circleCreatorId: "someone-else",
        score: null,
        givingTag: null,
        circle: emptyCircle,
        activity: { ...quietActivity, recentActiveDays: days(n) },
        now: NOW,
      }).find((b) => b.key === "streak");

    expect(streakBadge(4)).toBeUndefined();
    expect(streakBadge(6)).toMatchObject({
      rarity: "common",
      tooltip: "Posted 6 days in a row",
    });
    expect(streakBadge(20)?.rarity).toBe("rare");
  });

  it("awards Topic Starter for 3+ topics", () => {
    expect(badgeKeys({ activity: { topicsCreated: 3 } })).toEqual([
      "topic-starter",
    ]);
  });
});

describe("currentStreak", () => {
  it("counts back from today, or from yesterday if they haven't posted today", () => {
    expect(currentStreak(["2026-10-02", "2026-10-01", "2026-09-30"], NOW)).toBe(
      3,
    );
    expect(currentStreak(["2026-10-01", "2026-09-30"], NOW)).toBe(2);
  });

  it("stops at the first missed day", () => {
    expect(currentStreak(["2026-10-02", "2026-10-01", "2026-09-29"], NOW)).toBe(
      2,
    );
    expect(currentStreak(["2026-09-29"], NOW)).toBe(0);
  });
});

describe("getScoreRank", () => {
  it("ranks by standing in the circle", () => {
    expect(getScoreRank({ topPercent: 4, place: 1 }).label).toBe("Top 500");
    expect(getScoreRank({ topPercent: 45, place: 5 }).label).toBe("Platinum");
    expect(getScoreRank({ topPercent: 100, place: 9 }).label).toBe(
      "In Placements",
    );
  });

  it("never ranks first place below Grandmaster, even in a small circle", () => {
    // Tied for first of 3: "top 33%" would otherwise be Master.
    expect(getScoreRank({ topPercent: 33, place: 1 })).toMatchObject({
      label: "Grandmaster",
      rarity: "epic",
    });
  });
});
