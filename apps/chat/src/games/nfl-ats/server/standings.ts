import { prismaClient } from "@/lib/prisma/client";
import {
  tallyResults,
  winPercentage,
  type PickRecord,
  type PickResult,
} from "../lib/grade";
import { getPreviousWeekStart, getSeason } from "../lib/week";

export type StandingsMember = {
  id: string;
  displayName: string;
  name: string | null;
  imageUrl: string | null;
};

export type StandingsRow = {
  user: StandingsMember;
  isYou: boolean;
  /** Last week's record, null when that week had nothing graded for them. */
  lastWeek: PickRecord | null;
  season: PickRecord;
  /** Null until a pick has been decided; pushes alone don't settle anything. */
  winPct: number | null;
};

export type NflAtsStandings = {
  season: number;
  /** The week the "Last week" column covers, null before a second week exists. */
  lastWeekStartsOn: string | null;
  rows: StandingsRow[];
};

/**
 * Everyone in the circle, ranked on the season so far, with last week's record
 * alongside. Members who haven't picked anything are still listed, at the
 * bottom, so the table is the circle rather than only its players.
 */
export async function getStandings({
  circleId,
  userId,
  now = new Date(),
}: {
  circleId: string;
  userId: string;
  now?: Date;
}): Promise<NflAtsStandings> {
  const season = getSeason(now);
  const lastWeekStartsOn = getPreviousWeekStart(now);

  const circle = await prismaClient.circle.findUnique({
    where: { id: circleId },
    select: {
      members: {
        select: { id: true, displayName: true, name: true, imageUrl: true },
      },
    },
  });
  const members = circle?.members ?? [];
  if (members.length === 0) {
    return { season, lastWeekStartsOn: null, rows: [] };
  }

  // Graded picks only: an ungraded pick says nothing about a record yet.
  const picks = await prismaClient.nflAtsPick.findMany({
    where: {
      userId: { in: members.map((m) => m.id) },
      result: { not: null },
      game: { week: { season } },
    },
    select: {
      userId: true,
      result: true,
      game: { select: { week: { select: { startsOn: true } } } },
    },
  });

  const lastWeekPlayed = picks.some(
    (p) => p.game.week.startsOn === lastWeekStartsOn,
  );

  const seasonResults = new Map<string, PickResult[]>();
  const lastWeekResults = new Map<string, PickResult[]>();
  for (const pick of picks) {
    const result = pick.result as PickResult;
    push(seasonResults, pick.userId, result);
    if (pick.game.week.startsOn === lastWeekStartsOn) {
      push(lastWeekResults, pick.userId, result);
    }
  }

  const rows: StandingsRow[] = members.map((member) => {
    const seasonRecord = tallyResults(seasonResults.get(member.id) ?? []);
    return {
      user: member,
      isYou: member.id === userId,
      lastWeek: lastWeekPlayed
        ? tallyResults(lastWeekResults.get(member.id) ?? [])
        : null,
      season: seasonRecord,
      winPct: winPercentage(seasonRecord),
    };
  });

  return {
    season,
    lastWeekStartsOn: lastWeekPlayed ? lastWeekStartsOn : null,
    rows: rows.sort(compareRows),
  };
}

function push(map: Map<string, PickResult[]>, key: string, value: PickResult) {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

/**
 * Best percentage first. Wins break a tie, so 7-3 outranks 2-1 at the same
 * .700; someone with nothing decided sits below everyone who has played.
 */
function compareRows(a: StandingsRow, b: StandingsRow): number {
  if (a.winPct === null || b.winPct === null) {
    if (a.winPct !== b.winPct) return a.winPct === null ? 1 : -1;
  } else if (a.winPct !== b.winPct) {
    return b.winPct - a.winPct;
  }
  if (a.season.wins !== b.season.wins) return b.season.wins - a.season.wins;
  return a.user.displayName.localeCompare(b.user.displayName);
}
