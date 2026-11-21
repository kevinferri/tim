import {
  isCircleAdmin,
  isGameEnabled,
  setGameEnabled,
} from "@/games/game-room/server";
import { BLACKJACK_GAME_ID } from "../lib/game-id";

export { isCircleAdmin };

export async function getBlackjackState(circleId: string, userId: string) {
  const [enabled, isAdmin] = await Promise.all([
    isGameEnabled(circleId, BLACKJACK_GAME_ID),
    isCircleAdmin(circleId, userId),
  ]);
  return { enabled, isAdmin };
}

/** Caller must have checked isCircleAdmin. Turning it off doesn't kick anyone already at the table. */
export function setBlackjackEnabled(circleId: string, enabled: boolean) {
  return setGameEnabled(circleId, BLACKJACK_GAME_ID, enabled);
}
