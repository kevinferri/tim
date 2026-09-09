"use client";

import keyBy from "lodash.keyby";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Badge } from "@/components/ui/badge";
import {
  CircleMember,
  useTopicMetaContext,
} from "@/components/topics/current-topic-provider";
import { useActiveCircleMembers } from "@/components/dashboard/active-circle-members-store";

type MemberProps = {
  id: string;
  name: string;
  isOnline: boolean;
  imageUrl: string;
  isAdmin: boolean;
  createdAt?: Date;
  status: string | null;
  lastStatusUpdate: Date | null;
};

function Member(props: MemberProps) {
  const { topicId } = useTopicMetaContext();

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
          isOnline={props.isOnline}
        />
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
  const { circleMembers, circleId } = useTopicMetaContext();
  const { getActiveMembersInCircle } = useActiveCircleMembers();
  const allActiveMembers = keyBy(getActiveMembersInCircle(circleId), "id");

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
            status={user.status}
            lastStatusUpdate={user.lastStatusUpdate}
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
            status={user.status}
            lastStatusUpdate={user.lastStatusUpdate}
          />
        );
      })}
    </div>
  );
}
