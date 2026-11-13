import { NotificationType } from "@tim/socket-types";
import type { NotificationCopy } from "@/components/notifications/notification-copy";
import { openSamePage, type SamePageView } from "./view-store";

const icon = <span aria-hidden>🧦</span>;

const open = (view: SamePageView) => (circleId: string) =>
  openSamePage(view, circleId);

export const samePageNotificationCopy = {
  [NotificationType.SamePagePrompt]: {
    text: "Same Page prompt is live",
    icon,
    onOpen: open("play"),
  },
  [NotificationType.SamePageNudge]: {
    text: "Same Page locks soon — still time to answer",
    icon,
    onOpen: open("play"),
  },
  [NotificationType.SamePageAnswered]: {
    text: "answered today’s Same Page",
    icon,
    onOpen: open("play"),
  },
  [NotificationType.SamePageReveal]: {
    text: "Same Page results are in",
    icon,
    onOpen: open("results"),
  },
} satisfies Partial<Record<NotificationType, NotificationCopy>>;
