import { CommandName } from "@tim/commands";
import type { GivingTag, HighlightScore } from "@/lib/highlight-score";

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
  "record-holder": "legendary",
  "one-hit-wonder": "epic",
  "conversation-starter": "epic",
  regular: "rare",
  ghost: "common",
  firehose: "rare",
  "reply-guy": "common",
  "new-kid": "common",
  "biggest-fan": "rare",
  founder: "legendary",
  "hype-man": "epic",
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

// Circle-wide numbers, so "top in the circle" badges can compare members.
export type CircleBadgeAggregates = {
  // userId -> command -> uses
  commandCounts: Record<string, Partial<Record<CommandName, number>>>;
  // userId -> replies from others to their messages
  repliesReceived: Record<string, number>;
  // userId -> highlights (from others) on their single most-highlighted message
  topMessageHighlights: Record<string, number>;
  // userId -> highlights given to others' messages
  highlightsGiven: Record<string, number>;
};

// The profile owner's own activity in the circle.
export type MemberActivity = {
  messages: number;
  highlightsReceived: number;
  repliesSent: number;
  // Replies to other people's messages.
  repliesGiven: number;
  // Highlights on their own messages in the last 30 days.
  recentSelfHighlights: number;
  lastMessageAt: Date | null;
  activeDaysLast30: number;
  activeDaysTotal: number;
  joinedAt: Date;
  biggestFan: { name: string; highlights: number } | null;
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

// The profile's stat values, each with an always-on badge whose rarity climbs with the number.
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
  // Lowest first; the first tier starts at 0 so the badge always shows.
  tiers: [Milestone, Milestone, Milestone, Milestone];
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
      tier(0, "💬", "Chatter", "common"),
      tier(1_000, "🎤", "1K Club", "rare"),
      tier(5_000, "🏛️", "5K Club", "epic"),
      tier(10_000, "🌌", "10K Club", "legendary"),
    ],
  },
  {
    stat: "activeDays",
    tooltip: (n, c) => `Posted on ${n} different days in ${c}`,
    tiers: [
      tier(0, "🌱", "Sprout", "common"),
      tier(30, "🪴", "Putting Down Roots", "rare"),
      tier(100, "🧱", "Regular Fixture", "epic"),
      tier(365, "🦕", "Ancient One", "legendary"),
    ],
  },
  {
    stat: "highlightsReceived",
    tooltip: (n, c) => `Received ${n} highlights in ${c}`,
    tiers: [
      tier(0, "✨", "Spark", "common"),
      tier(50, "🌟", "Rising Star", "rare"),
      tier(250, "💫", "Fan Favorite", "epic"),
      tier(1_000, "🌠", "Superstar", "legendary"),
    ],
  },
  {
    stat: "highlightsGiven",
    tooltip: (n, c) => `Gave ${n} highlights in ${c}`,
    tiers: [
      tier(0, "👏", "Applauder", "common"),
      tier(50, "🙌", "Cheerleader", "rare"),
      tier(250, "🎉", "Hype Squad", "epic"),
      tier(1_000, "😇", "Patron Saint", "legendary"),
    ],
  },
  {
    stat: "repliesReceived",
    tooltip: (n, c) => `Got ${n} replies in ${c}`,
    tiers: [
      tier(0, "💭", "Murmur", "common"),
      tier(25, "🗨️", "Discussion Piece", "rare"),
      tier(100, "🔥", "Hot Topic", "epic"),
      tier(500, "🌋", "Thread Magnet", "legendary"),
    ],
  },
  {
    stat: "repliesGiven",
    tooltip: (n, c) => `Sent ${n} replies in ${c}`,
    tiers: [
      tier(0, "↩️", "Chimes In", "common"),
      tier(50, "💬", "Conversationalist", "rare"),
      tier(200, "🎙️", "Debate Club", "epic"),
      tier(1_000, "📻", "Talk Show Host", "legendary"),
    ],
  },
  {
    stat: "mentionsReceived",
    tooltip: (n, c) => `@mentioned ${n} times in ${c}`,
    tiers: [
      tier(0, "📇", "On the List", "common"),
      tier(25, "📣", "In Demand", "rare"),
      tier(100, "🔔", "Most Wanted", "epic"),
      tier(500, "📢", "Household Name", "legendary"),
    ],
  },
  {
    stat: "mentionsSent",
    tooltip: (n, c) => `@mentioned others ${n} times in ${c}`,
    tiers: [
      tier(0, "☎️", "Caller", "common"),
      tier(25, "📞", "Connector", "rare"),
      tier(100, "🕸️", "Networker", "epic"),
      tier(500, "🦋", "Social Butterfly", "legendary"),
    ],
  },
];

const GIVING_TAGS = {
  generous: { emoji: "🎁", label: "Generous" },
  even: { emoji: "🤝", label: "Even" },
  greedy: { emoji: "🐉", label: "Greedy" },
} as const;

