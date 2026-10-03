import { beforeEach, describe, it, expect, vi } from "vitest";
import { createMockSocket, createMockServer } from "../test/socket-mocks";

vi.mock("../db/highlights", () => ({
  toggleHighlight: vi.fn(),
}));
vi.mock("../db/users", () => ({
  getUserSummary: vi.fn(),
}));
vi.mock("../db/messages", () => ({
  getMessageOwnerInTopic: vi.fn(),
}));
vi.mock("../db/topics", () => ({
  isUserInTopic: vi.fn(),
}));
vi.mock("../lib/notifications", () => ({
  NotificationType: {
    HighlightRecieved: "highlight:recieved",
    HighlightRemoved: "highlight:removed",
  },
  emitNotification: vi.fn(),
}));

import { toggleHighlight } from "../db/highlights";
import { getUserSummary } from "../db/users";
import { getMessageOwnerInTopic } from "../db/messages";
import { isUserInTopic } from "../db/topics";
import { emitNotification, NotificationType } from "../lib/notifications";
import { handleToggleHighlight } from "./highlights";
import { SocketEvent } from "@tim/socket-types";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getMessageOwnerInTopic).mockResolvedValue({
    id: "msg-1",
    userId: "owner-1",
  } as any);
});

describe("handleToggleHighlight", () => {
  it("adds a highlight, emits it with the creator, and notifies", async () => {
    vi.mocked(toggleHighlight).mockResolvedValue({
      id: "h1",
      userId: "user-1",
      messageId: "msg-1",
    } as any);
    vi.mocked(getUserSummary).mockResolvedValue({
      id: "user-1",
      imageUrl: "img",
      name: "Test User",
    } as any);

    const socket = createMockSocket({ id: "user-1" });
    socket.rooms.add("topic::topic-1");
    const server = createMockServer();
    handleToggleHighlight({ socket: socket as any, server: server as any });

    await socket.trigger(SocketEvent.ToggleHighlight, {
      topicId: "topic-1",
      messageId: "msg-1",
    });

    expect(server.to).toHaveBeenCalledWith("topic::topic-1");
    expect(server.emit).toHaveBeenCalledWith(SocketEvent.AddedHighlight, {
      highlight: { id: "h1", userId: "user-1", messageId: "msg-1" },
      createdBy: { id: "user-1", imageUrl: "img", name: "Test User" },
    });
    expect(emitNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        notificationType: NotificationType.HighlightRecieved,
      }),
    );
  });

  it("removes a highlight and notifies removal when one already existed", async () => {
    vi.mocked(toggleHighlight).mockResolvedValue(undefined);

    const socket = createMockSocket({ id: "user-1" });
    socket.rooms.add("topic::topic-1");
    const server = createMockServer();
    handleToggleHighlight({ socket: socket as any, server: server as any });

    await socket.trigger(SocketEvent.ToggleHighlight, {
      topicId: "topic-1",
      messageId: "msg-1",
    });

    expect(server.emit).toHaveBeenCalledWith(SocketEvent.RemovedHighlight, {
      messageId: "msg-1",
      userId: "user-1",
    });
    expect(emitNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        notificationType: NotificationType.HighlightRemoved,
      }),
    );
    expect(getUserSummary).not.toHaveBeenCalled();
  });

  it("does nothing when not in the room and not a member of the topic", async () => {
    vi.mocked(isUserInTopic).mockResolvedValue(false);

    const socket = createMockSocket({ id: "user-1" });
    const server = createMockServer();
    handleToggleHighlight({ socket: socket as any, server: server as any });

    await socket.trigger(SocketEvent.ToggleHighlight, {
      topicId: "topic-1",
      messageId: "msg-1",
    });

    expect(isUserInTopic).toHaveBeenCalledWith({
      userId: "user-1",
      topicId: "topic-1",
    });
    expect(toggleHighlight).not.toHaveBeenCalled();
  });

  it("highlights from outside the room for a topic member, echoing to the acting socket", async () => {
    vi.mocked(isUserInTopic).mockResolvedValue(true);
    vi.mocked(toggleHighlight).mockResolvedValue({
      id: "h1",
      userId: "user-1",
      messageId: "msg-1",
    } as any);
    vi.mocked(getUserSummary).mockResolvedValue({ id: "user-1" } as any);

    const socket = createMockSocket({ id: "user-1" });
    const server = createMockServer();
    handleToggleHighlight({ socket: socket as any, server: server as any });

    await socket.trigger(SocketEvent.ToggleHighlight, {
      topicId: "topic-1",
      messageId: "msg-1",
    });

    const added = {
      highlight: { id: "h1", userId: "user-1", messageId: "msg-1" },
      createdBy: { id: "user-1" },
    };
    expect(server.to).toHaveBeenCalledWith("topic::topic-1");
    expect(server.emit).toHaveBeenCalledWith(SocketEvent.AddedHighlight, added);
    expect(socket.emit).toHaveBeenCalledWith(SocketEvent.AddedHighlight, added);
  });

  it("doesn't echo to the acting socket when it's already in the room", async () => {
    vi.mocked(toggleHighlight).mockResolvedValue(undefined);

    const socket = createMockSocket({ id: "user-1" });
    socket.rooms.add("topic::topic-1");
    const server = createMockServer();
    handleToggleHighlight({ socket: socket as any, server: server as any });

    await socket.trigger(SocketEvent.ToggleHighlight, {
      topicId: "topic-1",
      messageId: "msg-1",
    });

    expect(isUserInTopic).not.toHaveBeenCalled();
    expect(socket.emit).not.toHaveBeenCalled();
  });

  it("does nothing when the message isn't in the given topic", async () => {
    vi.mocked(getMessageOwnerInTopic).mockResolvedValue(undefined);

    const socket = createMockSocket({ id: "user-1" });
    socket.rooms.add("topic::topic-1");
    const server = createMockServer();
    handleToggleHighlight({ socket: socket as any, server: server as any });

    await socket.trigger(SocketEvent.ToggleHighlight, {
      topicId: "topic-1",
      messageId: "msg-other",
    });

    expect(toggleHighlight).not.toHaveBeenCalled();
  });
});
