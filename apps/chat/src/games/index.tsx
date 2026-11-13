"use client";

// Registers games with the Game room. The only place that knows every game.
import {
  GameRoomButton as GameRoomButtonBase,
  GameRoomSheet,
  type GameDefinition,
} from "@/games/game-room";
import { samePageGame } from "@/games/same-page";

const GAMES: GameDefinition[] = [samePageGame];

export function GameRoomSheetHost({ circleId }: { circleId: string }) {
  return <GameRoomSheet circleId={circleId} games={GAMES} />;
}

export function GameRoomButton(props: {
  circleId: string;
  isMinimized: boolean;
}) {
  return <GameRoomButtonBase {...props} games={GAMES} />;
}
