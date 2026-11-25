import { CasinoPlayerStats } from "@tim/db-types";
import { TableGame } from "@tim/casino";
import { pgClient } from "./client";

export type CircleStanding = {
  /** All-time up/down, summed across casino games; 0 before a first hand. */
  net: number;
  /** How long ago their last hand in the circle settled; null before a first hand. */
  msSinceLastHand: number | null;
};

export async function loadCircleStanding(
  circleId: string,
  userId: string,
): Promise<CircleStanding> {
  // updatedAt is DB wall time without a zone, so its age is measured against the DB clock, not Node's.
  const row = await pgClient<CasinoPlayerStats>("casino_player_stats")
    .where({ circleId, userId })
    .select(
      pgClient.raw(`coalesce(sum("net"), 0) as "net"`),
      pgClient.raw(
        `extract(epoch from localtimestamp - max("updatedAt")) * 1000 as "msSinceLastHand"`,
      ),
    )
    .first<{ net: string; msSinceLastHand: string | null } | undefined>();
  return {
    net: Number(row?.net ?? 0),
    msSinceLastHand:
      row?.msSinceLastHand == null ? null : Number(row.msSinceLastHand),
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
