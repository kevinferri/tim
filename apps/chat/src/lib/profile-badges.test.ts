import { describe, it, expect } from "vitest";
import {
  computeProfileBadges,
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
};

const quietActivity: MemberActivity = {
  messages: 12,
  highlightsReceived: 0,
  repliesSent: 0,
  recentSelfHighlights: 0,
  lastMessageAt: new Date(NOW.getTime() - 2 * DAY),
  activeDaysLast30: 3,
  activeDaysTotal: 6,
  joinedAt: new Date("2026-01-01T00:00:00Z"),
  biggestFan: null,
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
      score: { multiplier: 1.6, topPercent: 20, bottomPercent: 100 },
      givingTag: { kind: "generous", given: 20, received: 4 },
      circle: emptyCircle,
      activity: { ...quietActivity, joinedAt: NOW },
      now: NOW,
    });

    expect(badges.map((b) => b.key)).toEqual(["score", "giving", "new-kid"]);
    expect(badges[0]).toMatchObject({
      label: "Crowd Favorite",
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
      score: null,
      givingTag: null,
      circle: {
        ...emptyCircle,
        // Under the 5-use minimum for the per-command "most uses" badges.
        commandCounts: {
          me: { roll: 4, giphy: 4, "8ball": 4 },
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
      tooltip: "Used 12 commands in Sandbox",
      commandBreakdown: { roll: 4, giphy: 4, "8ball": 4 },
    });
    expect(
      badgeKeys({
        circle: {
          commandCounts: {
            me: { roll: 40, tim: 20 },
            other: { roll: 99, tim: 99 },
          },
        },
      }),
    ).toEqual(["commander"]);
  });

  it("names their biggest fan by first name", () => {
    const [fan] = computeProfileBadges({
      userId: "me",
      circleName: "Sandbox",
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

  it("sorts rarest first so the cap drops common badges", () => {
    const badges = computeProfileBadges({
      userId: "me",
      circleName: "Sandbox",
      score: { multiplier: 0.2, topPercent: 100, bottomPercent: 10 },
      givingTag: { kind: "even", given: 10, received: 10 },
      circle: {
        commandCounts: { me: { roll: 9 } },
        repliesReceived: { me: 10 },
        topMessageHighlights: { me: 10 },
      },
      activity: {
        ...quietActivity,
        recentSelfHighlights: 2,
        joinedAt: NOW,
      },
      now: NOW,
    });

    expect(badges.map((b) => b.key)).toEqual([
      "record-holder",
      "conversation-starter",
      "command-roll",
      "score",
      "giving",
    ]);
  });

  it("caps the row at five badges", () => {
    const badges = computeProfileBadges({
      userId: "me",
      circleName: "Sandbox",
      score: { multiplier: 2, topPercent: 10, bottomPercent: 100 },
      givingTag: { kind: "even", given: 10, received: 10 },
      circle: {
        commandCounts: { me: { roll: 9, "8ball": 9, giphy: 9, tim: 9 } },
        repliesReceived: { me: 10 },
        topMessageHighlights: { me: 10 },
      },
      activity: { ...quietActivity, activeDaysLast30: 25, joinedAt: NOW },
      now: NOW,
    });

    expect(badges).toHaveLength(5);
  });
});

describe("getScoreRank", () => {
  it("maps multipliers to ranks", () => {
    expect(getScoreRank(5.2).label).toBe("Mythic");
    expect(getScoreRank(1).label).toBe("Regular");
    expect(getScoreRank(0.2).label).toBe("Wallflower");
  });
});
