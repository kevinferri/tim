/**
 * Curated prompt bank. Each circle walks the bank by calendar day so the
 * same circle+date always gets the same prompt, consecutive days differ,
 * and nothing repeats until the bank wraps.
 */

export const SAME_PAGE_PROMPTS = [
  // Easier / Monday-friendly
  "Name a pizza topping",
  "Name a breakfast cereal",
  "Name a Beatle",
  "Name a primary color",
  "Name a farm animal",
  "Name a hot drink",
  "Name a board game",
  "Name a fruit you’d put in a smoothie",
  // Mid week
  "Name something in a junk drawer",
  "Name a US state you’d never visit",
  "Name a snack from a vending machine",
  "Name a childhood cartoon",
  "Name a kitchen gadget",
  "Name a shoe brand",
  "Name something you lose constantly",
  "Name a rainy-day activity",
  // Spicier Thu/Fri
  "Name a villain you’d vote for",
  "Name a reality TV show",
  "Name a terrible first date idea",
  "Name a song stuck in your head",
  "Name a weird flex",
  "Name a conspiracy you’d entertain",
  "Name a celebrity you’d trust with a secret",
  "Name a food that should be illegal",
] as const;

function hashString(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** Absolute day number for a YYYY-MM-DD civil date (UTC noon-safe ordinal). */
function dayOrdinal(gameDate: string): number {
  const [y, m, d] = gameDate.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

export function pickPrompt(circleId: string, gameDate: string): string {
  const n = SAME_PAGE_PROMPTS.length;
  // Per-circle phase so circles don't all share the same sequence.
  const offset = hashString(circleId) % n;
  const idx = (offset + dayOrdinal(gameDate)) % n;
  return SAME_PAGE_PROMPTS[idx];
}
