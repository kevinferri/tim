"use client";

import {
  createContext,
  useContext,
  useMemo,
  useCallback,
  MutableRefObject,
} from "react";
import { useRouter } from "next/navigation";
import { MessageProps, MessageData } from "@/components/topics/message";
import { useEffectOnce } from "@/lib/hooks/use-effect-once";
import { useState } from "react";
import { useTopicScroll } from "@/components/topics/provider/use-topic-scroll";
import { useTopicMessages } from "@/components/topics/provider/use-topic-messages";
import { useTopicHighlights } from "@/components/topics/provider/use-topic-highlights";
import { useTopicMedia } from "@/components/topics/provider/use-topic-media";
import { useTopicActivity } from "@/components/topics/provider/use-topic-activity";

export type CircleMember = {
  id: string;
  name: string | null;
  imageUrl: string | null;
  createdAt: Date;
  status: string | null;
  lastStatusUpdate: Date | null;
  createdCircles: {
    id: string;
  }[];
};

type ScrollArgs =
  | {
      timeout?: number;
      force?: boolean;
    }
  | undefined;

type ContextValue = {
  topicId: string;
  circleId: string;
  messages: MessageProps[];
  topHighlights: MessageProps[];
  mediaMessages: MessageProps[];
  circleMembers: CircleMember[];
  scrollRef: MutableRefObject<HTMLDivElement | null>;
  newestMessageRef: MutableRefObject<HTMLDivElement | null>;
  messagesListRef: MutableRefObject<HTMLDivElement | null>;
  scrollToBottomOfChat: (args?: ScrollArgs) => void;
  addShufflingGif: (id: string) => void;
  shufflingGifs: string[];
  loadMoreMessages: () => void;
  loadingMoreMessages: boolean;
  hasMoreMessages: boolean;
  loadMoreAnchorRef: MutableRefObject<HTMLDivElement | null>;
  loadMoreAnchorId?: string;
  blopSoundRef: MutableRefObject<HTMLAudioElement | null>;
  generatingCommand?: string;
  setGeneratingCommand: (command?: string) => void;
};

type Props = {
  topicId: string;
  circleId: string;
  topicName: string;
  circleName: string;
  existingMessages: MessageData[];
  existingTopHighlights: MessageData[];
  existingMediaMessages: MessageData[];
  existingCircleMembers: CircleMember[];
  topHighlightsLimit: number;
  messagesLimit: number;
  children: React.ReactNode;
};

const CurrentTopicContext = createContext<ContextValue | undefined>(undefined);

export function CurrentTopicProvider(props: Props) {
  const router = useRouter();
  const baseTitle = `${props.circleName} - ${props.topicName}`;
  const [generatingCommand, setGeneratingCommand] = useState<
    string | undefined
  >();
  const { scrollRef, newestMessageRef, messagesListRef, scrollToBottomOfChat } =
    useTopicScroll();

  const { blopSoundRef, notifyOnNewMessage } = useTopicActivity({
    topicId: props.topicId,
    baseTitle,
  });

  const onNewMessage = useCallback(() => {
    notifyOnNewMessage();
    scrollToBottomOfChat();
    setGeneratingCommand(undefined);
  }, [notifyOnNewMessage, scrollToBottomOfChat, setGeneratingCommand]);

  const { mediaMessages, setMediaMessages, shufflingGifs, addShufflingGif } =
    useTopicMedia({
      existingMediaMessages: props.existingMediaMessages,
      onMediaChange: undefined,
    });

  const onMediaMessage = useCallback(
    (message: MessageProps) => {
      setMediaMessages((prev) => [message, ...prev]);
    },
    [setMediaMessages]
  );

  const {
    messages,
    setMessages,
    loadMoreMessages,
    loadingMoreMessages,
    hasMoreMessages,
    loadMoreAnchorRef,
    loadMoreAnchorId,
  } = useTopicMessages({
    topicId: props.topicId,
    existingMessages: props.existingMessages,
    messagesLimit: props.messagesLimit,
    messagesListRef,
    onNewMessage,
    onMediaMessage,
  });

  const { topHighlights } = useTopicHighlights({
    topicId: props.topicId,
    existingTopHighlights: props.existingTopHighlights,
    topHighlightsLimit: props.topHighlightsLimit,
    onHighlightChange: (handler) => {
      setMessages((prev) => handler(prev));
      setMediaMessages((prev) => handler(prev));
    },
  });

  useEffectOnce(() => {
    router.refresh();
  });

  const circleMembers = useMemo(
    () => props.existingCircleMembers,
    [props.existingCircleMembers]
  );

  const contextValue = useMemo(
    () => ({
      messages,
      mediaMessages,
      circleMembers,
      scrollRef,
      messagesListRef,
      scrollToBottomOfChat,
      shufflingGifs,
      addShufflingGif,
      topHighlights,
      topicId: props.topicId,
      circleId: props.circleId,
      loadMoreMessages,
      loadingMoreMessages,
      hasMoreMessages,
      loadMoreAnchorRef,
      blopSoundRef,
      loadMoreAnchorId,
      newestMessageRef,
      generatingCommand,
      setGeneratingCommand,
    }),
    [
      messages,
      mediaMessages,
      circleMembers,
      shufflingGifs,
      addShufflingGif,
      topHighlights,
      props.topicId,
      props.circleId,
      scrollToBottomOfChat,
      loadMoreMessages,
      loadingMoreMessages,
      hasMoreMessages,
      loadMoreAnchorId,
      generatingCommand,
      setGeneratingCommand,
      scrollRef,
      messagesListRef,
      loadMoreAnchorRef,
      blopSoundRef,
      newestMessageRef,
    ]
  );

  return (
    <CurrentTopicContext.Provider value={contextValue}>
      {props.children}
    </CurrentTopicContext.Provider>
  );
}

export function useCurrentTopicContext() {
  const context = useContext(CurrentTopicContext);

  if (!context) {
    throw new Error(
      "useCurrentTopicContext must be used inside CurrentTopicProvider"
    );
  }

  return context;
}
