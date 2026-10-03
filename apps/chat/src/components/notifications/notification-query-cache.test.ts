import { describe, it, expect } from "vitest";
import { QueryClient, InfiniteData } from "@tanstack/react-query";
import {
  withAllRead,
  NotificationItem,
  notificationsQueryKey,
  updateNotificationMessages,
} from "./notification-query-cache";

function notif(
  id: string,
  extra: Partial<NotificationItem> = {},
): NotificationItem {
  return {
    id,
    type: "mention:received" as NotificationItem["type"],
    createdAt: "2026-01-01T00:00:00.000Z",
    readAt: null,
    messageId: "m1",
    actor: { id: "u1", name: "Actor", imageUrl: null },
    message: {
      id: "m1",
      topicId: "t1",
      text: "hello",
      mediaUrl: null,
      topic: { id: "t1", name: "Topic", circleId: "c1" },
    },
    ...extra,
  };
}

describe("withAllRead", () => {
  it("stamps readAt on an unread notification", () => {
    const mark = withAllRead("2026-01-02T00:00:00.000Z");

    expect(mark(notif("n1")).readAt).toBe("2026-01-02T00:00:00.000Z");
  });

  it("leaves an already-read notification's readAt untouched", () => {
    const mark = withAllRead("2026-01-02T00:00:00.000Z");
    const alreadyRead = notif("n1", { readAt: "2026-01-01T12:00:00.000Z" });

    expect(mark(alreadyRead).readAt).toBe("2026-01-01T12:00:00.000Z");
  });

  it("preserves everything else about the notification", () => {
    const mark = withAllRead("2026-01-02T00:00:00.000Z");
    const original = notif("n1");

    expect(mark(original)).toMatchObject({
      id: original.id,
      type: original.type,
      messageId: original.messageId,
      actor: original.actor,
      message: original.message,
    });
  });
});

describe("updateNotificationMessages", () => {
  it("patches every notification pointing at the message, across pages", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData<InfiniteData<NotificationItem[]>>(
      notificationsQueryKey,
      {
        pages: [[notif("n1"), notif("n2", { messageId: "m2" })], [notif("n3")]],
        pageParams: [undefined, "n2"],
      },
    );

    updateNotificationMessages(queryClient, "m1", (m) => ({
      ...m,
      highlights: [{ id: "h1", userId: "u2" }],
    }));

    const pages = queryClient.getQueryData<InfiniteData<NotificationItem[]>>(
      notificationsQueryKey,
    )!.pages;
    expect(pages[0][0].message.highlights).toHaveLength(1);
    expect(pages[0][1].message.highlights).toBeUndefined();
    expect(pages[1][0].message.highlights).toHaveLength(1);
  });
});
