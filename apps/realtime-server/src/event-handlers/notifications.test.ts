import { beforeEach, describe, it, expect, vi } from "vitest";
import { SocketEvent } from "@tim/socket-types";
import { createMockSocket, createMockServer } from "../test/socket-mocks";

vi.mock("../db/circles", () => ({
  isUserInCircle: vi.fn(),
  getCircleMembers: vi.fn(),
}));

import { getCircleMembers, isUserInCircle } from "../db/circles";
import { handleCircleNotificationsChanged } from "./notifications";

beforeEach(() => {
  vi.clearAllMocks();
});

function setup() {
  const socket = createMockSocket({ id: "u1" });
  const server = createMockServer();
  handleCircleNotificationsChanged({
    socket: socket as any,
    server: server as any,
  });
  return { socket, server };
}

describe("handleCircleNotificationsChanged", () => {
  it("pings every other member's user room", async () => {
    vi.mocked(isUserInCircle).mockResolvedValue(true);
    vi.mocked(getCircleMembers).mockResolvedValue([
      { id: "u1", name: "A", displayName: "A" },
      { id: "u2", name: "B", displayName: "B" },
      { id: "u3", name: "C", displayName: "C" },
    ]);
    const { socket, server } = setup();

    await socket.trigger(SocketEvent.CircleNotificationsChanged, {
      circleId: "c1",
    });

    expect(isUserInCircle).toHaveBeenCalledWith({
      userId: "u1",
      circleId: "c1",
    });
    expect(server.to.mock.calls).toEqual([["user::u2"], ["user::u3"]]);
    expect(server.emit).toHaveBeenCalledWith(
      SocketEvent.CircleNotificationsChanged,
      { circleId: "c1" },
    );
  });

  it("ignores a sender who isn't in the circle", async () => {
    vi.mocked(isUserInCircle).mockResolvedValue(false);
    const { socket, server } = setup();

    await socket.trigger(SocketEvent.CircleNotificationsChanged, {
      circleId: "c1",
    });

    expect(getCircleMembers).not.toHaveBeenCalled();
    expect(server.to).not.toHaveBeenCalled();
  });

  it.each([undefined, {}, { circleId: 42 }])(
    "ignores a malformed payload %j",
    async (payload) => {
      const { socket, server } = setup();
      await socket.trigger(SocketEvent.CircleNotificationsChanged, payload);
      expect(isUserInCircle).not.toHaveBeenCalled();
      expect(server.to).not.toHaveBeenCalled();
    },
  );
});
