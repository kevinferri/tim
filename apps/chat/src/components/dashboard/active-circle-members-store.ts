"use client";

import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import uniqBy from "lodash.uniqby";
import { Self } from "@/components/auth/self-provider";
import { SocketEvent, useSocketHandler } from "@/components/socket/use-socket";

export type ActiveUser = Self & { state: { isIdle: boolean; isTyping: boolean } };

type TopicPresence = { activeUsers: ActiveUser[]; circleId: string };
type TopicMap = Record<string, TopicPresence>;

type Store = {
  topicMap: TopicMap;
  mergeCircleSnapshot: (topicMap: TopicMap) => void;
  setTopicPresence: (topicId: string, presence: TopicPresence) => void;
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
}));

// Registers the presence socket listeners exactly once. Mount this a
// single time, near the socket root (see PresenceSync) -- previously
// every component that wanted presence data (circles list, topics list,
// members list, active-users row) called useSocketHandler itself, which
// meant up to four redundant listeners for the same events, and any of
// them mounting after the server's initial snapshot arrived would just
// miss it for good since socket.io doesn't replay past events. Reading
// presence is now decoupled from subscribing to it -- see
// useActiveCircleMembers below.
export function usePresenceSync() {
  const mergeCircleSnapshot = useStore((state) => state.mergeCircleSnapshot);
  const setTopicPresence = useStore((state) => state.setTopicPresence);

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
