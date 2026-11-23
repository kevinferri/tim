import { CirclesNav } from "@/components/circles/circles-nav";
import { getUserCircles } from "@/lib/user-circles";
import { getLoggedInUserId } from "@/lib/session";
import { prismaClient } from "@/lib/prisma/client";

/** Pages with the app's chrome. Full-screen pages live in (full-screen) instead. */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = await getLoggedInUserId();
  if (!userId) return children;
  // Same id as the root layout's call, so this hits the per-request cache.
  const circles = await getUserCircles(userId);
  const [unreadCircleIds, mutedTopicIds] = await Promise.all([
    prismaClient.topicReadState.getUnreadCircleIds({
      userId,
      circleIds: circles?.map(({ id }) => id) ?? [],
    }),
    prismaClient.topicPreference.getMutedTopicIdsForUser({ userId }),
  ]);

  return (
    <>
      <CirclesNav
        circles={circles}
        unreadCircleIds={unreadCircleIds}
        mutedTopicIds={mutedTopicIds}
      />
      {children}
    </>
  );
}
