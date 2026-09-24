import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockServer } from "../test/socket-mocks";
import { RoomType } from "@tim/socket-types";
import { toRoomKey } from "../event-handlers/rooms";

vi.mock("../db/messages", () => ({
  getMessageOwnerInTopic: vi.fn(),
}));

vi.mock("../db/notifications", () => ({
  createNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../db/topics", () => ({
  isUserInTopic: vi.fn().mockResolvedValue(true),
}));

import { getMessageOwnerInTopic } from "../db/messages";
import { createNotification } from "../db/notifications";
import { isUserInTopic } from "../db/topics";
import {
  NotificationType,
  emitNotification,
  emitMentionNotifications,
} from "./notifications";

const actor = { id: "actor-1", name: "Actor", imageUrl: "actor.png" };

const userRoomKey = (id: string) => toRoomKey({ id, roomType: RoomType.User });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(isUserInTopic).mockResolvedValue(true);
});

describe("emitNotification", () => {
  it("persists and pushes live to the receiver's own user room", async () => {
    vi.mocked(getMessageOwnerInTopic).mockResolvedValue({
      id: "msg-1",
      userId: "author-1",
    } as any);

    const server = createMockServer();

    await emitNotification({
      server: server as any,
      topicId: "topic-1",
      messageId: "msg-1",
      actor,
      notificationType: NotificationType.HighlightRecieved,
    });

    expect(server.to).toHaveBeenCalledWith(userRoomKey("author-1"));
    expect(server.emit).toHaveBeenCalledWith(
      "notification:create",
      expect.objectContaining({
        notificationType: NotificationType.HighlightRecieved,
        messageId: "msg-1",
        topicId: "topic-1",
        actor,
      }),
    );
    expect(createNotification).toHaveBeenCalledWith({
      type: NotificationType.HighlightRecieved,
      recipientId: "author-1",
      actorId: actor.id,
      messageId: "msg-1",
    });
  });

  it("does not notify the author about their own action", async () => {
    vi.mocked(getMessageOwnerInTopic).mockResolvedValue({
      id: "msg-1",
      userId: actor.id,
    } as any);

    const server = createMockServer();

    await emitNotification({
      server: server as any,
      topicId: "topic-1",
      messageId: "msg-1",
      actor,
      notificationType: NotificationType.HighlightRecieved,
    });

    expect(server.to).not.toHaveBeenCalled();
    expect(createNotification).not.toHaveBeenCalled();
  });

  it("uses an explicit receiverId and skips the owner lookup", async () => {
    const server = createMockServer();

    await emitNotification({
      server: server as any,
      topicId: "topic-1",
      messageId: "reply-1",
      receiverId: "author-1",
      actor,
      notificationType: NotificationType.Replied,
    });

    expect(getMessageOwnerInTopic).not.toHaveBeenCalled();
    expect(server.to).toHaveBeenCalledWith(userRoomKey("author-1"));
    expect(server.emit).toHaveBeenCalledWith(
      "notification:create",
      expect.objectContaining({
        notificationType: NotificationType.Replied,
        messageId: "reply-1",
      }),
    );
  });

  it("still pushes the live notification when persisting fails", async () => {
    vi.mocked(createNotification).mockRejectedValueOnce(new Error("db down"));

    const server = createMockServer();

    await expect(
      emitNotification({
        server: server as any,
        topicId: "topic-1",
        messageId: "reply-1",
        receiverId: "author-1",
        actor,
        notificationType: NotificationType.Replied,
      }),
    ).resolves.toBeUndefined();

    expect(server.emit).toHaveBeenCalled();
  });
});

describe("emitMentionNotifications", () => {
  it("notifies every mentioned user, routed to their own user room", async () => {
    const server = createMockServer();

    await emitMentionNotifications({
      server: server as any,
      topicId: "topic-1",
      messageId: "msg-1",
      actor,
      mentionedUserIds: ["alice", "bob"],
    });

    expect(server.to).toHaveBeenCalledWith(userRoomKey("alice"));
    expect(server.to).toHaveBeenCalledWith(userRoomKey("bob"));
    expect(createNotification).toHaveBeenCalledWith({
      type: NotificationType.Mentioned,
      recipientId: "alice",
      actorId: actor.id,
      messageId: "msg-1",
    });
    expect(createNotification).toHaveBeenCalledWith({
      type: NotificationType.Mentioned,
      recipientId: "bob",
      actorId: actor.id,
      messageId: "msg-1",
    });
  });

  it("drops a mentioned id that isn't actually a member of the topic (spoofed client payload)", async () => {
    const server = createMockServer();

    vi.mocked(isUserInTopic).mockImplementation(
      async ({ userId }) => userId !== "intruder",
    );

    await emitMentionNotifications({
      server: server as any,
      topicId: "topic-1",
      messageId: "msg-1",
      actor,
      mentionedUserIds: ["alice", "intruder"],
    });

    expect(server.to).toHaveBeenCalledWith(userRoomKey("alice"));
    expect(server.to).not.toHaveBeenCalledWith(userRoomKey("intruder"));
    expect(createNotification).toHaveBeenCalledTimes(1);
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: "alice" }),
    );
    expect(createNotification).not.toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: "intruder" }),
    );
  });

  it("skips a mentioned user who mentioned themselves", async () => {
    const server = createMockServer();

    await emitMentionNotifications({
      server: server as any,
      topicId: "topic-1",
      messageId: "msg-1",
      actor,
      mentionedUserIds: [actor.id],
    });

    expect(server.to).not.toHaveBeenCalled();
  });

  it("dedupes a user mentioned more than once in the same message", async () => {
    const server = createMockServer();

    await emitMentionNotifications({
      server: server as any,
      topicId: "topic-1",
      messageId: "msg-1",
      actor,
      mentionedUserIds: ["alice", "alice"],
    });

    expect(server.to).toHaveBeenCalledTimes(1);
  });

  it("does nothing when there are no mentions", async () => {
    const server = createMockServer();

    await emitMentionNotifications({
      server: server as any,
      topicId: "topic-1",
      messageId: "msg-1",
      actor,
      mentionedUserIds: [],
    });

    expect(isUserInTopic).not.toHaveBeenCalled();
    expect(server.to).not.toHaveBeenCalled();
  });
});
