"use client";

import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

type Store = {
  unreadTopics: Record<string, boolean>;
  markTopicAsUnread: (topicId: string) => void;
  markTopicAsRead: (topicId: string) => void;
  hydrateUnreadTopics: (unreadTopics: Record<string, boolean>) => void;
};

const useStore = create<Store>((set) => ({
  unreadTopics: {},
  hydrateUnreadTopics: (unreadTopics: Record<string, boolean>) =>
    set(() => ({
      unreadTopics,
    })),
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
