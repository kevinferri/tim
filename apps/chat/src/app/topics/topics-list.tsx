"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Topic } from "@prisma/client";

import { useSocketHandler, SocketEvent } from "@/components/socket/use-socket";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { getLinkForTopic } from "@/routes";
import { ToastAction } from "@/components/ui/toast";
import { useSelf } from "@/components/auth/self-provider";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useActiveCircleMembers } from "@/components/layouts/dashboard/active-circle-members-provider";

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
  const { getActiveMembersInTopic } = useActiveCircleMembers();

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
    SocketEvent.CreatedTopic,
    createdTopicProcessedHandler
  );

  if (!currentTopics) {
    return <>No topics yet...</>;
  }

  return (
    <ScrollArea>
      <div className="flex flex-col gap-2 p-3">
        {currentTopics.map((topic) => {
          const activeUsers = getActiveMembersInTopic(topic.id);

          return (
            <Link href={getLinkForTopic(topic.id)} key={topic.id}>
              <Button
                variant={topic.id === topicId ? "secondary" : "ghost"}
                className="w-full flex justify-start text-base font-normal"
              >
                {topic.name}
                <div className="flex gap-1 ml-auto">
                  {activeUsers.map((user) => (
                    <UserAvatar
                      key={user.id}
                      name={user.name}
                      imageUrl={user.imageUrl}
                      size="xs"
                    />
                  ))}
                </div>
              </Button>
            </Link>
          );
        })}
      </div>
    </ScrollArea>
  );
};
