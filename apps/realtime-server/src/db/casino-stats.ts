import { CasinoPlayerStats } from "@tim/db-types";
import { TableGame } from "@tim/casino";
import { pgClient } from "./client";

export type CircleStanding = {
  /** All-time up/down, summed across casino games; 0 before a first hand. */
  net: number;
  /** When their last hand in the circle settled; null before a first hand. */
  lastPlayedAt: Date | null;
};

export async function loadCircleStanding(
  circleId: string,
  userId: string,
): Promise<CircleStanding> {
  const row = await pgClient<CasinoPlayerStats>("casino_player_stats")
    .where({ circleId, userId })
    .sum({ net: "net" })
    .max({ lastPlayedAt: "updatedAt" })
    .first();
  return {
    net: Number(row?.net ?? 0),
    lastPlayedAt: row?.lastPlayedAt ? new Date(row.lastPlayedAt) : null,
  };
}

export type HandRecord = {
  circleId: string;
  userId: string;
  game: TableGame;
  net: number;
  wagered: number;
};

/** Adds one settled hand; a single upsert, so concurrent settles can't lose an update. */
export async function recordHand({
  circleId,
  userId,
  game,
  net,
  wagered,
}: HandRecord) {
  await pgClient<CasinoPlayerStats>("casino_player_stats")
    .insert({ circleId, userId, game, net, wagered, handsPlayed: 1 })
    .onConflict(["circleId", "userId", "game"])
    .merge({
      net: pgClient.raw(`"casino_player_stats"."net" + excluded."net"`),
      wagered: pgClient.raw(
        `"casino_player_stats"."wagered" + excluded."wagered"`,
      ),
      handsPlayed: pgClient.raw(`"casino_player_stats"."handsPlayed" + 1`),
      updatedAt: pgClient.fn.now(),
    });
}
