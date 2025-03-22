"use client";

import { useState } from "react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { SocketEvent, useSocketHandler } from "@/components/socket/use-socket";
import { useActiveCircleMembers } from "@/components/dashboard/active-circle-members-store";

type Props = {
  topicId: string;
};

type ActivityPayload = { userId: string };

export function TopicActiveUsers(props: Props) {
  const { getActiveMembersInTopic } = useActiveCircleMembers();
  const activeUsers = getActiveMembersInTopic(props.topicId);
  const [idleMap, setIdleMap] = useState<Record<string, boolean>>({});
  const [typingMap, setTypingMap] = useState<Record<string, boolean>>({});

  useSocketHandler<ActivityPayload>(SocketEvent.UserTabFocused, (payload) => {
    setIdleMap({
      ...idleMap,
      [payload.userId]: false,
    });
  });

  useSocketHandler<ActivityPayload>(SocketEvent.UserTabBlurred, (payload) => {
    setIdleMap({
      ...idleMap,
      [payload.userId]: true,
    });
  });

  useSocketHandler<ActivityPayload>(
    SocketEvent.UserStartedTyping,
    (payload) => {
      setTypingMap({
        ...typingMap,
        [payload.userId]: true,
      });
    }
  );

  useSocketHandler<ActivityPayload>(
    SocketEvent.UserStoppedTyping,
    (payload) => {
      setTypingMap({
        ...typingMap,
        [payload.userId]: false,
      });
    }
  );

  return (
    <div className="flex gap-2">
      {activeUsers.map((user) => {
        const variant = () => {
          if (
            typingMap[user.id] ||
            (user.state.isTyping && typingMap[user.id] !== false)
          ) {
            return "typing";
          }

          if (
            idleMap[user.id] ||
            (user.state.isIdle && idleMap[user.id] !== false)
          ) {
            return "idle";
          }

          return "default";
        };

        return (
          <UserAvatar
            size="sm"
            key={user.id}
            id={user.id}
            name={user.name}
            imageUrl={user.imageUrl}
            createdAt={user.createdAt}
            variant={variant()}
            topicId={props.topicId}
            status={user.status}
            lastStatusUpdate={user.lastStatusUpdate ?? undefined}
          />
        );
      })}
    </div>
  );
}
