import { describe, it, expect } from "vitest";
import {
  computeProfileBadges,
  type ProfileStats,
  currentStreak,
  getScoreRank,
  MemberActivity,
} from "./profile-badges";

const NOW = new Date("2026-10-02T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

const quietActivity: MemberActivity = {
  messages: 12,
  highlightsReceived: 0,
  highlightsGiven: 0,
  topMessageHighlights: 0,
  repliesReceived: 0,
  commandCounts: {},
  repliesGiven: 0,
  recentSelfHighlights: 0,
  lastMessageAt: new Date(NOW.getTime() - 2 * DAY),
  activeDaysTotal: 6,
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

// Tests about other badges filter out the stat badges (and default to an even, hidden, giving tag).
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
  }).filter((b) => !b.key.startsWith("stat-"));
}

function badgeKeys(
  overrides: {
    activity?: Partial<MemberActivity>;
  } = {},
) {
  return badgesFor({
    userId: "me",
    circleName: "Sandbox",
    circleCreatorId: "someone-else",
    score: null,
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
      score: { value: 230, placed: true },
      givingTag: { kind: "generous", given: 20, received: 4 },
      activity: quietActivity,
      now: NOW,
    });

    expect(badges.map((b) => b.key)).toEqual(["score", "giving"]);
    expect(badges[0]).toMatchObject({
      label: "Grandmaster",
      rarity: "epic",
      tooltip: "Highlight score 230 in Sandbox",
    });
  });

  it("awards One-Hit Wonder when one message carries their highlights", () => {
    expect(
      badgeKeys({
        activity: { topMessageHighlights: 6, highlightsReceived: 8 },
      }),
    ).toContain("one-hit-wonder");
  });

  it("awards a command badge at 50 uses of that command", () => {
    const keys = badgeKeys({
      activity: { commandCounts: { roll: 50, giphy: 49 } },
    });
    expect(keys).toContain("command-roll");
    expect(keys).not.toContain("command-giphy");
  });

  it("awards Ghost when long silent", () => {
    expect(
      badgeKeys({
        activity: { lastMessageAt: new Date(NOW.getTime() - 45 * DAY) },
      }),
    ).toContain("ghost");
  });

  it("awards Firehose for lots of messages per active day", () => {
    expect(
      badgeKeys({ activity: { messages: 120, activeDaysTotal: 4 } }),
    ).toContain("firehose");
  });

  it("calls out a recent self-highlight", () => {
    const badges = badgesFor({
      userId: "me",
      circleName: "Sandbox",
      circleCreatorId: "someone-else",
      score: null,
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
      activity: {
        ...quietActivity,
        commandCounts: { roll: 9, giphy: 9, "8ball": 9 },
      },
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
        activity: { ...quietActivity, commandCounts: { roll: total } },
        now: NOW,
      }).find((b) => b.key === "commander");
    expect(ranks(24)).toBeUndefined();
    expect(ranks(149)?.label).toBe("Commander I");
    expect(ranks(150)).toMatchObject({ label: "Commander II", rarity: "rare" });
    expect(ranks(750)?.rarity).toBe("epic");
    expect(ranks(3000)?.rarity).toBe("legendary");
  });

  it("leads with the score rank, even when it's common", () => {
    const badges = badgesFor({
      userId: "me",
      circleName: "Sandbox",
      circleCreatorId: "me",
      score: { value: 25, placed: true },
      activity: quietActivity,
      now: NOW,
    });

    expect(badges.map((b) => b.key)).toEqual(["score", "founder"]);
    expect(badges[0]).toMatchObject({ label: "Silver", rarity: "common" });
  });

  it("shows every earned badge, score first then rarest first, with no cap", () => {
    const badges = badgesFor({
      userId: "me",
      circleName: "Sandbox",
      circleCreatorId: "me",
      score: { value: 5, placed: true },
      givingTag: { kind: "generous", given: 30, received: 10 },
      activity: {
        ...quietActivity,
        commandCounts: { roll: 60, giphy: 9, "8ball": 9, tim: 9 },
        recentSelfHighlights: 2,
      },
      now: NOW,
    });

    expect(badges.length).toBeGreaterThan(5);
    const rank = { common: 0, rare: 1, epic: 2, legendary: 3 };
    // Score rank leads; everything after it is rarest first.
    expect(badges[0].key).toBe("score");
    const ranks = badges.slice(1).map((b) => rank[b.rarity]);
    expect(ranks).toEqual([...ranks].sort((a, b) => b - a));
    expect(badges[1].rarity).toBe("legendary");
    expect(badges.map((b) => b.key)).toEqual(
      expect.arrayContaining(["score", "giving", "self-highlighter"]),
    );
  });

  it("awards Founder to the circle's creator", () => {
    const badges = badgesFor({
      userId: "me",
      circleName: "Sandbox",
      circleCreatorId: "me",
      score: null,
      activity: quietActivity,
      now: NOW,
    });
    expect(badges[0]).toMatchObject({ key: "founder", rarity: "legendary" });
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
      activity: quietActivity,
      stats: { ...zeroStats, ...stats },
      now: NOW,
    }).filter((b) => b.key.startsWith("stat-"));

  it("shows no stat badge before its first milestone", () => {
    expect(statBadges({ messages: 999, highlightsGiven: 49 })).toEqual([]);
  });

  it("raises each stat's rarity with its count", () => {
    const byKey = Object.fromEntries(
      statBadges({
        messages: 1_234,
        highlightsReceived: 300,
        highlightsGiven: 1_000,
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
    expect(byKey["stat-activeDays"]).toBeUndefined();
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
  it("ranks by highlights per 100 messages", () => {
    const rank = (value: number) => getScoreRank({ value, placed: true });
    expect(rank(0)).toMatchObject({ label: "Bronze", rarity: "common" });
    expect(rank(40).label).toBe("Gold");
    expect(rank(110)).toMatchObject({ label: "Diamond", rarity: "rare" });
    expect(rank(300)).toMatchObject({ label: "Champion", rarity: "legendary" });
    expect(rank(1000).label).toBe("Top 500");
  });

  it("stays In Placements until enough messages, whatever the score", () => {
    expect(getScoreRank({ value: 500, placed: false }).label).toBe(
      "In Placements",
    );
  });
});
