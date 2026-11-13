"use client";

// Registers games with the Game room. The only place that knows every game.
import type { ParsedCommand } from "@tim/commands";
import {
  GameRoomButton as GameRoomButtonBase,
  GameRoomSheet,
  type GameDefinition,
} from "@/games/game-room";
import { samePageGame, samePageNotificationCopy } from "@/games/same-page";
import { wordsmithGame, wordsmithNotificationCopy } from "@/games/wordsmith";

const GAMES: GameDefinition[] = [samePageGame, wordsmithGame];

/** Runs a game's slash command in the browser; false means send it as a normal message. */
export function runGameCommand(
  parsed: ParsedCommand,
  circleId: string,
): boolean {
  const game = GAMES.find((g) => g.command?.name === parsed.name);
  return game?.command?.run(parsed.prompt, circleId) ?? false;
}

/** Copy for every game's circle-level notifications, keyed by NotificationType. */
export const gameNotificationCopy = {
  ...samePageNotificationCopy,
  ...wordsmithNotificationCopy,
};

export function GameRoomSheetHost({ circleId }: { circleId: string }) {
  return <GameRoomSheet circleId={circleId} games={GAMES} />;
}

export function GameRoomButton(props: {
  circleId: string;
  isMinimized: boolean;
}) {
  return <GameRoomButtonBase {...props} games={GAMES} />;
}
