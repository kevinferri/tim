"use client";

import { useMemo } from "react";
import uniqBy from "lodash.uniqby";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Circle } from "@prisma/client";
import { Self, useSelf } from "@/components/auth/self-provider";
import { toast } from "@/components/ui/use-toast";
import {
  SocketEvent,
  useSocketEmit,
  useSocketHandler,
} from "@/components/socket/use-socket";
import { ToastAction } from "@/components/ui/toast";
import { useParams, useRouter } from "next/navigation";
import { getInitials, UserAvatar } from "@/components/ui/user-avatar";
import { useActiveCircleMembers } from "@/components/dashboard/active-circle-members-store";
import { Routes } from "@/routes";

type Props = {
  existingCircles?: Circle[];
};

type NewCircleHandlerProps = {
  id: string;
  defaultTopicId?: string;
  name: string;
  isEdit: boolean;
  prevMembers: string[];
  members: string[];
  createdBy: {
    name: string;
    id: string;
  };
};

type DeletedCircleHandlerProps = {
  id: string;
  name: string;
  members: string[];
  deletedBy: {
    name: string;
    id: string;
  };
};

export function CirclesList(props: Props) {
  const self = useSelf();
  const router = useRouter();
  const params = useParams();
  const joinRoom = useSocketEmit(SocketEvent.JoinRoom);
  const leaveRoom = useSocketEmit(SocketEvent.LeaveRoom);
  const { topicMap } = useActiveCircleMembers();

  const activeMembersByCircle = useMemo(() => {
    if (!topicMap) return undefined;

    return Object.values(topicMap).reduce(
      (acc, { circleId, activeUsers }) => ({
        ...acc,
        [circleId]: uniqBy([...(acc[circleId] ?? []), ...activeUsers], "id"),
      }),
      {} as Record<string, Self[]>,
    );
  }, [topicMap]);

  useSocketHandler<NewCircleHandlerProps>(
    SocketEvent.UpsertedCircle,
    (payload) => {
      router.refresh();

      const createdBySelf = payload.createdBy.id === self.id;
      const name = createdBySelf ? "You" : payload.createdBy.name;
      const isInCircle = payload.members.includes(self.id);
      const wasInCircle = payload.prevMembers.includes(self.id);
      const link = `/circles/${payload.id}/topics/${payload.defaultTopicId}`;

      if (payload.isEdit && createdBySelf) return;

      if (wasInCircle && !isInCircle) {
        leaveRoom.emit({ id: payload.id, roomType: "circle" });
        return;
      }

      if (!payload.isEdit || (isInCircle && !wasInCircle)) {
        joinRoom.emit({ id: payload.id, roomType: "circle" });

        toast({
          title: `New circle created`,
          description: `${name} created a new circle called "${payload.name}"`,
          action: (
            <ToastAction
              altText="Go there now"
              onClick={() => {
                router.push(link);
              }}
            >
              Go there now
            </ToastAction>
          ),
        });
      }
    },
  );

  useSocketHandler<DeletedCircleHandlerProps>(
    SocketEvent.DeletedCircle,
    (payload) => {
      leaveRoom.emit({ id: payload.id, roomType: "circle" });

      const deletedBySelf = payload.deletedBy.id === self.id;
      const name = deletedBySelf ? "You" : payload.deletedBy.name;

      toast({
        title: `Circle deleted`,
        description: `${name} deleted the circle called "${payload.name}"`,
      });

      if (payload.id === params.circleId) {
        router.push(Routes.Home);
      }

      router.refresh();
    },
  );

  return (
    <>
      {props.existingCircles?.map((circle) => {
        const activeUsers = activeMembersByCircle?.[circle.id] ?? [];

        return (
          <TooltipProvider key={circle.id}>
            <Tooltip delayDuration={100}>
              <TooltipTrigger>
                <Link
                  href={`/circles/${circle.id}/topics/${circle.defaultTopicId}`}
                  className="relative"
                >
                  <Avatar
                    className={`active:border ${
                      params.circleId === circle.id
                        ? "border shadow-[0_0_1px_white,inset_0_0_1px_white,0_0_2px_#9333ea,0_0_5px_#9333ea,0_0_10px_#9333ea]"
                        : "shadow-lg hover:opacity-80"
                    }`}
                  >
                    <AvatarImage
                      src={circle.imageUrl ?? undefined}
                      alt={circle.name}
                    />
                    <AvatarFallback>
                      <div className="mt-[1.5px]">
                        {getInitials(circle.name)}
                      </div>
                    </AvatarFallback>
                  </Avatar>
                  {activeUsers.length > 0 && (
                    <div
                      style={{
                        position: "absolute",
                        top: "-4px",
                        right: "-4px",
                      }}
                      className="border w-[16px] h-[16px] text-[10px] rounded-full bg-purple-500 text-slate-100 flex items-center justify-center"
                    >
                      {activeUsers.length}
                    </div>
                  )}
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="p-2" sideOffset={8}>
                <div className="flex flex-col gap-2">
                  <div className="text-sm leading-none">{circle.name}</div>
                  {activeUsers.length > 0 && (
                    <div className="flex gap-1">
                      {activeUsers.map((user) => {
                        return (
                          <UserAvatar
                            size="xs"
                            showStatus={false}
                            key={user.id}
                            id={user.id}
                            name={user.name}
                            imageUrl={user.imageUrl}
                            createdAt={user.createdAt}
                            status={user.status}
                            lastStatusUpdate={user.lastStatusUpdate}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </>
  );
}
