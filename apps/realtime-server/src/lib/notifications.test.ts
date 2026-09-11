import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockServer, createMockSocket } from "../test/socket-mocks";

vi.mock("../db/messages", () => ({
  getMessageOwnerInTopic: vi.fn(),
}));

import { getMessageOwnerInTopic } from "../db/messages";
import {
  NotificationType,
  emitNotification,
  emitMentionNotifications,
} from "./notifications";

const actor = { id: "actor-1", name: "Actor", imageUrl: "actor.png" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("emitNotification", () => {
  it("notifies the message's author when someone else triggers it", async () => {
    vi.mocked(getMessageOwnerInTopic).mockResolvedValue({
      id: "msg-1",
      userId: "author-1",
    } as any);

    const receiverSocket = createMockSocket({ id: "author-1" });
    const server = createMockServer({ socketsInRoom: [receiverSocket as any] });

    await emitNotification({
      server: server as any,
      roomKey: "topic::topic-1",
      topicId: "topic-1",
      messageId: "msg-1",
      actor,
      notificationType: NotificationType.HighlightRecieved,
    });

    expect(receiverSocket.emit).toHaveBeenCalledWith(
      "notification:create",
      expect.objectContaining({
        notificationType: NotificationType.HighlightRecieved,
        messageId: "msg-1",
        topicId: "topic-1",
        actor,
      })
    );
  });

  it("does not notify the author about their own action", async () => {
    vi.mocked(getMessageOwnerInTopic).mockResolvedValue({
      id: "msg-1",
      userId: actor.id,
    } as any);

    const receiverSocket = createMockSocket({ id: actor.id });
    const server = createMockServer({ socketsInRoom: [receiverSocket as any] });

    await emitNotification({
      server: server as any,
      roomKey: "topic::topic-1",
      topicId: "topic-1",
      messageId: "msg-1",
      actor,
      notificationType: NotificationType.HighlightRecieved,
    });

    expect(receiverSocket.emit).not.toHaveBeenCalled();
  });

  it("does nothing when the receiver isn't connected in the room", async () => {
    vi.mocked(getMessageOwnerInTopic).mockResolvedValue({
      id: "msg-1",
      userId: "author-1",
    } as any);

    const server = createMockServer({ socketsInRoom: [] });

    await expect(
      emitNotification({
        server: server as any,
        roomKey: "topic::topic-1",
        topicId: "topic-1",
        messageId: "msg-1",
        actor,
        notificationType: NotificationType.HighlightRecieved,
      })
    ).resolves.toBeUndefined();
  });
});

describe("emitMentionNotifications", () => {
  it("notifies every mentioned user who's connected in the room", async () => {
    const alice = createMockSocket({ id: "alice" });
    const bob = createMockSocket({ id: "bob" });
    const server = createMockServer({
      socketsInRoom: [alice as any, bob as any],
    });

    await emitMentionNotifications({
      server: server as any,
      roomKey: "circle::circle-1",
      topicId: "topic-1",
      messageId: "msg-1",
      actor,
      mentionedUserIds: ["alice", "bob"],
    });

    expect(alice.emit).toHaveBeenCalledWith(
      "notification:create",
      expect.objectContaining({
        notificationType: NotificationType.Mentioned,
        messageId: "msg-1",
      })
    );
    expect(bob.emit).toHaveBeenCalledWith(
      "notification:create",
      expect.objectContaining({ notificationType: NotificationType.Mentioned })
    );
  });

  it("skips a mentioned user who mentioned themselves", async () => {
    const selfSocket = createMockSocket({ id: actor.id });
    const server = createMockServer({ socketsInRoom: [selfSocket as any] });

    await emitMentionNotifications({
      server: server as any,
      roomKey: "circle::circle-1",
      topicId: "topic-1",
      messageId: "msg-1",
      actor,
      mentionedUserIds: [actor.id],
    });

    expect(selfSocket.emit).not.toHaveBeenCalled();
  });

  it("dedupes a user mentioned more than once in the same message", async () => {
    const alice = createMockSocket({ id: "alice" });
    const server = createMockServer({ socketsInRoom: [alice as any] });

    await emitMentionNotifications({
      server: server as any,
      roomKey: "circle::circle-1",
      topicId: "topic-1",
      messageId: "msg-1",
      actor,
      mentionedUserIds: ["alice", "alice"],
    });

    expect(alice.emit).toHaveBeenCalledTimes(1);
  });

  it("does nothing when there are no mentions", async () => {
    const server = createMockServer({ socketsInRoom: [] });

    await emitMentionNotifications({
      server: server as any,
      roomKey: "circle::circle-1",
      topicId: "topic-1",
      messageId: "msg-1",
      actor,
      mentionedUserIds: [],
    });

    expect(server.in).not.toHaveBeenCalled();
  });
});
