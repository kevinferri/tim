import { describe, it, expect } from "vitest";
import {
  computeProfileBadges,
  type ProfileStats,
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
  recentActiveDays: [],
  topicsCreated: 0,
};

const zeroStats: ProfileStats = {
  messages: 0,
  activeDays: 0,
  highlightsReceived: 0,
  highlightsGiven: 0,
  repliesReceived: 0,
  repliesGiven: 0,
  mentionsReceived: 0,
  mentionsSent: 0,
};

const evenTag = { kind: "even" as const, given: 0, received: 0 };

// Stat badges and the giving tag always show; tests about other badges filter them out
// (the giving tag only when the test doesn't pass its own).
function badgesFor(
  args: Omit<
    Parameters<typeof computeProfileBadges>[0],
    "stats" | "givingTag"
  > & {
    givingTag?: Parameters<typeof computeProfileBadges>[0]["givingTag"];
  },
) {
  return computeProfileBadges({
    ...args,
    givingTag: args.givingTag ?? evenTag,
    stats: zeroStats,
  }).filter(
    (b) => !b.key.startsWith("stat-") && (args.givingTag || b.key !== "giving"),
  );
}

function badgeKeys(
  overrides: {
    circle?: Partial<CircleBadgeAggregates>;
    activity?: Partial<MemberActivity>;
  } = {},
) {
  return badgesFor({
    userId: "me",
    circleName: "Sandbox",
    circleCreatorId: "someone-else",
    score: null,
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
    const badges = badgesFor({
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
    const badges = badgesFor({
      userId: "me",
      circleName: "Sandbox",
      circleCreatorId: "someone-else",
      score: null,
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

  it("awards a Commander rank by total commands, with a breakdown", () => {
    const [commander] = badgesFor({
      userId: "me",
      circleName: "Sandbox",
      circleCreatorId: "someone-else",
      score: null,
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
      badgesFor({
        userId: "me",
        circleName: "Sandbox",
        circleCreatorId: "someone-else",
        score: null,
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

  it("shows every earned badge, rarest first, with no cap", () => {
    const badges = badgesFor({
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
    const badges = badgesFor({
      userId: "me",
      circleName: "Sandbox",
      circleCreatorId: "me",
      score: null,
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
      badgesFor({
        userId: "me",
        circleName: "Sandbox",
        circleCreatorId: "someone-else",
        score: null,
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

describe("stat badges", () => {
  const statBadges = (stats: Partial<ProfileStats>) =>
    computeProfileBadges({
      userId: "me",
      circleName: "Sandbox",
      circleCreatorId: "someone-else",
      score: null,
      givingTag: evenTag,
      circle: emptyCircle,
      activity: quietActivity,
      stats: { ...zeroStats, ...stats },
      now: NOW,
    }).filter((b) => b.key.startsWith("stat-"));

  it("always shows one badge per stat, common at zero", () => {
    const badges = statBadges({});
    expect(badges).toHaveLength(8);
    expect(badges.every((b) => b.rarity === "common")).toBe(true);
  });

  it("raises each stat's rarity with its count", () => {
    const byKey = Object.fromEntries(
      statBadges({
        messages: 1_234,
        highlightsReceived: 300,
        highlightsGiven: 1_000,
        mentionsReceived: 30,
      }).map((b) => [b.key, b]),
    );

    expect(byKey["stat-messages"]).toMatchObject({
      label: "1K Club",
      rarity: "rare",
      tooltip: "Sent 1,234 messages in Sandbox",
    });
    expect(byKey["stat-highlightsReceived"]).toMatchObject({
      label: "Fan Favorite",
      rarity: "epic",
    });
    expect(byKey["stat-highlightsGiven"]).toMatchObject({
      label: "Patron Saint",
      rarity: "legendary",
    });
    expect(byKey["stat-mentionsReceived"].rarity).toBe("rare");
    expect(byKey["stat-repliesGiven"]).toMatchObject({
      label: "Chimes In",
      rarity: "common",
    });
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
