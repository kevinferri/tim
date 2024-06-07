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
import { cache } from "react";
import { DEFAULT_TITLE } from "@/layout";

type Props = {
  params: { id: string };
};

const getTopic = cache(async (id: string) => {
  const topic = await prismaClient.topic.getMeTopicById({
    topicId: id,
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

  return topic;
});

export async function generateMetadata({ params }: Props) {
  const topic = await getTopic(params.id);

  return {
    title: !topic
      ? DEFAULT_TITLE
      : `${topic.parentCircle.name} - ${topic.name}`,
  };
}

export default async function TopicsPage({ params }: Props) {
  const topic = await getTopic(params.id);

  const messages = await prismaClient.message.getMessagesForTopic({
    topicId: topic?.id,
    select: DEFAULT_MESSAGE_SELECT,
  });

  const topHighlights =
    await prismaClient.message.getTopHighlightedMessagesForTopic({
      topicId: topic?.id,
      select: DEFAULT_MESSAGE_SELECT,
    });

  const mediaMessages = await prismaClient.message.getMediaMessagesForTopic({
    topicId: topic?.id,
    select: DEFAULT_MESSAGE_SELECT,
  });

  const circleMembers = topic?.parentCircle.id
    ? await prismaClient.user.getMembersForCircle({
        circleId: topic.parentCircle.id,
        select: {
          id: true,
          name: true,
          imageUrl: true,
          createdCircles: {
            select: {
              id: true,
            },
          },
        },
      })
    : [];

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
            existingCircleMemebers={circleMembers}
            // @ts-expect-error
            existingMessages={messages}
            // @ts-expect-error
            existingTopHighlights={topHighlights}
            // @ts-expect-error
            existingMediaMessages={mediaMessages}
          >
            <div className="flex flex-1 flex-row overflow-y-hidden">
              <div className="flex flex-1 flex-col overflow-x-hidden">
                <TopicChat />
                <TopicMessageBar />
              </div>
              <div className="flex overflow-y-hidden">
                <TopicSideBar />
              </div>
            </div>
          </CurrentTopicProvider>
        </>
      ) : (
        <NotFound copy="Topic not found" />
      )}
    </DashboardLayout>
  );
}
