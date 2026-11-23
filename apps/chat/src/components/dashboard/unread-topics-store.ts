"use client";

import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

type Store = {
  unreadTopics: Record<string, boolean>;
  unreadCircles: Record<string, boolean>;
  markTopicAsUnread: (topicId: string) => void;
  markTopicAsRead: (topicId: string) => void;
  hydrateUnreadTopics: (unreadTopics: Record<string, boolean>) => void;
  hydrateUnreadCircles: (unreadCircles: Record<string, boolean>) => void;
  setCircleUnread: (circleId: string, isUnread: boolean) => void;
};

const useStore = create<Store>((set) => ({
  unreadTopics: {},
  unreadCircles: {},
  hydrateUnreadTopics: (unreadTopics: Record<string, boolean>) =>
    set(() => ({
      unreadTopics,
    })),
  hydrateUnreadCircles: (unreadCircles: Record<string, boolean>) =>
    set(() => ({
      unreadCircles,
    })),
  setCircleUnread: (circleId: string, isUnread: boolean) =>
    set((state) => {
      if (Boolean(state.unreadCircles[circleId]) === isUnread) return state;
      const tmp = { ...state.unreadCircles };
      if (isUnread) tmp[circleId] = true;
      else delete tmp[circleId];

      return { unreadCircles: tmp };
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
  const unreadTopics = useStore(useShallow((state) => state.unreadTopics));
  const markTopicAsRead = useStore((state) => state.markTopicAsRead);
  const markTopicAsUnread = useStore((state) => state.markTopicAsUnread);
  const hydrateUnreadTopics = useStore((state) => state.hydrateUnreadTopics);

  return {
    unreadTopics,
    markTopicAsUnread,
    markTopicAsRead,
    hydrateUnreadTopics,
  };
}

export function useUnreadCircles() {
  const unreadCircles = useStore(useShallow((state) => state.unreadCircles));
  const hydrateUnreadCircles = useStore((state) => state.hydrateUnreadCircles);
  const setCircleUnread = useStore((state) => state.setCircleUnread);

  return { unreadCircles, hydrateUnreadCircles, setCircleUnread };
}
