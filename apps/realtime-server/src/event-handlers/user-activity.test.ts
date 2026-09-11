import { beforeEach, describe, it, expect, vi } from "vitest";
import { createMockSocket, createMockServer } from "../test/socket-mocks";

vi.mock("../lib/user-change-handler", () => ({
  handleActiveUserStateChange: vi.fn(),
  handleActiveUserAttributeChange: vi.fn(),
}));
vi.mock("../lib/notifications", () => ({
  NotificationType: { ExpandedImage: "image:expanded", ClickedLink: "link:clicked" },
  emitNotification: vi.fn(),
}));

import { handleActiveUserStateChange, handleActiveUserAttributeChange } from "../lib/user-change-handler";
import { emitNotification, NotificationType } from "../lib/notifications";
import {
  handleUserTabFocused,
  handleUserTabBlurred,
  handleUserStartedTyping,
  handleUserStoppedTyping,
  handleUserExpandedImage,
  handleUserClickedLink,
  handleUserUpdatedStatus,
} from "./user-activity";
import { SocketEvent } from "@tim/socket-types";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("handleUserTabFocused", () => {
  it("marks the user active and re-emits presence to the topic room", async () => {
    const socket = createMockSocket({ id: "user-1", state: { isIdle: false } });
    socket.rooms.add("topic::topic-1");
    const server = createMockServer();
    handleUserTabFocused({ socket: socket as any, server: server as any });

    await socket.trigger(SocketEvent.UserTabFocused, { topicId: "topic-1" });

    expect(handleActiveUserStateChange).toHaveBeenCalledWith(socket, { isIdle: false });
    expect(server.to).toHaveBeenCalledWith("topic::topic-1");
    expect(server.emit).toHaveBeenCalledWith(SocketEvent.UserTabFocused, {
      userId: "user-1",
      state: { isIdle: false },
    });
  });

  it("does not emit presence when not in the topic room", async () => {
    const socket = createMockSocket({ id: "user-1" });
    const server = createMockServer();
    handleUserTabFocused({ socket: socket as any, server: server as any });

    await socket.trigger(SocketEvent.UserTabFocused, { topicId: "topic-1" });

    expect(server.emit).not.toHaveBeenCalled();
  });
});

describe("handleUserTabBlurred", () => {
  it("marks the user idle and re-emits presence", async () => {
    const socket = createMockSocket({ id: "user-1" });
    socket.rooms.add("topic::topic-1");
    const server = createMockServer();
    handleUserTabBlurred({ socket: socket as any, server: server as any });

    await socket.trigger(SocketEvent.UserTabBlurred, { topicId: "topic-1" });

    expect(handleActiveUserStateChange).toHaveBeenCalledWith(socket, { isIdle: true });
    expect(server.emit).toHaveBeenCalledWith(SocketEvent.UserTabBlurred, expect.any(Object));
  });
});

describe("handleUserStartedTyping / handleUserStoppedTyping", () => {
  it("started: flips isTyping true and re-emits presence", async () => {
    const socket = createMockSocket({ id: "user-1" });
    socket.rooms.add("topic::topic-1");
    const server = createMockServer();
    handleUserStartedTyping({ socket: socket as any, server: server as any });

    await socket.trigger(SocketEvent.UserStartedTyping, { topicId: "topic-1" });

    expect(handleActiveUserStateChange).toHaveBeenCalledWith(socket, { isTyping: true });
    expect(server.emit).toHaveBeenCalledWith(SocketEvent.UserStartedTyping, expect.any(Object));
  });

  it("stopped: flips isTyping false and re-emits presence", async () => {
    const socket = createMockSocket({ id: "user-1" });
    socket.rooms.add("topic::topic-1");
    const server = createMockServer();
    handleUserStoppedTyping({ socket: socket as any, server: server as any });

    await socket.trigger(SocketEvent.UserStoppedTyping, { topicId: "topic-1" });

    expect(handleActiveUserStateChange).toHaveBeenCalledWith(socket, { isTyping: false });
    expect(server.emit).toHaveBeenCalledWith(SocketEvent.UserStoppedTyping, expect.any(Object));
  });
});

