import { beforeEach, describe, it, expect, vi } from "vitest";
import { createMockSocket, createMockServer } from "../test/socket-mocks";

// handleClientConnected/handleClientDisconnected are plain console.log
// wrappers around server.engine.clientsCount with no branching logic --
// not worth testing. handleClientDisconnecting has real behavior (room
// filtering + a disconnect-aware presence update) and is covered below.
//
// NOTE: an async `vi.mock("./rooms", async (importOriginal) => ({...await
// importOriginal(), emitUserChangeInTopic: vi.fn() }))` partial mock here
// silently does NOT replace the binding socket.ts sees -- the real
// emitUserChangeInTopic runs instead (its own internal try/catch around a
// real, unmocked DB call then swallows the resulting FK error, so nothing
// visibly fails; the mock's call count just stays 0). A plain synchronous
// full-object mock avoids that trap.
vi.mock("./rooms", () => ({
  RoomType: { Topic: "topic", Circle: "circle", User: "user" },
  ROOM_KEY_INDICATOR: "::",
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
