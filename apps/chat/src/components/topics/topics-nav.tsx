import { prismaClient } from "@/lib/prisma/client";
import { TopicsList } from "@/components/topics/topics-list";
import { Prisma, Topic, TopicHistory } from "@prisma/client";
import { getLoggedInUserId } from "@/lib/session";
import keyBy from "lodash.keyby";

type Props = {
  circleId: string;
};

export async function TopicsNav({ circleId }: Props) {
  const userId = await getLoggedInUserId();

  const queries = [
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

    // See if there is a way to just get histories for current circle
    prismaClient.topicHistory.getAllForUser({ userId }),
  ];

  const [topics, parentCircle, histories] = await Promise.all(queries);
  const topicList = topics as Topic[];
  const topicIds = topicList.map(({ id }) => id);
  const recentMessageByTopic =
    await prismaClient.message.getMostRecentTimestampsByTopic({ topicIds });

  const historyMap: Record<string, TopicHistory> = keyBy(histories, "topicId");

  const unreadTopicIds = recentMessageByTopic.reduce(
    (acc, { createdAt, topicId }) => {
      const history = historyMap[topicId];

      if (history && new Date(history.updatedAt) < new Date(createdAt)) {
        return {
          ...acc,
          [topicId]: true,
        };
      }

      return acc;
    },
    {}
  );

  if (parentCircle) {
    return (
      <TopicsList
        topics={topicList}
        unreadTopicIds={unreadTopicIds}
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
