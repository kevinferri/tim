import { DashboardLayout } from "@/components/layouts/dashboard/dashboard-layout";
import { prismaClient } from "@/lib/prisma/client";
import { TopicHeader } from "@/topics/topic-header";
import { TopicChat } from "@/topics/topic-chat";
import { TopicMessageBar } from "@/topics/topic-message-bar";
import { NotFound } from "@/components/ui/not-found";
import { TopicSideBar } from "@/topics/topic-side-bar";
import {
  DEFAULT_MESSAGE_SELECT,
  MESSAGE_LIMIT,
  TOP_HIGHLIGHTS_LIMIT,
} from "@/lib/prisma/message-model";
import { CurrentTopicProvider } from "@/topics/current-topic-provider";

type Props = {
  params: { id: string };
};

export default async function TopicsPage({ params }: Props) {
  const topic = await prismaClient.topic.getMeTopicById({
    topicId: params.id,
    select: {
      id: true,
      name: true,
      userId: true,
      description: true,
      parentCircle: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  const messages = await prismaClient.message.getMessagesForTopic({
    topicId: topic?.id,
    select: DEFAULT_MESSAGE_SELECT,
  });

  const topHighlights =
    await prismaClient.message.getTopHighlightedMessagesForTopic({
      topicId: topic?.id,
      select: DEFAULT_MESSAGE_SELECT,
    });

  return (
    <DashboardLayout circleId={topic?.parentCircle.id} topicId={topic?.id}>
      {topic ? (
        <>
          <TopicHeader topic={topic} />
          <CurrentTopicProvider
            topicId={topic.id}
            circleId={topic.parentCircle.id}
            messagesLimit={MESSAGE_LIMIT}
            topHighlightsLimit={TOP_HIGHLIGHTS_LIMIT}
            existingMessages={messages}
            existingTopHighlights={topHighlights}
          >
            <div className="flex flex-1 flex-row overflow-y-hidden">
              <div className="flex flex-1 flex-col">
                <TopicChat />
                <TopicMessageBar />
              </div>
              <TopicSideBar />
            </div>
          </CurrentTopicProvider>
        </>
      ) : (
        <NotFound copy="Topic not found" />
      )}
    </DashboardLayout>
  );
}