describe("handleUserExpandedImage", () => {
  it("notifies the message's author when in the topic room", async () => {
    const socket = createMockSocket({ id: "user-1" });
    socket.rooms.add("topic::topic-1");
    const server = createMockServer();
    handleUserExpandedImage({ socket: socket as any, server: server as any });

    await socket.trigger(SocketEvent.UserExpandedImage, { topicId: "topic-1", messageId: "msg-1" });

    expect(emitNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        topicId: "topic-1",
        messageId: "msg-1",
        notificationType: NotificationType.ExpandedImage,
      })
    );
  });

  it("does nothing when not in the topic room", async () => {
    const socket = createMockSocket({ id: "user-1" });
    const server = createMockServer();
    handleUserExpandedImage({ socket: socket as any, server: server as any });

    await socket.trigger(SocketEvent.UserExpandedImage, { topicId: "topic-1", messageId: "msg-1" });

    expect(emitNotification).not.toHaveBeenCalled();
  });
});

describe("handleUserClickedLink", () => {
  it("notifies the message's author when in the topic room", async () => {
    const socket = createMockSocket({ id: "user-1" });
    socket.rooms.add("topic::topic-1");
    const server = createMockServer();
    handleUserClickedLink({ socket: socket as any, server: server as any });

    await socket.trigger(SocketEvent.UserClickedLink, { topicId: "topic-1", messageId: "msg-1" });

    expect(emitNotification).toHaveBeenCalledWith(
      expect.objectContaining({ notificationType: NotificationType.ClickedLink })
    );
  });
});

describe("handleUserUpdatedStatus", () => {
  it("updates status and re-broadcasts when the payload matches the acting user", async () => {
    const socket = createMockSocket({ id: "user-1" });
    socket.rooms.add("circle::circle-1");
    const server = createMockServer();
    handleUserUpdatedStatus({ socket: socket as any, server: server as any });

    const payload = {
      circleIds: ["circle-1"],
      user: { id: "user-1", status: "afk", lastStatusUpdate: "2026-01-01" },
    };
    await socket.trigger(SocketEvent.UserUpdatedStatus, payload);

    expect(handleActiveUserAttributeChange).toHaveBeenCalledWith(socket, {
      status: "afk",
      lastStatusUpdate: "2026-01-01",
    });
    expect(server.to).toHaveBeenCalledWith(["circle::circle-1"]);
    expect(server.emit).toHaveBeenCalledWith(SocketEvent.UserUpdatedStatus, payload);
  });

  it("broadcasts once across all shared circle rooms instead of once per circle", async () => {
    const socket = createMockSocket({ id: "user-1" });
    socket.rooms.add("circle::circle-1");
    socket.rooms.add("circle::circle-2");
    const server = createMockServer();
    handleUserUpdatedStatus({ socket: socket as any, server: server as any });

    const payload = {
      circleIds: ["circle-1", "circle-2"],
      user: { id: "user-1", status: "afk", lastStatusUpdate: "2026-01-01" },
    };
    await socket.trigger(SocketEvent.UserUpdatedStatus, payload);

    expect(server.to).toHaveBeenCalledTimes(1);
    expect(server.to).toHaveBeenCalledWith(["circle::circle-1", "circle::circle-2"]);
    expect(server.emit).toHaveBeenCalledTimes(1);
  });

  it("rejects a payload whose user id doesn't match the acting socket", async () => {
    const socket = createMockSocket({ id: "user-1" });
    socket.rooms.add("circle::circle-1");
    const server = createMockServer();
    handleUserUpdatedStatus({ socket: socket as any, server: server as any });

    await socket.trigger(SocketEvent.UserUpdatedStatus, {
      circleIds: ["circle-1"],
      user: { id: "someone-else", status: "afk" },
    });

    expect(handleActiveUserAttributeChange).not.toHaveBeenCalled();
    expect(server.emit).not.toHaveBeenCalled();
  });

  it("does nothing when not in the circle room", async () => {
    const socket = createMockSocket({ id: "user-1" });
    const server = createMockServer();
    handleUserUpdatedStatus({ socket: socket as any, server: server as any });

    await socket.trigger(SocketEvent.UserUpdatedStatus, {
      circleIds: ["circle-1"],
      user: { id: "user-1", status: "afk" },
    });

    expect(server.emit).not.toHaveBeenCalled();
  });
});