// Highlight score rank, by standing in the circle: smoothing compresses multipliers toward the
// average, so even the circle's best can sit near 1x. Overwatch-style ranks; first place never ranks below Grandmaster.
export function getScoreRank(
  score: Pick<HighlightScore, "topPercent" | "place">,
): {
  emoji: string;
  label: string;
  rarity: BadgeRarity;
} {
  const top = score.topPercent;
  if (top <= 5) return { emoji: "🏆", label: "Top 500", rarity: "legendary" };
  if (top <= 10) return { emoji: "👑", label: "Champion", rarity: "legendary" };
  if (top <= 20 || score.place === 1)
    return { emoji: "🔱", label: "Grandmaster", rarity: "epic" };
  if (top <= 30) return { emoji: "💠", label: "Master", rarity: "epic" };
  if (top <= 40) return { emoji: "💎", label: "Diamond", rarity: "rare" };
  if (top <= 50) return { emoji: "🔷", label: "Platinum", rarity: "rare" };
  if (top <= 60) return { emoji: "🥇", label: "Gold", rarity: "common" };
  if (top <= 75) return { emoji: "🥈", label: "Silver", rarity: "common" };
  if (top <= 90) return { emoji: "🥉", label: "Bronze", rarity: "common" };
  return { emoji: "❔", label: "In Placements", rarity: "common" };
}

// Ties share the top spot.
function isTop(byUser: Record<string, number>, userId: string, min: number) {
  const mine = byUser[userId] ?? 0;
  if (mine < min) return false;
  return Object.values(byUser).every((n) => n <= mine);
}

export function computeProfileBadges(args: {
  userId: string;
  circleName: string;
  circleCreatorId: string;
  score: HighlightScore | null;
  givingTag: GivingTag | null;
  circle: CircleBadgeAggregates;
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
    circle,
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
    const rank =
      score.topPercent <= 50
        ? `Top ${score.topPercent}%`
        : `Bottom ${score.bottomPercent}%`;
    add({
      key: "score",
      ...getScoreRank(score),
      tooltip: `Highlight score ${Math.round(score.multiplier * 100)} · ${rank} in ${circleName}`,
    });
  }

  if (givingTag) {
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

  if (isTop(circle.highlightsGiven, userId, 10)) {
    add({
      key: "hype-man",
      emoji: "📣",
      label: "Hype Man",
      tooltip: `Gives the most highlights in ${circleName} (${circle.highlightsGiven[userId]})`,
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

  const topMessage = circle.topMessageHighlights[userId] ?? 0;
  if (isTop(circle.topMessageHighlights, userId, 3)) {
    add({
      key: "record-holder",
      emoji: "🏅",
      label: "Record Holder",
      tooltip: `Has the most-highlighted message in ${circleName} (${topMessage} highlights)`,
    });
  } else if (
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

  if (isTop(circle.repliesReceived, userId, 5)) {
    add({
      key: "conversation-starter",
      emoji: "🧵",
      label: "Conversation Starter",
      tooltip: `Their messages draw the most replies in ${circleName}`,
    });
  }

  for (const [command, badge] of Object.entries(COMMAND_BADGES)) {
    const byUser = Object.fromEntries(
      Object.entries(circle.commandCounts).map(([id, counts]) => [
        id,
        counts[command as CommandName] ?? 0,
      ]),
    );
    if (badge && isTop(byUser, userId, 5)) {
      add({
        key: `command-${command}`,
        emoji: badge.emoji,
        label: badge.label,
        tooltip: `Most ${badge.noun} uses in ${circleName} (${byUser[userId]})`,
      });
    }
  }

  const myCommands = circle.commandCounts[userId] ?? {};
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
    const reached = [...ladder.tiers].reverse().find((t) => value >= t.min)!;
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

  if (activity.activeDaysLast30 >= 20) {
    add({
      key: "regular",
      emoji: "📅",
      label: "Regular as Clockwork",
      tooltip: `Posted on ${activity.activeDaysLast30} of the last 30 days`,
    });
  } else if (sinceLastMessage !== null && sinceLastMessage > 30 * DAY_MS) {
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

  if (
    activity.repliesSent >= 15 &&
    activity.repliesSent >= activity.messages - activity.repliesSent
  ) {
    add({
      key: "reply-guy",
      emoji: "🗣️",
      label: "Reply Guy",
      tooltip: `${activity.repliesSent} of their ${activity.messages} messages are replies`,
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

  if (now.getTime() - new Date(activity.joinedAt).getTime() < 14 * DAY_MS) {
    add({
      key: "new-kid",
      emoji: "🆕",
      label: "New Kid",
      tooltip: "Joined in the last two weeks",
    });
  }

  if (activity.biggestFan && activity.biggestFan.highlights >= 3) {
    const firstName = activity.biggestFan.name.split(" ")[0];
    add({
      key: "biggest-fan",
      emoji: "💞",
      label: `Biggest Fan: ${firstName}`,
      tooltip: `${activity.biggestFan.name} has highlighted ${activity.biggestFan.highlights} of their messages`,
    });
  }

  // Rarest first; no cap, every earned badge shows.
  // Array.prototype.sort is stable, so equal rarities keep their priority order.
  return badges.sort((a, b) => RARITY_RANK[b.rarity] - RARITY_RANK[a.rarity]);
}
