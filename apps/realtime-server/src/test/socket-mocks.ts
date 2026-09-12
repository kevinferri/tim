import { vi } from "vitest";

// Minimal Socket.IO Socket/Server doubles for unit-testing event handlers without a real connection; call `trigger(event, payload)` to invoke a registered handler.
export function createMockSocket(
  user: Record<string, unknown> = { id: "user-1" },
) {
  const listeners = new Map<string, (...args: any[]) => any>();
  const rooms = new Set<string>();

  const socket = {
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
