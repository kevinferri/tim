"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import { HandlerEvent, useSocketHandler } from "@/components/socket/use-socket";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { getLinkForTopic } from "@/routes";
import { Topic } from "@prisma/client";
import { ToastAction } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";

type NewTopicHandlerProps = {
  createdBy: string;
  topicId: string;
  topicName: string;
};

var oneDayAgo = new Date().getTime() + 1 * 24 * 60 * 60 * 1000;

export const TopicsList = ({
  topics,
  topicId,
}: {
  topics?: Topic[];
  topicId?: string;
}) => {
  const [liveTopics, setLiveTopics] = useState(topics);
  const { toast } = useToast();
  const createdTopicProcessedHandler = useCallback(
    (payload: NewTopicHandlerProps) => {
      toast({
        title: "Topic created",
        description: `${payload.createdBy} created a new topic called ${payload.topicName}`,
        action: <ToastAction altText="Go there now">Go there now</ToastAction>,
      });

      // also need to add to state in nav to show new topic!
    },
    [toast]
  );

  useSocketHandler<NewTopicHandlerProps>(
    HandlerEvent.CreatedTopicProcessed,
    createdTopicProcessedHandler
  );

  if (!liveTopics) {
    return <>No topics yet...</>;
  }

  return (
    <ScrollArea>
      <div className="flex flex-col gap-2 p-3">
        {liveTopics.map((topic) => {
          return (
            <Link href={getLinkForTopic(topic.id)} key={topic.id}>
              <Button
                variant={topic.id === topicId ? "secondary" : "ghost"}
                className="w-full flex justify-start gap-2"
              >
                {topic.name}
              </Button>
            </Link>
          );
        })}
      </div>
    </ScrollArea>
  );
};
