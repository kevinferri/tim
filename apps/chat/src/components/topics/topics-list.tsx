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
import { getInitials, UserAvatar } from "@/components/ui/user-avatar";
import { useActiveCircleMembers } from "@/components/dashboard/active-circle-members-store";
import { useLocalStorage } from "@/lib/hooks";
import { UpsertTopicForm } from "./upsert-topic-form";
import { UpsertCircleForm } from "../circles/upsert-circle-form";
import {
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
  GearIcon,
  HomeIcon,
  PlusIcon,
} from "@radix-ui/react-icons";
import { WithRelation } from "../../../types/prisma";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Tooltip, TooltipProvider } from "@radix-ui/react-tooltip";
import { TooltipContent, TooltipTrigger } from "../ui/tooltip";

type Props = {
  topics?: Topic[];
  circle: WithRelation<"Circle", "members">;
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

export const TopicsList = ({ topics, circle }: Props) => {
  const params = useParams();
  const self = useSelf();
  const router = useRouter();
  const { toast } = useToast();
  const { getActiveMembersInTopic } = useActiveCircleMembers();
  const [isMinimized, setIsMinimized] = useLocalStorage(
    "tim:topics-nav-minimized",
    false
  );

  useSocketHandler<NewTopicHandlerProps>(
    SocketEvent.UpsertedTopic,
    (payload) => {
      router.refresh();

      if (payload.circleId !== circle.id) return;
      if (payload.isEdit) return;

      const createdBySelf = payload.createdBy.id === self.id;
      const name = createdBySelf ? "You" : payload.createdBy.name;

      toast({
        title: `New topic created in ${circle.name}`,
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

      if (payload.circleId !== circle.id) return;

      const deletedBySelf = payload.deletedBy.id === self.id;
      const name = deletedBySelf ? "You" : payload.deletedBy.name;

      toast({
        title: `Topic deleted in ${circle.name}`,
        description: `${name} deleted the topic called "${payload.name}"`,
      });
    }
  );

  if (!topics) {
    return <>No topics yet...</>;
  }

  return (
    <div
      className={cn(
        `flex flex-col shadow-md border-r`,
        isMinimized
          ? ""
          : "max-w-[220px] min-w-[220px] lg:max-w-[280px] lg:min-w-[280px]"
      )}
    >
      <div
        className={cn(
          `flex block p-3 border-b overflow-hidden whitespace-nowrap text-ellipsis font-medium flex`,
          isMinimized ? "justify-center" : ""
        )}
      >
        {!isMinimized && circle.name}
        <Button
          className={cn(`font-normal`, isMinimized ? "" : "flex ml-auto")}
          size="iconSm"
          variant="ghost"
          onClick={() => setIsMinimized(!isMinimized)}
        >
          {isMinimized ? <DoubleArrowRightIcon /> : <DoubleArrowLeftIcon />}
        </Button>
      </div>

      <ScrollArea>
        <div className="flex flex-col gap-3 p-3">
          {topics.map((topic) => {
            const activeUsers = getActiveMembersInTopic(topic.id);

            return (
              <Link
                href={`/circles/${circle.id}/topics/${topic.id}`}
                key={topic.id}
              >
                {isMinimized ? (
                  <TooltipProvider>
                    <Tooltip delayDuration={100}>
                      <TooltipTrigger>
                        <div className="relative">
                          <Avatar
                            className={`active:border ${
                              params.topicId === topic.id
                                ? "border shadow-[0_0_1px_white,inset_0_0_1px_white,0_0_2px_#9333ea,0_0_5px_#9333ea,0_0_10px_#9333ea]"
                                : "shadow-lg hover:opacity-80"
                            }`}
                          >
                            <AvatarFallback>
                              <div className="mt-[1.5px]">
                                {topic.id === circle.defaultTopicId ? (
                                  <HomeIcon height={16} width={16} />
                                ) : (
                                  getInitials(topic.name)
                                )}
                              </div>
                            </AvatarFallback>
                          </Avatar>
                          {activeUsers.length > 0 && (
                            <div className="border absolute top-[-4px] right-[-4px] w-[16px] h-[16px] text-[10px] rounded-full bg-purple-500 text-slate-100 flex items-center justify-center">
                              {activeUsers.length}
                            </div>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent
                        side="right"
                        className="p-2"
                        sideOffset={8}
                      >
                        <div className="flex flex-col gap-2">
                          <div className="text-sm leading-none">
                            {topic.name}
                          </div>
                          {activeUsers.length > 0 && (
                            <div className="flex gap-1">
                              {activeUsers.map((user) => {
                                return (
                                  <UserAvatar
                                    key={user.id}
                                    id={user.id}
                                    name={user.name}
                                    imageUrl={user.imageUrl}
                                    createdAt={user.createdAt}
                                    size="xs"
                                  />
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <Button
                    variant={
                      topic.id === params.topicId ? "secondary" : "ghost"
                    }
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
                )}
              </Link>
            );
          })}
        </div>
      </ScrollArea>
      <div className="flex flex-col items-center mt-auto gap-3 p-3">
        <UpsertTopicForm
          circleId={circle.id ?? ""}
          circleName={circle.name}
          trigger={
            isMinimized ? (
              <TooltipProvider>
                <Tooltip delayDuration={100}>
                  <TooltipTrigger>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="rounded-full"
                    >
                      <PlusIcon />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">New topic</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : undefined
          }
        />
        <UpsertCircleForm
          existingCircle={circle ?? undefined}
          trigger={
            isMinimized ? (
              <TooltipProvider>
                <Tooltip delayDuration={100}>
                  <TooltipTrigger>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="rounded-full"
                    >
                      <GearIcon />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Circle settings</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <Button variant="ghost" className="flex gap-3 w-full">
                <span>Circle settings</span>
                <span>
                  <GearIcon />
                </span>
              </Button>
            )
          }
        />
      </div>
    </div>
  );
};
