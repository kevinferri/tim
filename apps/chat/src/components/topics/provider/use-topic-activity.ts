import { useCallback } from "react";
import { MessageProps } from "@/components/topics/message";
import {
  SocketEvent,
  useSocketEmit,
  useSocketHandler,
} from "@/components/socket/use-socket";
import { useWindowFocus } from "@/lib/hooks/use-window-focus";
import { useUnreadTopics } from "@/components/dashboard/unread-topics-store";
import { useMessageSound } from "@/components/dashboard/use-message-sound";
import { playMessagePop } from "@/lib/sounds";
import { bumpTitleBadge } from "@/lib/title-badges";

type UseTopicActivityProps = {
  topicId: string;
};

export function useTopicActivity({ topicId }: UseTopicActivityProps) {
  const userTabFocused = useSocketEmit(SocketEvent.UserTabFocused);
  const userTabBlurred = useSocketEmit(SocketEvent.UserTabBlurred);
  const { isMessageSoundEnabled } = useMessageSound();
  const { markTopicAsUnread } = useUnreadTopics();

  const windowFocused = useWindowFocus({
    onFocus: () => {
      userTabFocused.emit({ topicId });
    },
    onBlur: () => {
      userTabBlurred.emit({ topicId });
    },
  });

  useSocketHandler<MessageProps>(
    SocketEvent.SendMessage,
    (message: MessageProps) => {
      if (message.topicId !== topicId) {
        markTopicAsUnread(message.topicId!);
      }
    },
  );

  const notifyOnNewMessage = useCallback(() => {
    if (!windowFocused) {
      bumpTitleBadge("messages");

      if (isMessageSoundEnabled) {
        playMessagePop();
      }
    }
  }, [windowFocused, isMessageSoundEnabled]);

  return {
    notifyOnNewMessage,
    windowFocused,
  };
}
