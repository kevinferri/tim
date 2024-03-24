import { AvatarIcon } from "@radix-ui/react-icons";
import { prismaClient } from "@/lib/prisma/client";

import { Routes, getLinkForTopic } from "@/routes";
import {
  CreateCircleForm,
  UpsertCircleForm,
} from "@/circles/upsert-circle-form";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserDropDown } from "@/components/ui/user-dropdown";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export const CirclesNav = async ({ circleId }: { circleId?: string }) => {
  const user = await prismaClient.user.getLoggedIn({
    select: {
      id: true,
      imageUrl: true,
      email: true,
    },
  });

  const circles = await prismaClient.circle.getMeCircles({
    select: {
      id: true,
      name: true,
      defaultTopicId: true,
      imageUrl: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return (
    <div className="flex flex-col border-r">
      <div className="flex flex-col items-center p-2">
        <Link href={Routes.Home} className="hover:opacity-80">
          <Avatar className="h-8 w-8">
            <AvatarImage src="/assets/logo.svg" />
          </Avatar>
        </Link>
      </div>

      <ScrollArea>
        <div className="flex flex-col gap-3 p-3">
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
                          circleId === circle.id
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

          <UpsertCircleForm />
        </div>
      </ScrollArea>

      <div className="flex flex-col items-center mt-auto gap-3 p-3">
        <ThemeToggle />
        {user && (
          <UserDropDown
            avatarUrl={user.imageUrl ?? undefined}
            email={user.email ?? undefined}
          />
        )}
      </div>
    </div>
  );
};
