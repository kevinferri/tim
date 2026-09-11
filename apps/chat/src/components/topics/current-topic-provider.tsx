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

export type CircleTopic = {
  id: string;
  name: string;
};

type ScrollToBottomOptions = {
  behavior?: ScrollBehavior;
};

// This used to be a single context carrying everything about the
// current topic (messages, media, highlights, scroll state, composer
// state...) built from one big useMemo. Any single field changing --
// a new socket message, isAtBottom flipping, a gif shuffle starting --
// produced a new object reference for the whole thing, so every
// consumer re-rendered regardless of which slice it actually read
// (every message row included, since Message read from it too). It's
// now split by how often each slice actually changes, so e.g. the
// member list (identity/membership, effectively static) doesn't
// re-render on chat traffic, and the media rail doesn't re-render on
// every new text message.

// --- Meta: topic/circle identity + membership. Set once per topic
// mount and essentially never changes again. ---

type MetaContextValue = {
  topicId: string;
  circleId: string;
  circleMembers: CircleMember[];
  circleTopics: CircleTopic[];
};

const TopicMetaContext = createContext<MetaContextValue | undefined>(
  undefined,
);

export function useTopicMetaContext() {
  const context = useContext(TopicMetaContext);

  if (!context) {
    throw new Error(
      "useTopicMetaContext must be used inside CurrentTopicProvider",
    );
  }

  return context;
}

// Where a message sits in the timeline (newest / among the last few /
// oldest-loaded), derived once from `messages` here instead of every
// `Message` instance scanning the full array itself with findIndex --
// that was an O(n) scan per message, i.e. O(n^2) total per incoming
// message for a topic with n messages loaded. Callers that render
// <Message> compute these flags via getMessagePositionFlags and pass
// them down as props rather than having Message read this context
// directly -- a changed context value re-renders every consumer
// regardless of memoization, so Message needs plain props to stay
// memoizable and skip re-rendering when its own position hasn't
// changed.

export type MessageRecency = {
  newestMessageId?: string;
  oldestMessageId?: string;
  recentMessageIds: Set<string>;
};

export function getMessagePositionFlags(
  recency: MessageRecency,
  messageId?: string,
) {
  if (!messageId) {
    return {
      isNewestMessage: false,
      isRecentMessage: false,
      isFirstMessage: false,
    };
  }

  return {
    isNewestMessage: messageId === recency.newestMessageId,
    isRecentMessage: recency.recentMessageIds.has(messageId),
    isFirstMessage: messageId === recency.oldestMessageId,
  };
}

const RECENT_MESSAGE_WINDOW = 5;

// --- Messages: the main chat history. Changes on every send/edit/
// delete/pagination -- the highest-churn slice. ---

type MessagesContextValue = {
  messages: MessageProps[];
  loadMoreMessages: () => void;
  loadingMoreMessages: boolean;
  hasMoreMessages: boolean;
  recency: MessageRecency;
};

const TopicMessagesContext = createContext<MessagesContextValue | undefined>(
  undefined,
);

export function useTopicMessagesContext() {
  const context = useContext(TopicMessagesContext);

  if (!context) {
    throw new Error(
      "useTopicMessagesContext must be used inside CurrentTopicProvider",
    );
  }

  return context;
}

// --- Media, highlights, and gif-shuffle each change independently of
// the main message list and of each other. ---

type MediaContextValue = { mediaMessages: MessageProps[] };

const TopicMediaContext = createContext<MediaContextValue | undefined>(
  undefined,
);

export function useTopicMediaContext() {
  const context = useContext(TopicMediaContext);

  if (!context) {
    throw new Error(
      "useTopicMediaContext must be used inside CurrentTopicProvider",
    );
  }

  return context;
}

type HighlightsContextValue = { topHighlights: MessageProps[] };

const TopicHighlightsContext = createContext<
  HighlightsContextValue | undefined
>(undefined);

export function useTopicHighlightsContext() {
  const context = useContext(TopicHighlightsContext);

  if (!context) {
    throw new Error(
      "useTopicHighlightsContext must be used inside CurrentTopicProvider",
    );
  }

  return context;
}

type GifContextValue = {
  shufflingGifs: string[];
  addShufflingGif: (id: string) => void;
};

const TopicGifContext = createContext<GifContextValue | undefined>(undefined);

