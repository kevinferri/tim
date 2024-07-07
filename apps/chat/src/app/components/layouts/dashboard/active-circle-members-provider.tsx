"use client";

import { Self } from "@/components/auth/self-provider";
import { SocketEvent, useSocketHandler } from "@/components/socket/use-socket";
import { useDebounce } from "@/lib/hooks";
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
type TopicMap = Record<string, { activeUsers: Self[]; circleId: string }>;

function useContextValue() {
  const [topicMap, setTopicMap] =
    useState<Record<string, { activeUsers: Self[]; circleId: string }>>();

  const debounced = useDebounce(topicMap, 200);

  const getActiveMembersInTopic = useCallback(
    (topicId: string) => topicMap?.[topicId]?.activeUsers ?? [],
    [topicMap]
  );

  useSocketHandler<{
    topicMap: TopicMap;
  }>(SocketEvent.UserJoinedCircle, (payload) => {
    setTopicMap({
      ...topicMap,
      ...payload.topicMap,
    });
  });

  useSocketHandler<{ activeUsers: User[]; topicId: string; circleId: string }>(
    SocketEvent.UserJoinedOrLeftTopic,
    (payload) => {
      if (!topicMap) return;

      setTopicMap({
        ...topicMap,
        [payload.topicId]: {
          ...topicMap[payload.topicId],
          circleId: payload.circleId,
          activeUsers: uniqBy(payload.activeUsers, "id"),
        },
      });
    }
  );

  return useMemo(
    () => ({
      topicMap: debounced,
      getActiveMembersInTopic,
    }),
    [debounced, getActiveMembersInTopic]
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
