import { beforeEach, describe, it, expect, vi } from "vitest";
import { createMockSocket, createMockServer } from "../test/socket-mocks";
import { handleUpsertedCircle, handleDeletedCircle } from "./circles";
import { SocketEvent } from "@tim/socket-types";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("handleUpsertedCircle", () => {
  it("emits to the deduped union of prevMembers and members", async () => {
    const socket = createMockSocket();
    const server = createMockServer();
    handleUpsertedCircle({ socket: socket as any, server: server as any });

    const payload = { prevMembers: ["u1", "u2"], members: ["u2", "u3"] };
    await socket.trigger(SocketEvent.UpsertedCircle, payload);

    expect(server.to).toHaveBeenCalledTimes(3);
    expect(server.to).toHaveBeenCalledWith("user::u1");
    expect(server.to).toHaveBeenCalledWith("user::u2");
    expect(server.to).toHaveBeenCalledWith("user::u3");
    expect(server.emit).toHaveBeenCalledTimes(3);
    expect(server.emit).toHaveBeenCalledWith(SocketEvent.UpsertedCircle, payload);
  });
});

describe("handleDeletedCircle", () => {
  it("emits to every member's user room", async () => {
    const socket = createMockSocket();
    const server = createMockServer();
    handleDeletedCircle({ socket: socket as any, server: server as any });

    const payload = { members: ["u1", "u2"] };
    await socket.trigger(SocketEvent.DeletedCircle, payload);

    expect(server.to).toHaveBeenCalledWith("user::u1");
    expect(server.to).toHaveBeenCalledWith("user::u2");
    expect(server.emit).toHaveBeenCalledTimes(2);
    expect(server.emit).toHaveBeenCalledWith(SocketEvent.DeletedCircle, payload);
  });
});
