import type { ComponentType } from "react";
import type { CommandName } from "@tim/commands";

/** "play" = something to do now; "results" = something new to see. */
export type GameBadge = "play" | "results" | null;

/** Sections of the Game room list, in display order. */
export const GAME_CATEGORIES = [
  { id: "daily", label: "Daily" },
  { id: "casino", label: "Casino" },
] as const;

export type GameCategory = (typeof GAME_CATEGORIES)[number]["id"];

/** What a game provides to the Game room. Games are registered in src/games/index.tsx. */
export type GameDefinition = {
  id: string;
  name: string;
  /** Short line under the name in the Game room list. */
  tagline: string;
  /** Which section of the Game room list it's in. */
  category: GameCategory;
  Icon: ComponentType<{ className?: string }>;
  Panel: ComponentType<{ circleId: string }>;
  /** Shown after the game's name in the sheet header, e.g. the current view. */
  TitleSuffix?: ComponentType;
  InfoButton?: ComponentType<{ stopPropagation?: boolean }>;
  fetchBadge?: (circleId: string) => Promise<GameBadge>;
  /** When the badge may change on its own (e.g. a new day), so open tabs refetch it then. */
  nextBadgeChangeAt?: () => Date;
  /** A slash command handled in the browser. `run` returns false to send it as a normal message instead. */
  command?: {
    name: CommandName;
    run: (prompt: string, circleId: string) => boolean;
  };
};

/** A game listed in the Game room but not playable yet: shown disabled with a "Coming soon" badge. */
export type ComingSoonGame = Pick<
  GameDefinition,
  "id" | "name" | "tagline" | "category" | "Icon"
>;
