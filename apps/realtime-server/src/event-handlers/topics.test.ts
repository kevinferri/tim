import { beforeEach, describe, it, expect, vi } from "vitest";
import { createMockSocket, createMockServer } from "../test/socket-mocks";
import { handleUpsertedTopic, handleDeletedTopic } from "./topics";
import { SocketEvent } from "@tim/socket-types";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("handleUpsertedTopic", () => {
  it("re-broadcasts to the circle room when the socket is a member", async () => {
    const socket = createMockSocket({ id: "user-1" });
    socket.rooms.add("circle::circle-1");
    const server = createMockServer();
    handleUpsertedTopic({ socket: socket as any, server: server as any });

    const payload = { circleId: "circle-1", id: "topic-1", name: "General" };
    await socket.trigger(SocketEvent.UpsertedTopic, payload);

    expect(server.to).toHaveBeenCalledWith("circle::circle-1");
    expect(server.emit).toHaveBeenCalledWith(SocketEvent.UpsertedTopic, payload);
  });

  it("does nothing when the socket isn't in the circle room", async () => {
    const socket = createMockSocket({ id: "user-1" });
    const server = createMockServer();
    handleUpsertedTopic({ socket: socket as any, server: server as any });

    await socket.trigger(SocketEvent.UpsertedTopic, { circleId: "circle-1", id: "topic-1" });

    expect(server.emit).not.toHaveBeenCalled();
  });
});

describe("handleDeletedTopic", () => {
  it("re-broadcasts to the circle room when the socket is a member", async () => {
    const socket = createMockSocket({ id: "user-1" });
    socket.rooms.add("circle::circle-1");
    const server = createMockServer();
    handleDeletedTopic({ socket: socket as any, server: server as any });

    const payload = { circleId: "circle-1", id: "topic-1" };
    await socket.trigger(SocketEvent.DeletedTopic, payload);

    expect(server.to).toHaveBeenCalledWith("circle::circle-1");
    expect(server.emit).toHaveBeenCalledWith(SocketEvent.DeletedTopic, payload);
  });

  it("does nothing when the socket isn't in the circle room", async () => {
    const socket = createMockSocket({ id: "user-1" });
    const server = createMockServer();
    handleDeletedTopic({ socket: socket as any, server: server as any });

    await socket.trigger(SocketEvent.DeletedTopic, { circleId: "circle-1", id: "topic-1" });

    expect(server.emit).not.toHaveBeenCalled();
  });
});
