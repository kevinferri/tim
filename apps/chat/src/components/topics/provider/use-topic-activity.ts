import { MessageProps } from "@/components/topics/message";
import {
  SocketEvent,
  useSocketEmit,
  useSocketHandler,
} from "@/components/socket/use-socket";
import { useWindowFocus } from "@/lib/hooks/use-window-focus";
import { useUnreadTopics } from "@/components/dashboard/unread-topics-store";
import { useMessageSound } from "@/components/dashboard/use-message-sound";
import { useSelf } from "@/components/auth/self-provider";
import { isTopicMuted } from "@/components/topics/muted-topics-store";
import { playMessagePop } from "@/lib/sounds";
import { bumpTitleBadge } from "@/lib/title-badges";

type UseTopicActivityProps = {
  topicId: string;
  circleId: string;
};

export function useTopicActivity({ topicId, circleId }: UseTopicActivityProps) {
  const self = useSelf();
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

  // Every joined circle's messages arrive here (they're broadcast to circle rooms).
  useSocketHandler<MessageProps & { circleId?: string }>(
    SocketEvent.SendMessage,
    (message) => {
      if (message.topicId !== topicId) {
        markTopicAsUnread(message.topicId!);
      }

      // Tab title/sound mean "this circle needs you": skip other circles,
      // your own messages, and muted topics (unless it's the one you're in).
      const isCurrentTopic = message.topicId === topicId;
      if (
        windowFocused ||
        message.circleId !== circleId ||
        message.sentBy?.id === self.id ||
        (!isCurrentTopic && isTopicMuted(message.topicId!))
      ) {
        return;
      }

      bumpTitleBadge("messages");
      if (isMessageSoundEnabled) {
        playMessagePop();
      }
    },
  );
}
