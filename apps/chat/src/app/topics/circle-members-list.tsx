"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useCurrentTopicContext } from "@/topics/current-topic-provider";
import { getInitials } from "@/topics/message";

export function CircleMembersList() {
  const { circleMembers, circleId } = useCurrentTopicContext();

  return (
    <div className="px-3 flex flex-col gap-3">
      {[...circleMembers].reverse().map((user) => {
        const isCreator = user.createdCircles.some(({ id }) => id === circleId);

        return (
          <div key={user.id} className="flex gap-3 items-center">
            <Avatar className="shadow-md">
              <AvatarImage
                className="rounded-full"
                src={user.imageUrl ?? undefined}
              />
              <AvatarFallback>
                {getInitials(user.name ?? undefined)}
              </AvatarFallback>
            </Avatar>
            <div>{user.name}</div>
            <div className="ml-auto">
              <Badge variant="secondary">
                {isCreator ? "Admin" : "Member"}
              </Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
}
