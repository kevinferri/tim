"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Topic } from "@prisma/client";

import { useSocketHandler, SocketEvent } from "@/components/socket/use-socket";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useSelf } from "@/components/auth/self-provider";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useActiveCircleMembers } from "@/components/dashboard/active-circle-members-provider";

type Props = {
  topics?: Topic[];
  circleName?: string;
  circleId?: string;
};

type NewTopicHandlerProps = {
  id: string;
  name: string;
  isEdit: boolean;
  circleId: string;
  createdBy: {
    name: string;
    id: string;
  };
};

type DeletedTopicHandlerProps = {
  id: string;
  name: string;
  circleId: string;
  deletedBy: {
    name: string;
    id: string;
  };
};

export const TopicsList = ({ topics, circleName, circleId }: Props) => {
  const params = useParams();
  const self = useSelf();
  const { toast } = useToast();
  const router = useRouter();
  const { getActiveMembersInTopic } = useActiveCircleMembers();

  useSocketHandler<NewTopicHandlerProps>(
    SocketEvent.UpsertedTopic,
    (payload) => {
      router.refresh();

      if (payload.circleId !== circleId) return;
      if (payload.isEdit) return;

      const createdBySelf = payload.createdBy.id === self.id;
      const name = createdBySelf ? "You" : payload.createdBy.name;

      toast({
        title: `New topic created in ${circleName}`,
        description: `${name} created a new topic called "${payload.name}"`,
        action: (
          <ToastAction
            altText="Go there now"
            onClick={() => {
              router.push(`/circles/${payload.circleId}/topics/${payload.id}`);
            }}
          >
            Go there now
          </ToastAction>
        ),
      });
    }
  );

  useSocketHandler<DeletedTopicHandlerProps>(
    SocketEvent.DeletedTopic,
    (payload) => {
      router.refresh();

      if (payload.id === params.topicId) {
        router.push(`/circles/${payload.circleId}`);
      }

      if (payload.circleId !== circleId) return;

      const deletedBySelf = payload.deletedBy.id === self.id;
      const name = deletedBySelf ? "You" : payload.deletedBy.name;

      toast({
        title: `Topic deleted in ${circleName}`,
        description: `${name} deleted the topic called "${payload.name}"`,
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
            <Link
              href={`/circles/${circleId}/topics/${topic.id}`}
              key={topic.id}
            >
              <Button
                variant={topic.id === params.topicId ? "secondary" : "ghost"}
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
