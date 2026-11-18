// What a player should be told about their seat across a disconnect, decided from socket events alone.

export type PresenceState = {
  /** The server process last seen (it changes only when the server restarts). */
  serverId: string | null;
  seated: boolean;
  /** Set on disconnect while seated: the server we were seated on. */
  droppedFrom: string | null;
  /** The server announced it was closing (it told players itself). */
  closing: boolean;
};

export type PresenceEvent =
  | { type: "disconnect" }
  | { type: "closing" }
  | { type: "state"; serverId: string; seated: boolean };

/** restarted: the server came back as a new process. disconnected: our own drop stood us up. */
export type PresenceNotice = "restarted" | "disconnected" | null;

export const initialPresence: PresenceState = {
  serverId: null,
  seated: false,
  droppedFrom: null,
  closing: false,
};

export function nextPresence(
  prev: PresenceState,
  event: PresenceEvent,
): { state: PresenceState; notice: PresenceNotice } {
  switch (event.type) {
    case "disconnect":
      return {
        state: { ...prev, droppedFrom: prev.seated ? prev.serverId : null },
        notice: null,
      };
    case "closing":
      return { state: { ...prev, closing: true }, notice: null };
    case "state": {
      const sameServer = event.serverId === prev.droppedFrom;
      // Back before the hand ended: the server keeps the seat (leaving) until results, so keep waiting.
      if (prev.droppedFrom !== null && event.seated && sameServer) {
        return {
          state: { ...prev, serverId: event.serverId, seated: true },
          notice: null,
        };
      }
      let notice: PresenceNotice = null;
      if (prev.droppedFrom !== null && !event.seated && !prev.closing) {
        notice = sameServer ? "disconnected" : "restarted";
      }
      return {
        state: {
          serverId: event.serverId,
          seated: event.seated,
          droppedFrom: null,
          closing: false,
        },
        notice,
      };
    }
  }
}
