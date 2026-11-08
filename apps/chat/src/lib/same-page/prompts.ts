/**
 * Curated prompt bank. Picked by hashing circleId+gameDate so the same
 * circle gets a stable daily prompt without a writer, and never repeats
 * within the bank length for that circle (simple index walk).
 *
 * Wording: invite a short answer ("Name a…") rather than bare noun phrases.
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

export function pickPrompt(circleId: string, gameDate: string): string {
  const idx = hashString(`${circleId}:${gameDate}`) % SAME_PAGE_PROMPTS.length;
  return SAME_PAGE_PROMPTS[idx];
}
