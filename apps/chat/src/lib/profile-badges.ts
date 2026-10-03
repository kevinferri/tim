import { CommandName } from "@tim/commands";
import {
  PLACEMENT_MESSAGES,
  type GivingTag,
  type HighlightScore,
} from "@/lib/highlight-score";

export type BadgeRarity = "common" | "rare" | "epic" | "legendary";

export type ProfileBadge = {
  key: string;
  emoji: string;
  label: string;
  tooltip: string;
  rarity: BadgeRarity;
  // Per-command uses, listed under the tooltip text (Commander only).
  commandBreakdown?: Partial<Record<CommandName, number>>;
};

const RARITY_RANK: Record<BadgeRarity, number> = {
  common: 0,
  rare: 1,
  epic: 2,
  legendary: 3,
};

// By how hard each badge is to earn; tiered badges set their own per tier.
const BADGE_RARITY: Record<string, BadgeRarity> = {
  giving: "common",
  "self-highlighter": "common",
  "one-hit-wonder": "epic",
  ghost: "common",
  firehose: "rare",
  founder: "legendary",
  "topic-starter": "rare",
};

// Rarity by current streak length in days, highest first.
const STREAK_TIERS: { min: number; rarity: BadgeRarity }[] = [
  { min: 30, rarity: "epic" },
  { min: 14, rarity: "rare" },
  { min: 5, rarity: "common" },
];

// Consecutive UTC days posted, ending today or (if not yet today) yesterday.
export function currentStreak(recentActiveDays: string[], now: Date) {
  const days = new Set(recentActiveDays);
  const dayKey = (offset: number) =>
    new Date(now.getTime() - offset * DAY_MS).toISOString().slice(0, 10);

  let offset = days.has(dayKey(0)) ? 0 : 1;
  let streak = 0;
  while (days.has(dayKey(offset))) {
    streak++;
    offset++;
  }
  return streak;
}

