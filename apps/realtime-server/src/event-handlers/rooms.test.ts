import { beforeEach, describe, it, expect, vi } from "vitest";
import { createMockSocket, createMockServer } from "../test/socket-mocks";

vi.mock("../db/circles", () => ({
  isUserInCircle: vi.fn(),
  getTopicIdsForCircle: vi.fn(),
}));
vi.mock("../db/topics", () => ({
  isUserInTopic: vi.fn(),
  getParentCircleIdForTopic: vi.fn(),
}));
vi.mock("../db/topic-read-state", () => ({
  markTopicRead: vi.fn(),
}));

import { isUserInTopic, getParentCircleIdForTopic } from "../db/topics";
import { markTopicRead } from "../db/topic-read-state";
import {
  RoomType,
  toRoomKey,
  getRoomKeyOrFail,
  registerRoomEvent,
  handleJoinRoom,
  handleLeaveRoom,
  emitUserChangeInTopic,
} from "./rooms";
import { SocketEvent } from "@tim/socket-types";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("toRoomKey", () => {
  it("joins the room type and id with the room key indicator", () => {
    expect(toRoomKey({ id: "abc", roomType: RoomType.Topic })).toBe(
      "topic::abc",
    );
    expect(toRoomKey({ id: "abc", roomType: RoomType.Circle })).toBe(
      "circle::abc",
    );
  });
});

describe("getRoomKeyOrFail", () => {
  it("returns the room key when the socket is already in that room", () => {
    const socket = createMockSocket();
    socket.rooms.add("topic::abc");

    expect(
      getRoomKeyOrFail({
        socket: socket as any,
        id: "abc",
        roomType: RoomType.Topic,
      }),
    ).toBe("topic::abc");
  });

  it("returns false when the socket is not in that room", () => {
    const socket = createMockSocket();

    expect(
      getRoomKeyOrFail({
        socket: socket as any,
        id: "abc",
        roomType: RoomType.Topic,
      }),
    ).toBe(false);
  });
});

describe("registerRoomEvent", () => {
  it("calls the handler with the roomKey when the socket is in the room", async () => {
    const socket = createMockSocket({ id: "user-1" });
    socket.rooms.add("topic::topic-1");
    const server = createMockServer();
    const handler = vi.fn();

    registerRoomEvent({
      socket: socket as any,
      server: server as any,
      event: SocketEvent.ToggleHighlight,
      roomType: RoomType.Topic,
      getId: (payload: { topicId: string }) => payload.topicId,
      handler,
    });

    const payload = { topicId: "topic-1" };
    await socket.trigger(SocketEvent.ToggleHighlight, payload);

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ payload, roomKey: "topic::topic-1" }),
    );
  });

  it("does not call the handler when the socket is not in the room", async () => {
    const socket = createMockSocket({ id: "user-1" });
    const server = createMockServer();
    const handler = vi.fn();

    registerRoomEvent({
      socket: socket as any,
      server: server as any,
      event: SocketEvent.ToggleHighlight,
      roomType: RoomType.Topic,
      getId: (payload: { topicId: string }) => payload.topicId,
      handler,
    });

    await socket.trigger(SocketEvent.ToggleHighlight, { topicId: "topic-1" });

    expect(handler).not.toHaveBeenCalled();
  });
});

describe("emitUserChangeInTopic", () => {
  it("merges a user's duplicate sockets (multiple tabs) instead of picking one arbitrarily", async () => {
    vi.mocked(getParentCircleIdForTopic).mockResolvedValue({
      id: "circle-1",
    } as any);

    const idleSocket = createMockSocket({
      id: "user-1",
      state: { isIdle: true, isTyping: false },
    });
    const typingSocket = createMockSocket({
      id: "user-1",
      state: { isIdle: false, isTyping: true },
    });
    const server = createMockServer({
      socketsInRoom: [idleSocket as any, typingSocket as any],
    });
    const actingSocket = createMockSocket({ id: "user-1" });

    await emitUserChangeInTopic({
      server: server as any,
      socket: actingSocket as any,
      topicId: "topic-1",
    });

    // Idle only if every one of the user's sockets is idle (false here,
    // since typingSocket isn't); typing if any of them is (true here).
    expect(server.emit).toHaveBeenCalledWith(
      SocketEvent.UserJoinedOrLeftTopic,
      expect.objectContaining({
        activeUsers: [
          { id: "user-1", state: { isIdle: false, isTyping: true } },
        ],
      }),
    );
  });

  it("keeps a user's other tab active when only one of their sockets is disconnecting", async () => {
    vi.mocked(getParentCircleIdForTopic).mockResolvedValue({
      id: "circle-1",
    } as any);

    // The "disconnecting" event fires before the socket leaves its rooms, so
    // fetchSockets() still returns both of this user's tabs here -- only the
    // one actually disconnecting should be excluded, not the whole user.
    const disconnectingTab = createMockSocket(
      { id: "user-1", state: { isIdle: false, isTyping: true } },
      "socket-a",
    );
    const remainingTab = createMockSocket(
      { id: "user-1", state: { isIdle: false, isTyping: false } },
      "socket-b",
    );
    const server = createMockServer({
      socketsInRoom: [disconnectingTab as any, remainingTab as any],
    });

    await emitUserChangeInTopic({
      server: server as any,
      socket: disconnectingTab as any,
      topicId: "topic-1",
      disconnectingSocketId: "socket-a",
    });

    expect(server.emit).toHaveBeenCalledWith(
      SocketEvent.UserJoinedOrLeftTopic,
      expect.objectContaining({
        activeUsers: [
          { id: "user-1", state: { isIdle: false, isTyping: false } },
        ],
      }),
    );
  });
});

