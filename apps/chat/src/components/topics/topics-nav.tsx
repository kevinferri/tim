import { prismaClient } from "@/lib/prisma/client";
import { TopicsList } from "@/components/topics/topics-list";
import { Message, Prisma, Topic, TopicHistory } from "@prisma/client";
import { getLoggedInUserId } from "@/lib/session";
import keyBy from "lodash.keyby";

type Props = {
  circleId: string;
};

export async function TopicsNav({ circleId }: Props) {
  const userId = await getLoggedInUserId();

  const queries = [
    prismaClient.topic.getMeAllTopicsForCircle({
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

    prismaClient.circle.getMeCircleById({
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
    prismaClient.topicHistory.findMany({
      where: {
        userId,
      },
      select: {
        updatedAt: true,
        topicId: true,
      },
    }),
  ];

  const [topics, parentCircle, histories] = await Promise.all(queries);
  const topicList = topics as Topic[];
  const topicIds = topicList.map(({ id }) => id);
  const recentMessageByTopic = await prismaClient.$queryRaw`
  SELECT "topicId", "createdAt" FROM (
    SELECT "topicId", "createdAt", ROW_NUMBER() OVER (PARTITION BY "topicId" ORDER BY "createdAt" DESC) as row_num
    FROM "messages"
    WHERE "topicId" IN (${Prisma.join(topicIds)})
  ) AS latest_messages
  WHERE row_num = 1;
`;

  const historyMap: Record<string, TopicHistory> = keyBy(histories, "topicId");

  const unreadTopicIds = (recentMessageByTopic as Message[]).reduce(
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
    {},
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
