import { useState, useRef, useCallback } from "react";
import { MessageProps } from "@/components/topics/message";
import {
  SocketEvent,
  useSocketEmit,
  useSocketHandler,
} from "@/components/socket/use-socket";
import { useWindowFocus } from "@/lib/hooks/use-window-focus";
import { useUnreadTopics } from "@/components/dashboard/unread-topics-store";
import { useMessageSound } from "@/components/dashboard/use-message-sound";

type UseTopicActivityProps = {
  topicId: string;
  baseTitle: string;
};

export function useTopicActivity({
  topicId,
  baseTitle,
}: UseTopicActivityProps) {
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const blopSoundRef = useRef<null | HTMLAudioElement>(null);
  const userTabFocused = useSocketEmit(SocketEvent.UserTabFocused);
  const userTabBlurred = useSocketEmit(SocketEvent.UserTabBlurred);
  const { isMessageSoundEnabled } = useMessageSound();
  const { markTopicAsUnread } = useUnreadTopics();

  const windowFocused = useWindowFocus({
    onFocus: () => {
      userTabFocused.emit({ topicId });
      if (unreadMessageCount !== 0) {
        setUnreadMessageCount(0);
        document.title = baseTitle;
      }
    },
    onBlur: () => {
      userTabBlurred.emit({ topicId });
    },
  });

  // Global handler to mark other topics as unread
  useSocketHandler<MessageProps>(
    SocketEvent.SendMessage,
    (message: MessageProps) => {
      if (message.topicId !== topicId) {
        markTopicAsUnread(message.topicId!);
      }
    }
  );

  const notifyOnNewMessage = useCallback(() => {
    // Always increment unread count for new messages when window is not focused
    if (!windowFocused) {
      setUnreadMessageCount((count) => {
        const newCount = count + 1;
        document.title = `(${newCount}) ${baseTitle}`;
        return newCount;
      });

      if (isMessageSoundEnabled) {
        blopSoundRef.current?.play();
      }
    }
  }, [windowFocused, baseTitle, isMessageSoundEnabled]);

  return {
    unreadMessageCount,
    blopSoundRef,
    notifyOnNewMessage,
    windowFocused,
  };
}
