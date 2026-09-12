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
vi.mock("../db/topic-history", () => ({
  saveTopicHistory: vi.fn(),
}));

import { isUserInTopic, getParentCircleIdForTopic } from "../db/topics";
import { saveTopicHistory } from "../db/topic-history";
import {
  RoomType,
  toRoomKey,
  getRoomKeyOrFail,
  handleJoinRoom,
  handleLeaveRoom,
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
  it("leaves a topic room and records topic history", async () => {
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
      expect(saveTopicHistory).toHaveBeenCalledWith({
        userId: "user-1",
        topicId: "topic-1",
      }),
    );
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
    expect(saveTopicHistory).not.toHaveBeenCalled();
  });
});
