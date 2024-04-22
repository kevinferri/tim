import { prismaClient } from "@/lib/prisma/client";
import { Routes } from "@/routes";
import { UpsertCircleForm } from "@/circles/upsert-circle-form";
import Link from "next/link";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserDropDown } from "@/components/ui/user-dropdown";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { CirclesList } from "@/circles/circles-list";

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
      <div className="flex flex-col items-center px-3 py-2">
        <Link href={Routes.Home} className="hover:opacity-80">
          <Avatar className="h-8 w-8">
            <AvatarImage src="/assets/logo.svg" />
          </Avatar>
        </Link>
      </div>

      <ScrollArea>
        <div className="flex flex-col gap-3 p-3">
          <CirclesList existingCircles={circles} currentCircleId={circleId} />
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
