import { NotificationType } from "@tim/socket-types";
import type { NotificationCopy } from "@/components/notifications/notification-copy";
import { SpellItOutIcon } from "./spell-it-out-icon";
import { openSpellItOut } from "./view-store";

export const spellItOutNotificationCopy = {
  [NotificationType.SpellItOutFinished]: {
    text: "finished today’s Spell It Out",
    icon: <SpellItOutIcon className="size-4" />,
    onOpen: (circleId: string) => openSpellItOut("results", circleId),
  },
} satisfies Partial<Record<NotificationType, NotificationCopy>>;
