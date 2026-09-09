"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  MutableRefObject,
} from "react";
import { MessageProps, MessageData } from "@/components/topics/message";
import { useState } from "react";
import { useSelf } from "@/components/auth/self-provider";
import { useSocketContext } from "@/components/socket/socket-provider";
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

type ScrollToBottomOptions = {
  behavior?: ScrollBehavior;
};

type ContextValue = {
  topicId: string;
  circleId: string;
  messages: MessageProps[];
  topHighlights: MessageProps[];
  mediaMessages: MessageProps[];
  circleMembers: CircleMember[];
  viewportRef: MutableRefObject<HTMLDivElement | null>;
  contentRef: MutableRefObject<HTMLDivElement | null>;
  bottomSentinelRef: MutableRefObject<HTMLDivElement | null>;
  isAtBottom: boolean;
  unseenCount: number;
  scrollToBottom: (options?: ScrollToBottomOptions) => void;
  addShufflingGif: (id: string) => void;
  shufflingGifs: string[];
  loadMoreMessages: () => void;
  loadingMoreMessages: boolean;
  hasMoreMessages: boolean;
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
  const self = useSelf();
  const {
    socketState: { isConnected },
  } = useSocketContext();
  const baseTitle = `${props.circleName} - ${props.topicName}`;
  const [generatingCommand, setGeneratingCommand] = useState<
    string | undefined
  >();
  const [unseenCount, setUnseenCount] = useState(0);
  const { viewportRef, contentRef, bottomSentinelRef, isAtBottom, scrollToBottom } =
    useTopicScroll();

  const { blopSoundRef, notifyOnNewMessage } = useTopicActivity({
    topicId: props.topicId,
    baseTitle,
  });

  useEffect(() => {
    if (isAtBottom) setUnseenCount(0);
  }, [isAtBottom]);

  const onNewMessage = useCallback(
    (message: MessageProps) => {
      notifyOnNewMessage();

      if (message.sentBy?.id === self.id) {
        // Always land on your own messages, regardless of where you were
        // scrolled to when you sent it.
        scrollToBottom({ behavior: "instant" });
      } else if (!isAtBottom) {
        setUnseenCount((count) => count + 1);
      }

      if (generatingCommand) setGeneratingCommand(undefined);
    },
    [
      notifyOnNewMessage,
      scrollToBottom,
      self.id,
      isAtBottom,
      setGeneratingCommand,
      generatingCommand,
    ],
  );

  const { mediaMessages, setMediaMessages, shufflingGifs, addShufflingGif } =
    useTopicMedia({
      existingMediaMessages: props.existingMediaMessages,
      onMediaChange: (handler) => {
        setMessages((prev) => handler(prev));
        setMediaMessages((prev) => handler(prev));
      },
    });

  const onMediaMessage = useCallback(
    (message: MessageProps) => {
      setMediaMessages((prev) => [message, ...prev]);
    },
    [setMediaMessages],
  );

  const {
    messages,
    setMessages,
    loadMoreMessages,
    loadingMoreMessages,
    hasMoreMessages,
    reconcileRecentMessages,
  } = useTopicMessages({
    topicId: props.topicId,
    existingMessages: props.existingMessages,
    messagesLimit: props.messagesLimit,
    viewportRef,
    isAtBottom,
    onNewMessage,
    onMediaMessage,
  });

  const { topHighlights, refreshTopHighlights } = useTopicHighlights({
    topicId: props.topicId,
    existingTopHighlights: props.existingTopHighlights,
    topHighlightsLimit: props.topHighlightsLimit,
    onHighlightChange: (handler) => {
      setMessages((prev) => handler(prev));
      setMediaMessages((prev) => handler(prev));
    },
  });

  // The socket only tells us about changes while it's actually
  // connected -- anything sent, edited, deleted, or highlighted while
  // disconnected never reaches us as an event. Catch up on reconnect
  // (a real "was disconnected, now isn't" transition, not the initial
  // connect -- we already have fresh data for that from the server
  // render).
  const wasConnectedRef = useRef(isConnected);

  useEffect(() => {
    const wasConnected = wasConnectedRef.current;
    wasConnectedRef.current = isConnected;

    if (wasConnected === false && isConnected === true) {
      reconcileRecentMessages();
      refreshTopHighlights();
    }
  }, [isConnected, reconcileRecentMessages, refreshTopHighlights]);

  const circleMembers = useMemo(
    () => props.existingCircleMembers,
    [props.existingCircleMembers],
  );

  const contextValue = useMemo(
    () => ({
      messages,
      mediaMessages,
      circleMembers,
      viewportRef,
      contentRef,
      bottomSentinelRef,
      isAtBottom,
      unseenCount,
      scrollToBottom,
      shufflingGifs,
      addShufflingGif,
      topHighlights,
      topicId: props.topicId,
      circleId: props.circleId,
      loadMoreMessages,
      loadingMoreMessages,
      hasMoreMessages,
      blopSoundRef,
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
      isAtBottom,
      unseenCount,
      scrollToBottom,
      loadMoreMessages,
      loadingMoreMessages,
      hasMoreMessages,
      generatingCommand,
      setGeneratingCommand,
      viewportRef,
      contentRef,
      bottomSentinelRef,
      blopSoundRef,
    ],
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
      "useCurrentTopicContext must be used inside CurrentTopicProvider",
    );
  }

  return context;
}
