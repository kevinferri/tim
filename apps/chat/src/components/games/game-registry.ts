export type GameId = "same-page";

export type GameDefinition = {
  id: GameId;
  name: string;
  description: string;
  /** Short label for hub list. */
  tagline: string;
};

/** Registry of circle games. Add new games here — header icon stays one Games hub. */
export const GAME_REGISTRY: GameDefinition[] = [
  {
    id: "same-page",
    name: "Same Page",
    tagline: "Match your circle on today’s prompt",
    description:
      "Answer the weekday prompt in 3 words or fewer, call who you think matched you, and see who was on the same page at 4pm EST.",
  },
];

export function getGame(id: GameId): GameDefinition | undefined {
  return GAME_REGISTRY.find((g) => g.id === id);
}
