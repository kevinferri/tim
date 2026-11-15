import { CircleGame } from "@tim/db-types";
import { pgClient } from "./client";

// Mirrors apps/chat's isGameEnabled (games/game-room/server): a circle_games row means the game is on.
export async function isGameEnabled({
  circleId,
  gameId,
}: {
  circleId: string;
  gameId: string;
}) {
  const row = await pgClient<CircleGame>("circle_games")
    .select("circleId")
    .where({ circleId, gameId })
    .first();

  return Boolean(row);
}
