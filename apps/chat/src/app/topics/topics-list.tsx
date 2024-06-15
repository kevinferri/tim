"use client";

import Link from "next/link";
import { useCallback } from "react";
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

type NewTopicHandlerProps = {
  id: string;
  name: string;
  isEdit: boolean;
  createdBy: {
    name: string;
    id: string;
  };
};

export const TopicsList = ({ topics, topicId, circleName }: Props) => {
  const self = useSelf();
  const { toast } = useToast();
  const router = useRouter();
  const { getActiveMembersInTopic } = useActiveCircleMembers();

  useSocketHandler<NewTopicHandlerProps>(
    SocketEvent.UpsertedTopic,
    (payload: NewTopicHandlerProps) => {
      router.refresh();

      if (payload.isEdit) return;

      const createdBySelf = payload.createdBy.id === self.id;
      const name = createdBySelf ? "You" : payload.createdBy.name;

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
    }
  );

  if (!topics) {
    return <>No topics yet...</>;
  }

  return (
    <ScrollArea>
      <div className="flex flex-col gap-2 p-3">
        {topics.map((topic) => {
          const activeUsers = getActiveMembersInTopic(topic.id);

          return (
            <Link href={getLinkForTopic(topic.id)} key={topic.id}>
              <Button
                variant={topic.id === topicId ? "secondary" : "ghost"}
                className="w-full flex justify-start text-base font-normal p-3"
              >
                {topic.name}
                <div className="flex gap-1 ml-auto">
                  {activeUsers.map((user) => (
                    <UserAvatar
                      key={user.id}
                      id={user.id}
                      name={user.name}
                      imageUrl={user.imageUrl}
                      createdAt={user.createdAt}
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
