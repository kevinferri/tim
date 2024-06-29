"use client";

import { Routes, getLinkForTopic } from "@/routes";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Circle } from "@prisma/client";
import { useSelf } from "@/components/auth/self-provider";
import { toast } from "@/components/ui/use-toast";
import { SocketEvent, useSocketHandler } from "@/components/socket/use-socket";
import { ToastAction } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import { getInitials } from "@/components/shared/user-avatar";

type Props = {
  currentCircleId?: string;
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

  useSocketHandler<NewCircleHandlerProps>(
    SocketEvent.UpsertedCircle,
    (payload) => {
      router.refresh();

      const createdBySelf = payload.createdBy.id === self.id;
      const name = createdBySelf ? "You" : payload.createdBy.name;
      const link = payload.defaultTopicId
        ? getLinkForTopic(payload.defaultTopicId)
        : `/circles/${payload.id}`;

      if (payload.isEdit && createdBySelf) return;

      if (
        !payload.isEdit ||
        (payload.members.includes(self.id) &&
          !payload.prevMembers.includes(self.id))
      ) {
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
    }
  );

  useSocketHandler<DeletedCircleHandlerProps>(
    SocketEvent.DeletedCircle,
    (payload) => {
      router.refresh();

      const deletedBySelf = payload.deletedBy.id === self.id;
      const name = deletedBySelf ? "You" : payload.deletedBy.name;

      toast({
        title: `Circle deleted`,
        description: `${name} deleted the circle called "${payload.name}"`,
      });
    }
  );

  return (
    <>
      {props.existingCircles?.map((circle) => {
        const link = circle.defaultTopicId
          ? getLinkForTopic(circle.defaultTopicId)
          : Routes.TopicsForCircle.replace(":id", circle.id);

        return (
          <TooltipProvider key={circle.id}>
            <Tooltip delayDuration={100}>
              <TooltipTrigger>
                <Link href={link}>
                  <Avatar
                    className={`hover:opacity-70 ${
                      props.currentCircleId === circle.id
                        ? "border shadow-[0_0_1px_white,inset_0_0_1px_white,0_0_2px_#9333ea,0_0_5px_#9333ea,0_0_10px_#9333ea]"
                        : "shadow-md"
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
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">
                <div>{circle.name}</div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </>
  );
}
