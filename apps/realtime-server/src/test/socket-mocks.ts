import { vi } from "vitest";

let mockSocketIdCounter = 0;

// Minimal Socket.IO Socket/Server doubles for unit-testing event handlers without a real connection; call `trigger(event, payload)` to invoke a registered handler.
// `socketId` is the connection's own id (Socket.io's `socket.id`) -- distinct
// from `user.id`, since one user can have multiple sockets (tabs/devices)
// sharing the same user id but each with their own connection id.
export function createMockSocket(
  user: Record<string, unknown> = { id: "user-1" },
  socketId: string = `mock-socket-${++mockSocketIdCounter}`,
) {
  const listeners = new Map<string, (...args: any[]) => any>();
  const rooms = new Set<string>();

  const socket = {
    id: socketId,
    data: { user },
    rooms,
    on: vi.fn((event: string, cb: (...args: any[]) => any) => {
      listeners.set(event, cb);
    }),
    join: vi.fn((room: string) => rooms.add(room)),
    leave: vi.fn((room: string) => rooms.delete(room)),
    emit: vi.fn(),
    trigger: async (event: string, payload?: unknown) => {
      const cb = listeners.get(event);
      if (!cb) throw new Error(`No handler registered for "${event}"`);
      return cb(payload);
    },
  };

  return socket;
}

export function createMockServer({
  socketsInRoom = [] as ReturnType<typeof createMockSocket>[],
} = {}) {
  const emit = vi.fn();
  const to = vi.fn(() => ({ emit }));
  const fetchSockets = vi.fn().mockResolvedValue(socketsInRoom);
  const inFn = vi.fn(() => ({ fetchSockets }));

  return {
    to,
    in: inFn,
    emit,
    fetchSockets,
  };
}
