"use client";

import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import uniqBy from "lodash.uniqby";
import { User } from "@prisma/client";
import { Self } from "@/components/auth/self-provider";
import { SocketEvent, useSocketHandler } from "@/components/socket/use-socket";
import { useDebounce } from "@/lib/hooks";

type TopicMap = Record<string, { activeUsers: Self[]; circleId: string }>;

type Store = {
  topicMap: TopicMap;
  setTopicMap: (topicMap: TopicMap) => void;
};

const useStore = create<Store>((set) => ({
  topicMap: {},
  setTopicMap: (topicMap: TopicMap) => set(() => ({ topicMap })),
}));

export function useActiveCircleMembers() {
  const topicMap = useStore(useShallow((state) => state.topicMap));
  const setTopicMap = useStore((state) => state.setTopicMap);
  const debounced = useDebounce(topicMap, 250);
  const getActiveMembersInTopic = (topicId: string) =>
    topicMap?.[topicId]?.activeUsers ?? [];

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

  return { topicMap: debounced, getActiveMembersInTopic };
}
