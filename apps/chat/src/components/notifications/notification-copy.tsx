import {
  ChatBubbleIcon,
  Link2Icon,
  MagnifyingGlassIcon,
  StarFilledIcon,
  StarIcon,
} from "@radix-ui/react-icons";
import { NotificationType } from "@tim/socket-types";
import { ReplyIcon } from "@/components/icons/reply-icon";

export const notificationCopyMap: Record<
  NotificationType,
  { text: string; icon: React.ReactNode }
> = {
  [NotificationType.HighlightRecieved]: {
    text: "highlighted your message",
    icon: <StarFilledIcon />,
  },
  [NotificationType.HighlightRemoved]: {
    text: "removed a highlight",
    icon: <StarIcon />,
  },
  [NotificationType.ExpandedImage]: {
    text: "expanded your image",
    icon: <MagnifyingGlassIcon />,
  },
  [NotificationType.ClickedLink]: {
    text: "clicked your link",
    icon: <Link2Icon />,
  },
  [NotificationType.Mentioned]: {
    text: "mentioned you",
    icon: <ChatBubbleIcon />,
  },
  [NotificationType.Replied]: {
    text: "replied to your message",
    icon: <ReplyIcon />,
  },
};
