"use client";

import { AvatarIcon } from "@radix-ui/react-icons";

import { Routes, getLinkForTopic } from "@/routes";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCallback, useState } from "react";
import { Circle } from "@prisma/client";
import { useSelf } from "@/components/auth/self-provider";
import { toast } from "@/components/ui/use-toast";
import { SocketEvent, useSocketHandler } from "@/components/socket/use-socket";
import { ToastAction } from "@/components/ui/toast";
import { useRouter } from "next/navigation";

type Props = {
  currentCircleId?: string;
  existingCircles?: Circle[];
};

type NewCircleHandlerProps = Circle & {
  isEdit: boolean;
  members: string[];
  createdBy: {
    name: string;
    id: string;
  };
};

export function CirclesList({ existingCircles, currentCircleId }: Props) {
  const self = useSelf();
  const router = useRouter();
  const [circles, setCircles] = useState(existingCircles);

  const createdCircleProcessedHandler = useCallback(
    (payload: NewCircleHandlerProps) => {
      const createdBySelf = payload.createdBy.id === self.id;

      setCircles((circles) => {
        const _circles = circles ?? [];

        if (payload.isEdit) {
          return _circles.map((c) => {
            if (c.id !== payload.id) return c;
            return payload;
          });
        }

        return [..._circles, payload];
      });

      if (payload.isEdit && createdBySelf) {
        return;
      }

      toast({
        title: payload.isEdit ? "Circle updated" : `New circle created`,
        description: createdBySelf
          ? `You created a new circle called "${payload.name}"`
          : `${payload.createdBy.name} invited you to a new circle called "${payload.name}"`,
        duration: 10000,
        action: (
          <ToastAction
            altText="Go there now"
            onClick={() => {
              router.push(
                getLinkForTopic(payload.defaultTopicId ?? payload.id)
              );
            }}
          >
            Go there now
          </ToastAction>
        ),
      });
    },
    [self.id, router]
  );

  useSocketHandler<NewCircleHandlerProps>(
    SocketEvent.CreatedCircle,
    createdCircleProcessedHandler
  );

  return (
    <>
      {circles?.map((circle) => {
        const link = circle.defaultTopicId
          ? getLinkForTopic(circle.defaultTopicId)
          : Routes.TopicsForCircle.replace(":id", circle.id);

        return (
          <TooltipProvider key={circle.id}>
            <Tooltip delayDuration={100}>
              <TooltipTrigger>
                <Link href={link}>
                  <Avatar
                    className={`hover:opacity-80 ${
                      currentCircleId === circle.id
                        ? "border shadow-[0_0_1px_white,inset_0_0_1px_white,0_0_2px_#9333ea,0_0_5px_#9333ea,0_0_10px_#9333ea]"
                        : "shadow-md"
                    }`}
                  >
                    <AvatarImage
                      src={circle.imageUrl ?? undefined}
                      alt={circle.name}
                    />
                    <AvatarFallback>
                      <AvatarIcon height={22} width={22} />
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
