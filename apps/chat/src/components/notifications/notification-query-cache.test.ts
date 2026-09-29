import { describe, it, expect } from "vitest";
import { withAllRead, NotificationItem } from "./notification-query-cache";

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
