"use client";

import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

// Long enough to outlast one refresh round trip, the only window in which a server snapshot can be staler than the client.
export const CLIENT_FLAG_GRACE_MS = 10_000;

type Store = {
  unreadTopics: Record<string, boolean>;
  unreadCircles: Record<string, boolean>;
  // When the client last set each circle's flag (lit live, or synced from its topics).
  circleFlaggedAt: Record<string, number>;
  markTopicAsUnread: (topicId: string) => void;
  markTopicAsRead: (topicId: string) => void;
  hydrateUnreadTopics: (unreadTopics: Record<string, boolean>) => void;
  hydrateUnreadCircles: (
    serverUnread: Record<string, boolean>,
    currentCircleId?: string,
  ) => void;
  setCircleUnread: (circleId: string, isUnread: boolean) => void;
};

export const useUnreadStore = create<Store>((set) => ({
  unreadTopics: {},
  unreadCircles: {},
  circleFlaggedAt: {},
  hydrateUnreadTopics: (unreadTopics: Record<string, boolean>) =>
    set(() => ({
      unreadTopics,
    })),
  // The server's copy wins, except for the current circle (it counts the topic you're in) and circles the client flagged too recently for the snapshot to have seen.
  hydrateUnreadCircles: (serverUnread, currentCircleId) =>
    set((state) => {
      const now = Date.now();
      const keepsClientFlag = (circleId: string) =>
        circleId === currentCircleId ||
        now - (state.circleFlaggedAt[circleId] ?? -Infinity) <
          CLIENT_FLAG_GRACE_MS;

      const unreadCircles: Record<string, boolean> = {};
      for (const circleId of Object.keys(serverUnread)) {
        if (!keepsClientFlag(circleId)) unreadCircles[circleId] = true;
      }
      for (const circleId of Object.keys(state.unreadCircles)) {
        if (keepsClientFlag(circleId)) unreadCircles[circleId] = true;
      }

      return { unreadCircles };
    }),
  setCircleUnread: (circleId: string, isUnread: boolean) =>
    set((state) => {
      const unreadCircles = { ...state.unreadCircles };
      if (isUnread) unreadCircles[circleId] = true;
      else delete unreadCircles[circleId];

      return {
        unreadCircles,
        circleFlaggedAt: { ...state.circleFlaggedAt, [circleId]: Date.now() },
      };
    }),
  markTopicAsUnread: (topicId: string) =>
    set((state) => ({
      unreadTopics: { ...state.unreadTopics, [topicId]: true },
    })),
  markTopicAsRead: (topicId: string) =>
    set((state) => {
      const tmp = { ...state.unreadTopics };
      delete tmp[topicId];

      return {
        unreadTopics: tmp,
      };
    }),
}));

export function useUnreadTopics() {
  const unreadTopics = useUnreadStore(
    useShallow((state) => state.unreadTopics),
  );
  const markTopicAsRead = useUnreadStore((state) => state.markTopicAsRead);
  const markTopicAsUnread = useUnreadStore((state) => state.markTopicAsUnread);
  const hydrateUnreadTopics = useUnreadStore(
    (state) => state.hydrateUnreadTopics,
  );

  return {
    unreadTopics,
    markTopicAsUnread,
    markTopicAsRead,
    hydrateUnreadTopics,
  };
}

export function useUnreadCircles() {
  const unreadCircles = useUnreadStore(
    useShallow((state) => state.unreadCircles),
  );
  const hydrateUnreadCircles = useUnreadStore(
    (state) => state.hydrateUnreadCircles,
  );
  const setCircleUnread = useUnreadStore((state) => state.setCircleUnread);

  return { unreadCircles, hydrateUnreadCircles, setCircleUnread };
}
