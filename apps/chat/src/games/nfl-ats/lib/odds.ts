/**
 * Shapes of the slice of The Odds API v4 responses this game reads, and the
 * pure functions that reduce them. Kept here (not in server/) so they can be
 * unit tested without touching the network.
 */

export type OddsApiOutcome = { name: string; point?: number };
export type OddsApiMarket = { key: string; outcomes?: OddsApiOutcome[] };
export type OddsApiBookmaker = { key: string; markets?: OddsApiMarket[] };

export type OddsApiEvent = {
  id: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers?: OddsApiBookmaker[];
};

export type OddsApiScore = { name: string; score?: string };
export type OddsApiScoreEvent = {
  id: string;
  completed: boolean;
  home_team: string;
  away_team: string;
  scores?: OddsApiScore[] | null;
};

export type SlateGame = {
  eventId: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: Date;
  spread: number;
};

export type FinalScore = {
  eventId: string;
  homeScore: number;
  awayScore: number;
};

export function median(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * The home team's spread across every book quoting one, reduced to the median
 * so a single outlier can't set the line everyone plays against. Books that
 * don't price spreads, or price them without a number, are skipped.
 */
export function getHomeSpread(event: OddsApiEvent): number | undefined {
  const points: number[] = [];

  for (const bookmaker of event.bookmakers ?? []) {
    for (const market of bookmaker.markets ?? []) {
      if (market.key !== "spreads") continue;
      for (const outcome of market.outcomes ?? []) {
        if (outcome.name !== event.home_team) continue;
        if (
          typeof outcome.point === "number" &&
          Number.isFinite(outcome.point)
        ) {
          points.push(outcome.point);
        }
      }
    }
  }

  return median(points);
}

/** Drops anything we can't pick: no spread, no kickoff, or a malformed event. */
export function toSlateGames(events: OddsApiEvent[]): SlateGame[] {
  const games: SlateGame[] = [];

  for (const event of events) {
    if (!event.id || !event.home_team || !event.away_team) continue;

    const kickoffAt = new Date(event.commence_time);
    if (Number.isNaN(kickoffAt.getTime())) continue;

    const spread = getHomeSpread(event);
    if (spread === undefined) continue;

    games.push({
      eventId: event.id,
      homeTeam: event.home_team,
      awayTeam: event.away_team,
      kickoffAt,
      spread,
    });
  }

  return games;
}

/** Only completed games with both scores present can be graded. */
export function toFinalScores(events: OddsApiScoreEvent[]): FinalScore[] {
  const finals: FinalScore[] = [];

  for (const event of events) {
    if (!event.completed || !event.scores) continue;

    const homeScore = findScore(event.scores, event.home_team);
    const awayScore = findScore(event.scores, event.away_team);
    if (homeScore === undefined || awayScore === undefined) continue;

    finals.push({ eventId: event.id, homeScore, awayScore });
  }

  return finals;
}

function findScore(scores: OddsApiScore[], team: string): number | undefined {
  const entry = scores.find((score) => score.name === team);
  if (!entry || entry.score === undefined || entry.score === null)
    return undefined;

  const value = Number(entry.score);
  return Number.isInteger(value) ? value : undefined;
}
