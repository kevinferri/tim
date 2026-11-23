"use client";

import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

type Store = {
  unreadTopics: Record<string, boolean>;
  unreadCircles: Record<string, boolean>;
  // Circles flagged on the client (lit live or visited); server snapshots can lag them, so hydrating skips them.
  clientOwnedCircles: Record<string, boolean>;
  markTopicAsUnread: (topicId: string) => void;
  markTopicAsRead: (topicId: string) => void;
  hydrateUnreadTopics: (unreadTopics: Record<string, boolean>) => void;
  hydrateUnreadCircles: (unreadCircles: Record<string, boolean>) => void;
  setCircleUnread: (circleId: string, isUnread: boolean) => void;
};

export const useUnreadStore = create<Store>((set) => ({
  unreadTopics: {},
  unreadCircles: {},
  clientOwnedCircles: {},
  hydrateUnreadTopics: (unreadTopics: Record<string, boolean>) =>
    set(() => ({
      unreadTopics,
    })),
  hydrateUnreadCircles: (serverUnread: Record<string, boolean>) =>
    set((state) => {
      const unreadCircles: Record<string, boolean> = {};
      for (const circleId of Object.keys(serverUnread)) {
        if (!state.clientOwnedCircles[circleId]) unreadCircles[circleId] = true;
      }
      for (const circleId of Object.keys(state.clientOwnedCircles)) {
        if (state.unreadCircles[circleId]) unreadCircles[circleId] = true;
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
        clientOwnedCircles: { ...state.clientOwnedCircles, [circleId]: true },
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
