import { NotificationType } from "@tim/socket-types";
import type { NotificationCopy } from "@/components/notifications/notification-copy";
import { openNflAts, type NflAtsView } from "./view-store";

const icon = <span aria-hidden>🏈</span>;

const open = (view: NflAtsView) => (circleId: string) =>
  openNflAts(view, circleId);

export const nflAtsNotificationCopy = {
  [NotificationType.NflAtsSlatePosted]: {
    text: "This week’s NFL slate is up",
    icon,
    onOpen: open("picks"),
  },
  [NotificationType.NflAtsResults]: {
    text: "Last week’s Pick ’em is final",
    icon,
    onOpen: open("last-week"),
  },
} satisfies Partial<Record<NotificationType, NotificationCopy>>;
