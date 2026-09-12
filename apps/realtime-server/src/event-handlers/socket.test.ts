import { beforeEach, describe, it, expect, vi } from "vitest";
import { createMockSocket, createMockServer } from "../test/socket-mocks";

// handleClientConnected/handleClientDisconnected are plain console.log wrappers with no branching -- untested; handleClientDisconnecting has real behavior and is covered below.
//
// An async `vi.mock("./rooms", async (importOriginal) => ({...}))` partial mock here silently doesn't replace the binding socket.ts sees (the real emitUserChangeInTopic runs and swallows a real DB error internally) -- use a plain synchronous full-object mock instead.
vi.mock("./rooms", () => ({
  RoomType: { Topic: "topic", Circle: "circle", User: "user" },
  ROOM_KEY_INDICATOR: "::",
  parseRoomKey: (roomKey: string) => {
    const separatorIndex = roomKey.indexOf("::");
    return {
      roomType: roomKey.slice(0, separatorIndex),
      id: roomKey.slice(separatorIndex + 2),
    };
  },
  emitUserChangeInTopic: vi.fn(),
}));

import { emitUserChangeInTopic } from "./rooms";
import { handleClientDisconnecting } from "./socket";
import { SocketEvent } from "@tim/socket-types";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("handleClientDisconnecting", () => {
  it("records history for topic rooms the socket was in, ignoring non-topic rooms", async () => {
    const socket = createMockSocket({ id: "user-1" });
    socket.rooms.add("topic::topic-1");
    socket.rooms.add("circle::circle-1");
    socket.rooms.add("user::user-1");
    const server = createMockServer();
    handleClientDisconnecting({ socket: socket as any, server: server as any });

    await socket.trigger(SocketEvent.Disconnecting);

    expect(emitUserChangeInTopic).toHaveBeenCalledTimes(1);
    expect(emitUserChangeInTopic).toHaveBeenCalledWith({
      server,
      socket,
      topicId: "topic-1",
      recordHistory: true,
      disconnectingUser: "user-1",
    });
  });

  it("does nothing when the socket wasn't in any topic room", async () => {
    const socket = createMockSocket({ id: "user-1" });
    socket.rooms.add("circle::circle-1");
    const server = createMockServer();
    handleClientDisconnecting({ socket: socket as any, server: server as any });

    await socket.trigger(SocketEvent.Disconnecting);

    expect(emitUserChangeInTopic).not.toHaveBeenCalled();
  });
});
