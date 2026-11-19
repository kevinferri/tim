import { prismaClient } from "@/lib/prisma/client";
import { getLoggedInUserId } from "@/lib/session";
import { NewsSheet } from "./news-sheet";

/** Loads the circle's topics for the share picker, then mounts the News panel. */
export async function NewsSheetHost({ circleId }: { circleId: string }) {
  const userId = await getLoggedInUserId();
  const [topics, circle] = await Promise.all([
    prismaClient.topic.getAllForCircleAndUser({
      userId,
      circleId,
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" },
    }),
    prismaClient.circle.getByIdForUser({
      userId,
      circleId,
      select: { defaultTopicId: true },
    }),
  ]);

  return (
    <NewsSheet
      circleId={circleId}
      topics={(topics ?? []).map((t) => ({ id: t.id, name: t.name }))}
      defaultTopicId={circle?.defaultTopicId ?? null}
    />
  );
}
