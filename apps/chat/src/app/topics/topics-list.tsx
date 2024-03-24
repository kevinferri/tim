"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Topic } from "@prisma/client";

import { HandlerEvent, useSocketHandler } from "@/components/socket/use-socket";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { getLinkForTopic } from "@/routes";
import { ToastAction } from "@/components/ui/toast";
import { useSelf } from "@/components/auth/self-provider";

type Props = {
  topics?: Topic[];
  topicId?: string;
  circleName?: string;
};

type NewTopicHandlerProps = Topic & {
  createdBy: {
    name: string;
    id: string;
  };
};

export const TopicsList = ({ topics, topicId, circleName }: Props) => {
  const self = useSelf();
  const [currentTopics, setCurrentTopics] = useState(topics);
  const { toast } = useToast();
  const router = useRouter();

  const createdTopicProcessedHandler = useCallback(
    (payload: NewTopicHandlerProps) => {
      const createdBySelf = payload.createdBy.id === self.id;
      const name = createdBySelf ? "You" : payload.createdBy.name;

      setCurrentTopics((topics) => {
        const _topics = topics ?? [];
        return [..._topics, payload];
      });

      toast({
        title: `New topic created in ${circleName}`,
        description: `${name} created a new topic called "${payload.name}"`,
        duration: 10000,
        action: (
          <ToastAction
            altText="Go there now"
            onClick={() => {
              router.push(getLinkForTopic(payload.id));
            }}
          >
            Go there now
          </ToastAction>
        ),
      });
    },
    [toast, circleName, self.id, router]
  );

  useSocketHandler<NewTopicHandlerProps>(
    HandlerEvent.CreatedTopicProcessed,
    createdTopicProcessedHandler
  );

  if (!currentTopics) {
    return <>No topics yet...</>;
  }

  return (
    <ScrollArea>
      <div className="flex flex-col gap-2 p-3">
        {currentTopics.map((topic) => {
          return (
            <Link href={getLinkForTopic(topic.id)} key={topic.id}>
              <Button
                variant={topic.id === topicId ? "secondary" : "ghost"}
                className="w-full flex justify-start gap-2 text-base font-normal"
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
