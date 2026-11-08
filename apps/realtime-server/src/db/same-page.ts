import { pgClient } from "./client";

type SockRow = {
  holderUserId: string | null;
  heldSince: Date | null;
  displayName: string | null;
};

export async function getSamePageSockHolder(circleId: string) {
  const row = await pgClient("same_page_socks as s")
    .leftJoin("users as u", "u.id", "s.holderUserId")
    .select<SockRow[]>(
      "s.holderUserId",
      "s.heldSince",
      "u.displayName",
    )
    .where("s.circleId", circleId)
    .first();

  return row ?? null;
}
