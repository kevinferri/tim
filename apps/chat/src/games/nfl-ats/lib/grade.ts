export type PickSide = "home" | "away";
export type PickResult = "win" | "loss" | "push";

export function isPickSide(value: unknown): value is PickSide {
  return value === "home" || value === "away";
}

/**
 * Which side covered, given the home team's spread (-3.5 = home favored by
 * 3.5). The spread is added to the home score: the favorite has to win by
 * more than it, the underdog only has to lose by less.
 *
 * Returns "push" when the adjusted score is exactly level, which only
 * happens on a whole-number spread.
 */
export function getCoveringSide(args: {
  spread: number;
  homeScore: number;
  awayScore: number;
}): PickSide | "push" {
  const margin = args.homeScore + args.spread - args.awayScore;
  if (margin === 0) return "push";
  return margin > 0 ? "home" : "away";
}

export function gradePick(args: {
  side: PickSide;
  spread: number;
  homeScore: number;
  awayScore: number;
}): PickResult {
  const covering = getCoveringSide(args);
  if (covering === "push") return "push";
  return covering === args.side ? "win" : "loss";
}

export type PickRecord = { wins: number; losses: number; pushes: number };

export function emptyRecord(): PickRecord {
  return { wins: 0, losses: 0, pushes: 0 };
}

export function tallyResults(results: (PickResult | null)[]): PickRecord {
  const record = emptyRecord();
  for (const result of results) {
    if (result === "win") record.wins++;
    else if (result === "loss") record.losses++;
    else if (result === "push") record.pushes++;
  }
  return record;
}

/** "7-3" with pushes appended only when there are any, e.g. "7-3-1". */
export function formatRecord(record: PickRecord): string {
  const base = `${record.wins}-${record.losses}`;
  return record.pushes > 0 ? `${base}-${record.pushes}` : base;
}

/**
 * Wins over decided picks. Pushes don't count either way, which is how an
 * against-the-spread record is read. Null until something has been decided,
 * so an unplayed week reads as "--" rather than .000.
 */
export function winPercentage(record: PickRecord): number | null {
  const decided = record.wins + record.losses;
  return decided === 0 ? null : record.wins / decided;
}

/** ".700", leading zero dropped the way a percentage is shown in standings. */
export function formatWinPercentage(record: PickRecord): string {
  const pct = winPercentage(record);
  if (pct === null) return "—";
  return pct.toFixed(3).replace(/^0/, "");
}
