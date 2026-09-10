import { prismaClient } from "@/lib/prisma/client";
import { getLoggedInUserId } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const userId = await getLoggedInUserId();
  const mostRecentTopic = await prismaClient.topicHistory.getMostRecentForUser(
    { userId }
  );

  const isStillInCircle = mostRecentTopic?.topic.parentCircle.members.find(
    ({ id }) => id === userId
  );

  if (mostRecentTopic && !isStillInCircle) {
    prismaClient.topicHistory.deleteForTopicAndUser({
      topicId: mostRecentTopic.topicId,
      userId,
    });
  }

  // Redirect on the server (as `/circles/[circleId]/page.tsx` already does
  // for its own default-topic redirect) rather than rendering a client
  // component that redirects on mount. The client-redirect version painted
  // its own bespoke loading skeleton first, then -- once the client-side
  // navigation actually landed -- the target route's real loading.tsx/
  // Suspense skeletons took over, which look different (different
  // component, different shape) and land a beat later. That read as two
  // different loading states in sequence. A server redirect skips straight
  // to the target route's real (single) loading UI.
  if (mostRecentTopic) {
    redirect(
      `/circles/${mostRecentTopic.topic.circleId}/topics/${mostRecentTopic.topicId}`
    );
  }

  return (
    <div className="flex basis-full justify-center items-center">
      Welcome to Tim
    </div>
  );
}