// The profile owner's own activity in the circle.
export type MemberActivity = {
  messages: number;
  // From others only.
  highlightsReceived: number;
  // To others' messages only.
  highlightsGiven: number;
  // From others, on their single most-highlighted message.
  topMessageHighlights: number;
  // Replies from others to their messages.
  repliesReceived: number;
  commandCounts: Partial<Record<CommandName, number>>;
  // Replies to other people's messages.
  repliesGiven: number;
  // Highlights on their own messages in the last 30 days.
  recentSelfHighlights: number;
  lastMessageAt: Date | null;
  activeDaysTotal: number;
  // Distinct UTC days they posted, newest first ("2026-10-02"); recent ones only, for streaks.
  recentActiveDays: string[];
  topicsCreated: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const COMMAND_BADGES: Partial<
  Record<CommandName, { emoji: string; label: string; noun: string }>
> = {
  [CommandName.Roll]: { emoji: "🎰", label: "High Roller", noun: "/roll" },
  [CommandName.EightBall]: { emoji: "🔮", label: "Oracle", noun: "/8ball" },
  [CommandName.Giphy]: { emoji: "🎞️", label: "Gif Lord", noun: "/giphy" },
  [CommandName.Tim]: { emoji: "🤖", label: "Tim's Bestie", noun: "/tim" },
};

// Uses of one command for its badge.
const COMMAND_BADGE_MIN = 50;

// Rank by total commands used in the circle, highest first.
const COMMANDER_TIERS: Milestone[] = [
  { min: 3_000, emoji: "🎖️", label: "Commander IV", rarity: "legendary" },
  { min: 750, emoji: "🎖️", label: "Commander III", rarity: "epic" },
  { min: 150, emoji: "🎖️", label: "Commander II", rarity: "rare" },
  { min: 25, emoji: "🎖️", label: "Commander I", rarity: "common" },
];

type Milestone = {
  min: number;
  emoji: string;
  label: string;
  rarity: BadgeRarity;
};

// The profile's stat values; the ones in STAT_LADDERS earn a badge at each milestone, rarer as the number climbs.
export type ProfileStats = {
  messages: number;
  activeDays: number;
  highlightsReceived: number;
  highlightsGiven: number;
  repliesReceived: number;
  repliesGiven: number;
  mentionsReceived: number;
  mentionsSent: number;
};

type StatLadder = {
  stat: keyof ProfileStats;
  tooltip: (n: string, circleName: string) => string;
  // Lowest first. Below the first milestone there's no badge: the stat row already shows the number.
  tiers: [Milestone, Milestone, Milestone];
};

const tier = (
  min: number,
  emoji: string,
  label: string,
  rarity: BadgeRarity,
): Milestone => ({ min, emoji, label, rarity });

const STAT_LADDERS: StatLadder[] = [
  {
    stat: "messages",
    tooltip: (n, c) => `Sent ${n} messages in ${c}`,
    tiers: [
      tier(1_000, "🎤", "1K Club", "rare"),
      tier(5_000, "🏛️", "5K Club", "epic"),
      tier(10_000, "🌌", "10K Club", "legendary"),
    ],
  },
  {
    stat: "activeDays",
    tooltip: (n, c) => `Posted on ${n} different days in ${c}`,
    tiers: [
      tier(30, "🪴", "Putting Down Roots", "rare"),
      tier(100, "🧱", "Regular Fixture", "epic"),
      tier(365, "🦕", "Ancient One", "legendary"),
    ],
  },
  {
    stat: "highlightsReceived",
    tooltip: (n, c) => `Received ${n} highlights in ${c}`,
    tiers: [
      tier(50, "🌟", "Rising Star", "rare"),
      tier(250, "💫", "Fan Favorite", "epic"),
      tier(1_000, "🌠", "Superstar", "legendary"),
    ],
  },
  {
    stat: "highlightsGiven",
    tooltip: (n, c) => `Gave ${n} highlights in ${c}`,
    tiers: [
      tier(50, "🙌", "Cheerleader", "rare"),
      tier(250, "🎉", "Hype Squad", "epic"),
      tier(1_000, "😇", "Patron Saint", "legendary"),
    ],
  },
];

const GIVING_TAGS = {
  generous: { emoji: "🎁", label: "Generous" },
  greedy: { emoji: "🐉", label: "Greedy" },
} as const;

// Overwatch-style rank by highlight score (highlights from others per 100 messages). Absolute
// rather than relative to the circle, which would mean scanning every member.
const SCORE_RANKS: Milestone[] = [
  { min: 400, emoji: "🏆", label: "Top 500", rarity: "legendary" },
  { min: 300, emoji: "👑", label: "Champion", rarity: "legendary" },
  { min: 220, emoji: "🔱", label: "Grandmaster", rarity: "epic" },
  { min: 160, emoji: "💠", label: "Master", rarity: "epic" },
  { min: 110, emoji: "💎", label: "Diamond", rarity: "rare" },
  { min: 70, emoji: "🔷", label: "Platinum", rarity: "rare" },
  { min: 40, emoji: "🥇", label: "Gold", rarity: "common" },
  { min: 20, emoji: "🥈", label: "Silver", rarity: "common" },
  { min: 0, emoji: "🥉", label: "Bronze", rarity: "common" },
];

export function getScoreRank(score: HighlightScore): {
  emoji: string;
  label: string;
  rarity: BadgeRarity;
} {
  if (!score.placed) {
    return { emoji: "❔", label: "In Placements", rarity: "common" };
  }
  const { emoji, label, rarity } = SCORE_RANKS.find(
    (r) => score.value >= r.min,
  )!;
  return { emoji, label, rarity };
}

export function computeProfileBadges(args: {
  userId: string;
  circleName: string;
  circleCreatorId: string;
  score: HighlightScore | null;
  givingTag: GivingTag;
  activity: MemberActivity;
  stats: ProfileStats;
  now: Date;
}): ProfileBadge[] {
  const {
    userId,
    circleName,
    circleCreatorId,
    score,
    givingTag,
    activity,
    stats,
    now,
  } = args;
  const badges: ProfileBadge[] = [];
  const add = (
    badge: Omit<ProfileBadge, "rarity"> & { rarity?: BadgeRarity },
  ) =>
    badges.push({
      ...badge,
      rarity:
        badge.rarity ??
        BADGE_RARITY[badge.key] ??
        (badge.key.startsWith("command-") ? "rare" : "common"),
    });

  if (score) {
    add({
      key: "score",
      ...getScoreRank(score),
      tooltip: score.placed
        ? `Highlight score ${score.value} in ${circleName}`
        : `Highlight score ${score.value} in ${circleName}, ranked after ${PLACEMENT_MESSAGES} messages`,
    });
  }

  // Even is the default and says nothing about them.
  if (givingTag.kind !== "even") {
    add({
      key: "giving",
      ...GIVING_TAGS[givingTag.kind],
      tooltip: `Gave ${givingTag.given}, got ${givingTag.received} highlights in ${circleName}`,
    });
  }

  if (userId === circleCreatorId) {
    add({
      key: "founder",
      emoji: "🏗️",
      label: "Founder",
      tooltip: `Created ${circleName}`,
    });
  }

  if (activity.recentSelfHighlights > 0) {
    const times = activity.recentSelfHighlights;
    add({
      key: "self-highlighter",
      emoji: "🪞",
      label: "Self Highlighter",
      tooltip: `Highlighted their own ${times === 1 ? "message" : "messages"} ${times === 1 ? "once" : `${times} times`} in the last month`,
    });
  }

  const topMessage = activity.topMessageHighlights;
  if (
    topMessage >= 5 &&
    activity.messages >= 10 &&
    topMessage >= activity.highlightsReceived / 2
  ) {
    add({
      key: "one-hit-wonder",
      emoji: "💯",
      label: "One-Hit Wonder",
      tooltip: `One message got ${topMessage} of their ${activity.highlightsReceived} highlights`,
    });
  }

  for (const [command, badge] of Object.entries(COMMAND_BADGES)) {
    const uses = activity.commandCounts[command as CommandName] ?? 0;
    if (badge && uses >= COMMAND_BADGE_MIN) {
      add({
        key: `command-${command}`,
        emoji: badge.emoji,
        label: badge.label,
        tooltip: `Used ${badge.noun} ${uses.toLocaleString("en-US")} times in ${circleName}`,
      });
    }
  }

  const myCommands = activity.commandCounts;
  const totalCommands = Object.values(myCommands).reduce(
    (sum, n) => sum + (n ?? 0),
    0,
  );
  const commanderTier = COMMANDER_TIERS.find((t) => totalCommands >= t.min);
  if (commanderTier) {
    add({
      key: "commander",
      emoji: commanderTier.emoji,
      label: commanderTier.label,
      rarity: commanderTier.rarity,
      tooltip: `Used ${totalCommands.toLocaleString("en-US")} commands in ${circleName}`,
      commandBreakdown: myCommands,
    });
  }

  for (const ladder of STAT_LADDERS) {
    const value = stats[ladder.stat];
    const reached = [...ladder.tiers].reverse().find((t) => value >= t.min);
    if (!reached) continue;
    add({
      key: `stat-${ladder.stat}`,
      emoji: reached.emoji,
      label: reached.label,
      rarity: reached.rarity,
      tooltip: ladder.tooltip(value.toLocaleString("en-US"), circleName),
    });
  }

  const sinceLastMessage = activity.lastMessageAt
    ? now.getTime() - new Date(activity.lastMessageAt).getTime()
    : null;

  if (sinceLastMessage !== null && sinceLastMessage > 30 * DAY_MS) {
    add({
      key: "ghost",
      emoji: "👻",
      label: "Ghost",
      tooltip: `Hasn't posted in ${circleName} for ${Math.floor(sinceLastMessage / DAY_MS)} days`,
    });
  }

  const perActiveDay = activity.activeDaysTotal
    ? activity.messages / activity.activeDaysTotal
    : 0;
  if (activity.activeDaysTotal >= 3 && perActiveDay >= 25) {
    add({
      key: "firehose",
      emoji: "🌊",
      label: "Firehose",
      tooltip: `Sends about ${Math.round(perActiveDay)} messages on days they post`,
    });
  }

  const streak = currentStreak(activity.recentActiveDays, now);
  const streakTier = STREAK_TIERS.find((t) => streak >= t.min);
  if (streakTier) {
    add({
      key: "streak",
      emoji: "🔥",
      label: "On a Streak",
      rarity: streakTier.rarity,
      tooltip: `Posted ${streak} days in a row`,
    });
  }

  if (activity.topicsCreated >= 3) {
    add({
      key: "topic-starter",
      emoji: "🗂️",
      label: "Topic Starter",
      tooltip: `Created ${activity.topicsCreated} topics in ${circleName}`,
    });
  }

  // The score rank leads as the headline badge; the rest go rarest first, uncapped.
  // Array.prototype.sort is stable, so equal rarities keep their priority order.
  const rank = (b: ProfileBadge) =>
    b.key === "score" ? Infinity : RARITY_RANK[b.rarity];
  return badges.sort((a, b) => rank(b) - rank(a));
}
