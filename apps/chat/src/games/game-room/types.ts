import type { ComponentType } from "react";
import type { CommandName } from "@tim/commands";

/** "play" = something to do now; "results" = something new to see. */
export type GameBadge = "play" | "results" | null;

/** What a game provides to the Game room. Games are registered in src/games/index.tsx. */
export type GameDefinition = {
  id: string;
  name: string;
  /** Short line under the name in the Game room list. */
  tagline: string;
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