describe("handleJoinRoom", () => {
  it("joins a topic room and notifies the circle when membership checks out", async () => {
    vi.mocked(isUserInTopic).mockResolvedValue(true);
    vi.mocked(getParentCircleIdForTopic).mockResolvedValue({
      id: "circle-1",
    } as any);

    const socket = createMockSocket({ id: "user-1" });
    const server = createMockServer();
    handleJoinRoom({ socket: socket as any, server: server as any });

    await socket.trigger(SocketEvent.JoinRoom, {
      id: "topic-1",
      roomType: RoomType.Topic,
    });

    expect(socket.join).toHaveBeenCalledWith("topic::topic-1");
    expect(isUserInTopic).toHaveBeenCalledWith({
      userId: "user-1",
      topicId: "topic-1",
    });
    // emitUserChangeInTopic is fired without being awaited by the handler.
    await vi.waitFor(() => {
      expect(server.to).toHaveBeenCalledWith("circle::circle-1");
      expect(server.emit).toHaveBeenCalledWith(
        SocketEvent.UserJoinedOrLeftTopic,
        expect.objectContaining({ topicId: "topic-1" }),
      );
      expect(markTopicRead).toHaveBeenCalledWith({
        userId: "user-1",
        topicId: "topic-1",
      });
    });
  });

  it("does not join the room when the user lacks access", async () => {
    vi.mocked(isUserInTopic).mockResolvedValue(false);

    const socket = createMockSocket({ id: "user-1" });
    const server = createMockServer();
    handleJoinRoom({ socket: socket as any, server: server as any });

    await socket.trigger(SocketEvent.JoinRoom, {
      id: "topic-1",
      roomType: RoomType.Topic,
    });

    expect(socket.join).not.toHaveBeenCalled();
    expect(markTopicRead).not.toHaveBeenCalled();
  });

  it("ignores a payload missing id or roomType", async () => {
    const socket = createMockSocket();
    const server = createMockServer();
    handleJoinRoom({ socket: socket as any, server: server as any });

    await socket.trigger(SocketEvent.JoinRoom, {
      id: "",
      roomType: RoomType.Topic,
    });

    expect(isUserInTopic).not.toHaveBeenCalled();
    expect(socket.join).not.toHaveBeenCalled();
  });
});

describe("handleLeaveRoom", () => {
  it("leaves a topic room and marks the topic read", async () => {
    vi.mocked(getParentCircleIdForTopic).mockResolvedValue({
      id: "circle-1",
    } as any);

    const socket = createMockSocket({ id: "user-1" });
    const server = createMockServer();
    handleLeaveRoom({ socket: socket as any, server: server as any });

    await socket.trigger(SocketEvent.LeaveRoom, {
      id: "topic-1",
      roomType: RoomType.Topic,
    });

    expect(socket.leave).toHaveBeenCalledWith("topic::topic-1");
    // handleLeaveRoom fires emitUserChangeInTopic without awaiting it, so
    // its DB call lands on a later microtask than the handler's return.
    await vi.waitFor(() =>
      expect(markTopicRead).toHaveBeenCalledWith({
        userId: "user-1",
        topicId: "topic-1",
      }),
    );
  });

  it("stays quiet when the topic can't be marked read because the topic was deleted", async () => {
    vi.mocked(getParentCircleIdForTopic).mockResolvedValue(undefined as any);
    vi.mocked(markTopicRead).mockRejectedValue({ code: "23503" });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await emitUserChangeInTopic({
      server: createMockServer() as any,
      socket: createMockSocket({ id: "user-1" }) as any,
      topicId: "topic-1",
      markRead: true,
    });

    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("logs unexpected mark-read failures instead of swallowing them", async () => {
    vi.mocked(getParentCircleIdForTopic).mockResolvedValue(undefined as any);
    vi.mocked(markTopicRead).mockRejectedValue(new Error("connection lost"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await emitUserChangeInTopic({
      server: createMockServer() as any,
      socket: createMockSocket({ id: "user-1" }) as any,
      topicId: "topic-1",
      markRead: true,
    });

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("leaving a circle room emits UserLeftCircle without a DB call", async () => {
    const socket = createMockSocket({ id: "user-1" });
    const server = createMockServer();
    handleLeaveRoom({ socket: socket as any, server: server as any });

    await socket.trigger(SocketEvent.LeaveRoom, {
      id: "circle-1",
      roomType: RoomType.Circle,
    });

    expect(socket.leave).toHaveBeenCalledWith("circle::circle-1");
    expect(server.to).toHaveBeenCalledWith("circle::circle-1");
    expect(server.emit).toHaveBeenCalledWith(SocketEvent.UserLeftCircle, {
      circleId: "circle-1",
    });
    expect(markTopicRead).not.toHaveBeenCalled();
  });
});
