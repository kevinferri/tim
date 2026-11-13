import { NotificationType } from "@tim/socket-types";
import type { NotificationCopy } from "@/components/notifications/notification-copy";
import { WordsmithIcon } from "./wordsmith-icon";
import { openWordsmith } from "./view-store";

export const wordsmithNotificationCopy = {
  [NotificationType.WordsmithFinished]: {
    text: "finished today’s Wordsmith",
    icon: <WordsmithIcon className="size-4" />,
    onOpen: (circleId: string) => openWordsmith("results", circleId),
  },
} satisfies Partial<Record<NotificationType, NotificationCopy>>;
