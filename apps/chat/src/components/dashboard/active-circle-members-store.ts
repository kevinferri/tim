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
  // Our own optimistically-added entry for a topic, kept until a server
  // snapshot confirms it -- see mergeIncomingUsers below.
  pendingSelf: Record<string, ActiveUser>;
  mergeCircleSnapshot: (topicMap: TopicMap) => void;
  setTopicPresence: (topicId: string, presence: TopicPresence) => void;
  addSelfToTopic: (topicId: string, circleId: string, self: ActiveUser) => void;
  removeSelfFromTopic: (topicId: string, selfId: string) => void;
  removeTopic: (topicId: string) => void;
};

// Keeps existing users in their existing positions (only appending ones the
// client hasn't seen before) rather than snapping to the server's array
// order on every update. `pending`, if given and absent from `incoming`, is
// held over rather than dropped -- the server snapshot that raced ahead of
// our own room:join hasn't seen us yet, not evidence we left.
function mergeIncomingUsers(
  existing: ActiveUser[],
  incoming: ActiveUser[],
  pending?: ActiveUser,
): ActiveUser[] {
  const incomingById = new Map(incoming.map((user) => [user.id, user]));
  const keepIds = new Set(incomingById.keys());
  if (pending) keepIds.add(pending.id);

  const merged = existing
    .filter((user) => keepIds.has(user.id))
    .map((user) => incomingById.get(user.id) ?? user);

  const seenIds = new Set(merged.map((user) => user.id));
  for (const user of incoming) {
    if (!seenIds.has(user.id)) {
      merged.push(user);
      seenIds.add(user.id);
    }
  }

  return merged;
}

const useStore = create<Store>((set) => ({
  topicMap: {},
  pendingSelf: {},

  mergeCircleSnapshot: (topicMap) =>
    set((state) => {
      const merged = { ...state.topicMap };
      const pendingSelf = { ...state.pendingSelf };

      for (const [topicId, presence] of Object.entries(topicMap)) {
        const pending = pendingSelf[topicId];
        merged[topicId] = {
          circleId: presence.circleId,
          activeUsers: mergeIncomingUsers(
            merged[topicId]?.activeUsers ?? [],
            presence.activeUsers,
            pending,
          ),
        };
        if (pending && presence.activeUsers.some((u) => u.id === pending.id)) {
          delete pendingSelf[topicId];
        }
      }

      return { topicMap: merged, pendingSelf };
    }),

  setTopicPresence: (topicId, presence) =>
    set((state) => {
      const pending = state.pendingSelf[topicId];
      const stillPending =
        pending && !presence.activeUsers.some((u) => u.id === pending.id);

      const pendingSelf = { ...state.pendingSelf };
      if (!stillPending) delete pendingSelf[topicId];

      return {
        pendingSelf,
        topicMap: {
          ...state.topicMap,
          [topicId]: {
            circleId: presence.circleId,
            activeUsers: mergeIncomingUsers(
              state.topicMap[topicId]?.activeUsers ?? [],
              presence.activeUsers,
              pending,
            ),
          },
        },
      };
    }),

  addSelfToTopic: (topicId, circleId, self) =>
    set((state) => {
      const existing = state.topicMap[topicId];
      const alreadyPresent = existing?.activeUsers.some(
        (u) => u.id === self.id,
      );

      return {
        pendingSelf: { ...state.pendingSelf, [topicId]: self },
        topicMap: {
          ...state.topicMap,
          [topicId]: {
            circleId: existing?.circleId ?? circleId,
            activeUsers: alreadyPresent
              ? existing.activeUsers
              : [...(existing?.activeUsers ?? []), self],
          },
        },
      };
    }),

  removeSelfFromTopic: (topicId, selfId) =>
    set((state) => {
      const pendingSelf = { ...state.pendingSelf };
      delete pendingSelf[topicId];

      const existing = state.topicMap[topicId];
      if (!existing) return { pendingSelf };

      return {
        pendingSelf,
        topicMap: {
          ...state.topicMap,
          [topicId]: {
            ...existing,
            activeUsers: existing.activeUsers.filter((u) => u.id !== selfId),
          },
        },
      };
    }),

  removeTopic: (topicId) =>
    set((state) => {
      if (!(topicId in state.topicMap)) return state;

      const topicMap = { ...state.topicMap };
      delete topicMap[topicId];

      const pendingSelf = { ...state.pendingSelf };
      delete pendingSelf[topicId];

      return { topicMap, pendingSelf };
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

export function useAddSelfToTopic() {
  return useStore((state) => state.addSelfToTopic);
}

export function useRemoveSelfFromTopic() {
  return useStore((state) => state.removeSelfFromTopic);
}

// Exported for direct store-level testing (see active-circle-members-store.test.ts)
// -- components should use the selector hooks above instead.
export { useStore as __useActiveCircleMembersStore };

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
