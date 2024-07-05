"use client";

import { Self } from "@/components/auth/self-provider";
import { SocketEvent, useSocketHandler } from "@/components/socket/use-socket";
import { User } from "@prisma/client";
import uniqBy from "lodash.uniqby";
import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
} from "react";

const ActiveCircleMembersContext = createContext<ReturnType<
  typeof useContextValue
> | null>(null);

type Props = { children: React.ReactNode };

function useContextValue() {
  const [activeMembersByTopic, setActiveMembersByTopic] =
    useState<Record<string, Self[]>>();

  const getActiveMembersInTopic = useCallback(
    (topicId: string) => activeMembersByTopic?.[topicId] ?? [],
    [activeMembersByTopic]
  );

  // When a user joines a circle, hydrate all existing active sockets for each topic
  useSocketHandler<{
    topicMap: Record<string, Self[]>;
    actingUser: Self;
    circleId: string;
  }>(SocketEvent.UserJoinedCircle, (payload) => {
    setActiveMembersByTopic({
      ...activeMembersByTopic,
      ...payload.topicMap,
    });
  });

  useSocketHandler<{ activeUsers: User[]; actingUser: User; topicId: string }>(
    SocketEvent.UserJoinedOrLeftTopic,
    (payload) => {
      setActiveMembersByTopic({
        ...activeMembersByTopic,
        [payload.topicId]: uniqBy(payload.activeUsers, "id"),
      });
    }
  );

  return useMemo(
    () => ({
      activeMembersByTopic,
      getActiveMembersInTopic,
    }),
    [activeMembersByTopic, getActiveMembersInTopic]
  );
}

export function ActiveCircleMembersProvider({ children }: Props) {
  const contextValue = useContextValue();

  return (
    <ActiveCircleMembersContext.Provider value={contextValue}>
      {children}
    </ActiveCircleMembersContext.Provider>
  );
}

export function useActiveCircleMembers() {
  const context = useContext(ActiveCircleMembersContext);

  if (!context) {
    throw new Error(
      "useActiveCircleMembers must be used inside ActiveCircleMembersProvider"
    );
  }

  return context;
}
