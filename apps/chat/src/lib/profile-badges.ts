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

// Highest first; only the top tier reached is shown.
const MESSAGE_MILESTONES: Milestone[] = [
  { min: 10_000, emoji: "🌌", label: "10K Club", rarity: "legendary" },
  { min: 5_000, emoji: "🏛️", label: "5K Club", rarity: "epic" },
  { min: 1_000, emoji: "🎤", label: "1K Club", rarity: "rare" },
  { min: 500, emoji: "💬", label: "500 Club", rarity: "common" },
  { min: 100, emoji: "🐣", label: "100 Club", rarity: "common" },
];

const ACTIVE_DAY_MILESTONES: Milestone[] = [
  { min: 365, emoji: "🦕", label: "Ancient One", rarity: "legendary" },
  { min: 100, emoji: "🧱", label: "Regular Fixture", rarity: "rare" },
  { min: 30, emoji: "🪴", label: "Putting Down Roots", rarity: "common" },
];

const GIVING_TAGS = {
  generous: { emoji: "🎁", label: "Generous" },
  even: { emoji: "🤝", label: "Even" },
  greedy: { emoji: "🐉", label: "Greedy" },
} as const;

// Highlight score rank, by highlights-per-message relative to the circle average (1 = average).
export function getScoreRank(multiplier: number): {
  emoji: string;
  label: string;
  rarity: BadgeRarity;
} {
  if (multiplier >= 5)
    return { emoji: "🦄", label: "Mythic", rarity: "legendary" };
  if (multiplier >= 4)
    return { emoji: "👑", label: "Legend", rarity: "legendary" };
  if (multiplier >= 3) return { emoji: "💎", label: "Icon", rarity: "epic" };
  if (multiplier >= 2.5)
    return { emoji: "🎬", label: "Main Character", rarity: "epic" };
  if (multiplier >= 2)
    return { emoji: "🌟", label: "Headliner", rarity: "rare" };
  if (multiplier >= 1.5)
    return { emoji: "🔥", label: "Crowd Favorite", rarity: "rare" };
  if (multiplier >= 1.1)
    return { emoji: "✨", label: "Quotable", rarity: "common" };
  if (multiplier >= 0.75)
    return { emoji: "💬", label: "Regular", rarity: "common" };
  if (multiplier >= 0.5)
    return { emoji: "🫥", label: "Under the Radar", rarity: "common" };
  return { emoji: "🪴", label: "Wallflower", rarity: "common" };
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
      ...getScoreRank(score.multiplier),
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

  const milestone = MESSAGE_MILESTONES.find((m) => activity.messages >= m.min);
  if (milestone) {
    add({
      key: "messages-milestone",
      emoji: milestone.emoji,
      label: milestone.label,
      rarity: milestone.rarity,
      tooltip: `Sent ${activity.messages.toLocaleString("en-US")} messages in ${circleName}`,
    });
  }

  const dayMilestone = ACTIVE_DAY_MILESTONES.find(
    (m) => activity.activeDaysTotal >= m.min,
  );
  if (dayMilestone) {
    add({
      key: "days-milestone",
      emoji: dayMilestone.emoji,
      label: dayMilestone.label,
      rarity: dayMilestone.rarity,
      tooltip: `Posted on ${activity.activeDaysTotal} different days in ${circleName}`,
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
