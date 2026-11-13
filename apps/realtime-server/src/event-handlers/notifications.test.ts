import { describe, it, expect, vi } from "vitest";
import { SocketEvent } from "@tim/socket-types";
import { createMockSocket, createMockServer } from "../test/socket-mocks";
import { handleCircleNotificationsChanged } from "./notifications";

function setup({ inCircle = true } = {}) {
  const socket = createMockSocket({ id: "u1" });
  if (inCircle) socket.join("circle::c1");
  const roomEmit = vi.fn();
  const to = vi.fn(() => ({ emit: roomEmit }));
  const server = createMockServer();
  handleCircleNotificationsChanged({
    socket: { ...socket, to } as any,
    server: server as any,
  });
  return { socket, to, roomEmit };
}

describe("handleCircleNotificationsChanged", () => {
  it("broadcasts to the circle room, not back to the sender", async () => {
    const { socket, to, roomEmit } = setup();

    await socket.trigger(SocketEvent.CircleNotificationsChanged, {
      circleId: "c1",
    });

    expect(to).toHaveBeenCalledWith("circle::c1");
    expect(roomEmit).toHaveBeenCalledWith(
      SocketEvent.CircleNotificationsChanged,
      { circleId: "c1" },
    );
  });

  it("ignores a sender who isn't in the circle room", async () => {
    const { socket, to } = setup({ inCircle: false });

    await socket.trigger(SocketEvent.CircleNotificationsChanged, {
      circleId: "c1",
    });

    expect(to).not.toHaveBeenCalled();
  });

  it.each([undefined, {}, { circleId: 42 }])(
    "ignores a malformed payload %j",
    async (payload) => {
      const { socket, to } = setup();
      await socket.trigger(SocketEvent.CircleNotificationsChanged, payload);
      expect(to).not.toHaveBeenCalled();
    },
  );
});