export function useTopicGifContext() {
  const context = useContext(TopicGifContext);

  if (!context) {
    throw new Error(
      "useTopicGifContext must be used inside CurrentTopicProvider",
    );
  }

  return context;
}

// --- Scroll/composer UI state: scroll position, unread count, and
// slash-command generation. None of the above slices care about this. ---

type UiContextValue = {
  viewportRef: MutableRefObject<HTMLDivElement | null>;
  contentRef: MutableRefObject<HTMLDivElement | null>;
  bottomSentinelRef: MutableRefObject<HTMLDivElement | null>;
  isAtBottom: boolean;
  unseenCount: number;
  scrollToBottom: (options?: ScrollToBottomOptions) => void;
  blopSoundRef: MutableRefObject<HTMLAudioElement | null>;
  generatingCommand?: string;
  setGeneratingCommand: (command?: string) => void;
};

const TopicUiContext = createContext<UiContextValue | undefined>(undefined);

export function useTopicUiContext() {
  const context = useContext(TopicUiContext);

  if (!context) {
    throw new Error(
      "useTopicUiContext must be used inside CurrentTopicProvider",
    );
  }

  return context;
}

type Props = {
  topicId: string;
  circleId: string;
  topicName: string;
  circleName: string;
  existingMessages: MessageData[];
  existingTopHighlights: MessageData[];
  existingMediaMessages: MessageData[];
  existingCircleMembers: CircleMember[];
  existingCircleTopics: CircleTopic[];
  topHighlightsLimit: number;
  messagesLimit: number;
  children: React.ReactNode;
};

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
      topicId: props.topicId,
      existingMediaMessages: props.existingMediaMessages,
    });

  const onMediaMessage = useCallback(
    (message: MessageProps) => {
      setMediaMessages((prev) => [message, ...prev]);
    },
    [setMediaMessages],
  );

  const {
    messages,
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

  const circleTopics = useMemo(
    () => props.existingCircleTopics,
    [props.existingCircleTopics],
  );

  const metaValue = useMemo<MetaContextValue>(
    () => ({
      topicId: props.topicId,
      circleId: props.circleId,
      circleMembers,
      circleTopics,
    }),
    [props.topicId, props.circleId, circleMembers, circleTopics],
  );

  const recency = useMemo<MessageRecency>(
    () => ({
      newestMessageId: messages[messages.length - 1]?.id,
      oldestMessageId: messages[0]?.id,
      recentMessageIds: new Set(
        messages.slice(-RECENT_MESSAGE_WINDOW).map((m) => m.id!),
      ),
    }),
    [messages],
  );

  const messagesValue = useMemo<MessagesContextValue>(
    () => ({
      messages,
      loadMoreMessages,
      loadingMoreMessages,
      hasMoreMessages,
      recency,
    }),
    [messages, loadMoreMessages, loadingMoreMessages, hasMoreMessages, recency],
  );

  const mediaValue = useMemo<MediaContextValue>(
    () => ({ mediaMessages }),
    [mediaMessages],
  );

  const highlightsValue = useMemo<HighlightsContextValue>(
    () => ({ topHighlights }),
    [topHighlights],
  );

  const gifValue = useMemo<GifContextValue>(
    () => ({ shufflingGifs, addShufflingGif }),
    [shufflingGifs, addShufflingGif],
  );

  const uiValue = useMemo<UiContextValue>(
    () => ({
      viewportRef,
      contentRef,
      bottomSentinelRef,
      isAtBottom,
      unseenCount,
      scrollToBottom,
      blopSoundRef,
      generatingCommand,
      setGeneratingCommand,
    }),
    [
      viewportRef,
      contentRef,
      bottomSentinelRef,
      isAtBottom,
      unseenCount,
      scrollToBottom,
      blopSoundRef,
      generatingCommand,
    ],
  );

  return (
    <TopicMetaContext.Provider value={metaValue}>
      <TopicUiContext.Provider value={uiValue}>
        <TopicGifContext.Provider value={gifValue}>
          <TopicHighlightsContext.Provider value={highlightsValue}>
            <TopicMediaContext.Provider value={mediaValue}>
              <TopicMessagesContext.Provider value={messagesValue}>
                {props.children}
              </TopicMessagesContext.Provider>
            </TopicMediaContext.Provider>
          </TopicHighlightsContext.Provider>
        </TopicGifContext.Provider>
      </TopicUiContext.Provider>
    </TopicMetaContext.Provider>
  );
}
