import { prismaClient } from "@/lib/prisma/client";
import { TopicsList } from "@/components/topics/topics-list";
import { Prisma, Topic } from "@prisma/client";
import { getLoggedInUserId } from "@/lib/session";

type Props = {
  circleId: string;
};

export async function TopicsNav({ circleId }: Props) {
  const userId = await getLoggedInUserId();

  const [topics, parentCircle] = await Promise.all([
    prismaClient.topic.getAllForCircleAndUser({
      userId,
      circleId,
      select: {
        name: true,
        id: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    }),

    prismaClient.circle.getByIdForUser({
      userId,
      circleId,
      select: {
        id: true,
        name: true,
        description: true,
        userId: true,
        imageUrl: true,
        defaultTopicId: true,
        members: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    }),
  ]);

  const topicList = topics as Topic[];
  const topicIds = topicList.map(({ id }) => id);

  const [unreadTopicIds, topicHistories] = await Promise.all([
    prismaClient.topicHistory.getUnreadTopicIds({
      userId,
      circleId,
      topicIds,
    }),
    prismaClient.topicHistory.getAllForUserAndCircle({ userId, circleId }),
  ]);

  const topicOrder = topicHistories.reduce<Record<string, number | null>>(
    (acc, { topicId, order }) => ({ ...acc, [topicId]: order }),
    {},
  );

  if (parentCircle) {
    return (
      <TopicsList
        topics={topicList}
        unreadTopicIds={unreadTopicIds}
        topicOrder={topicOrder}
        circle={
          parentCircle as Prisma.CircleGetPayload<{
            include: { members: true };
          }>
        }
      />
    );
  }

  return null;
}
