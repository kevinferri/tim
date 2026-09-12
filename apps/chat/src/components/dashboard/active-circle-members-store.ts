"use client";

import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import uniqBy from "lodash.uniqby";
import { Self } from "@/components/auth/self-provider";
import { SocketEvent, useSocketHandler } from "@/components/socket/use-socket";

export type ActiveUser = Self & {
  state: { isIdle: boolean; isTyping: boolean };
};

type TopicPresence = { activeUsers: ActiveUser[]; circleId: string };
type TopicMap = Record<string, TopicPresence>;

type Store = {
  topicMap: TopicMap;
  mergeCircleSnapshot: (topicMap: TopicMap) => void;
  setTopicPresence: (topicId: string, presence: TopicPresence) => void;
  removeTopic: (topicId: string) => void;
};

const useStore = create<Store>((set) => ({
  topicMap: {},

  mergeCircleSnapshot: (topicMap) =>
    set((state) => ({ topicMap: { ...state.topicMap, ...topicMap } })),

  setTopicPresence: (topicId, presence) =>
    set((state) => ({
      topicMap: {
        ...state.topicMap,
        [topicId]: {
          ...presence,
          activeUsers: uniqBy(presence.activeUsers, "id"),
        },
      },
    })),

  removeTopic: (topicId) =>
    set((state) => {
      if (!(topicId in state.topicMap)) return state;

      const topicMap = { ...state.topicMap };
      delete topicMap[topicId];
      return { topicMap };
    }),
}));

// Mount exactly once near the socket root -- per-component subscriptions used to mean redundant listeners, and one mounting after the server's initial snapshot would miss it for good since socket.io doesn't replay past events.
export function usePresenceSync() {
  const mergeCircleSnapshot = useStore((state) => state.mergeCircleSnapshot);
  const setTopicPresence = useStore((state) => state.setTopicPresence);
  const removeTopic = useStore((state) => state.removeTopic);

  useSocketHandler<{ topicMap: TopicMap }>(
    SocketEvent.UserJoinedCircle,
    (payload) => mergeCircleSnapshot(payload.topicMap),
  );

  useSocketHandler<{
    activeUsers: ActiveUser[];
    topicId: string;
    circleId: string;
  }>(SocketEvent.UserJoinedOrLeftTopic, (payload) =>
    setTopicPresence(payload.topicId, {
      circleId: payload.circleId,
      activeUsers: payload.activeUsers,
    }),
  );

  // mergeCircleSnapshot/setTopicPresence only ever add or overwrite keys, so a deleted topic's stale entry would otherwise never leave topicMap.
  useSocketHandler<{ id: string }>(SocketEvent.DeletedTopic, (payload) =>
    removeTopic(payload.id),
  );
}

export function useActiveCircleMembers() {
  const topicMap = useStore(useShallow((state) => state.topicMap));

  const getActiveMembersInTopic = (topicId: string) =>
    topicMap[topicId]?.activeUsers ?? [];

  const getActiveMembersInCircle = (circleId: string) =>
    uniqBy(
      Object.values(topicMap)
        .filter((topic) => topic.circleId === circleId)
        .flatMap((topic) => topic.activeUsers),
      "id",
    );

  const getAllActiveMembers = () =>
    uniqBy(
      Object.values(topicMap).flatMap((topic) => topic.activeUsers),
      "id",
    );

  const getCircleIdsFromTopicMap = () =>
    Array.from(new Set(Object.values(topicMap).map((topic) => topic.circleId)));

  return {
    topicMap,
    getActiveMembersInTopic,
    getActiveMembersInCircle,
    getAllActiveMembers,
    getCircleIdsFromTopicMap,
  };
}
