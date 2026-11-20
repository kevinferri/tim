import { CasinoPlayerStats } from "@tim/db-types";
import { TableGame } from "@tim/casino";
import { pgClient } from "./client";

/** All-time up/down in a circle, summed across casino games; 0 before a first hand. */
export async function loadCircleNet(circleId: string, userId: string) {
  const row = await pgClient<CasinoPlayerStats>("casino_player_stats")
    .where({ circleId, userId })
    .sum({ net: "net" })
    .first();
  return Number(row?.net ?? 0);
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
