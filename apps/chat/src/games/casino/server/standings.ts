import { prismaClient } from "@/lib/prisma/client";

export type UpDownRow = {
  user: {
    id: string;
    displayName: string;
    name: string | null;
    imageUrl: string | null;
  };
  net: number;
  wagered: number;
  handsPlayed: number;
};

/** Each player's all-time up/down in a circle, summed over casino games; players with no hands are left out. */
export async function getUpDownStandings(
  circleId: string,
): Promise<UpDownRow[]> {
  const groups = await prismaClient.casinoPlayerStats.groupBy({
    by: ["userId"],
    where: { circleId },
    _sum: { net: true, wagered: true, handsPlayed: true },
  });
  const played = groups.filter((g) => (g._sum.handsPlayed ?? 0) > 0);
  if (played.length === 0) return [];

  const users = await prismaClient.user.findMany({
    where: { id: { in: played.map((g) => g.userId) } },
    select: { id: true, displayName: true, name: true, imageUrl: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));

  return played
    .flatMap((g) => {
      const user = byId.get(g.userId);
      return user
        ? [
            {
              user,
              net: g._sum.net ?? 0,
              wagered: g._sum.wagered ?? 0,
              handsPlayed: g._sum.handsPlayed ?? 0,
            },
          ]
        : [];
    })
    .sort((a, b) => b.net - a.net || b.handsPlayed - a.handsPlayed);
}
