"use client";

import keyBy from "lodash.keyby";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Badge } from "@/components/ui/badge";
import {
  CircleMember,
  useCurrentTopicContext,
} from "@/components/topics/current-topic-provider";
import { useActiveCircleMembers } from "@/components/dashboard/active-circle-members-store";

type MemberProps = {
  id: string;
  name: string;
  isOnline: boolean;
  imageUrl: string;
  isAdmin: boolean;
  createdAt?: Date;
  status?: string;
  lastStatusUpdate?: Date;
};

function Member(props: MemberProps) {
  const { topicId } = useCurrentTopicContext();

  return (
    <div
      className={`flex gap-3 items-center ${
        props.isOnline ? "" : "opacity-40"
      }`}
    >
      <div className="relative">
        <UserAvatar
          id={props.id}
          topicId={topicId}
          name={props.name}
          imageUrl={props.imageUrl}
          variant={props.isOnline ? "default" : "idle"}
          status={props.status}
          lastStatusUpdate={props.lastStatusUpdate}
          createdAt={props.createdAt}
        />
        {!props.status && (
          <div
            className={`absolute right-0 bottom-1.5 rounded-full h-3 w-3 border ${
              props.isOnline ? "bg-green-600" : "bg-slate-400"
            }`}
          />
        )}
      </div>

      <div>{props.name}</div>
      <div className="ml-auto">
        <Badge variant="secondary">{props.isAdmin ? "Admin" : "Member"}</Badge>
      </div>
    </div>
  );
}

type MembersWithStatus = (CircleMember & { isCreator: boolean })[];

export function CircleMembersList() {
  const { circleMembers, circleId } = useCurrentTopicContext();
  const { topicMap } = useActiveCircleMembers();
  const allActiveMembers = topicMap
    ? keyBy(
        Object.values(topicMap).flatMap(({ activeUsers }) => activeUsers),
        "id"
      )
    : {};

  const onlineMembers: MembersWithStatus = [];
  const offlineMembers: MembersWithStatus = [];

  circleMembers.forEach((u) => {
    const isCreator = u.createdCircles.some(({ id }) => id === circleId);
    const isOnline = Boolean(allActiveMembers[u.id]);

    const user = {
      ...u,
      isCreator,
    };

    if (isOnline) {
      onlineMembers.push(user);
    } else {
      offlineMembers.push(user);
    }
  });

  const sortedOnlineMembers = [...onlineMembers].sort((user) => {
    if (user.isCreator) return -1;

    return 1;
  });

  return (
    <div className="px-3 pb-3 flex flex-col gap-3">
      <div className="text-sm flex items-center gap-1">
        Online ({sortedOnlineMembers.length})
      </div>
      {sortedOnlineMembers.map((user) => {
        return (
          <Member
            key={user.id}
            id={user.id}
            name={user.name ?? ""}
            imageUrl={user.imageUrl ?? ""}
            isOnline
            isAdmin={user.isCreator}
            createdAt={user.createdAt}
            status={user.status ?? undefined}
          />
        );
      })}

      <div className="text-sm mt-4">Offline ({offlineMembers.length})</div>
      {offlineMembers.map((user) => {
        return (
          <Member
            key={user.id}
            id={user.id}
            name={user.name ?? ""}
            imageUrl={user.imageUrl ?? ""}
            isOnline={false}
            isAdmin={user.isCreator}
            createdAt={user.createdAt}
            status={user.status ?? undefined}
          />
        );
      })}
    </div>
  );
}
