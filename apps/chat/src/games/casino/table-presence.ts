// What a player should be told about their seat across a disconnect, decided from socket events alone.

export type PresenceState = {
  /** The server process last seen (it changes only when the server restarts). */
  serverId: string | null;
  seated: boolean;
  /** Set on disconnect while seated: the server we were seated on. */
  droppedFrom: string | null;
  /** The server announced it was closing (it told players itself). */
  closing: boolean;
  /** We asked to leave, so losing the seat is expected. */
  stood: boolean;
};

export type PresenceEvent =
  | { type: "disconnect" }
  | { type: "closing" }
  | { type: "stand" }
  | {
      type: "state";
      serverId: string;
      seated: boolean;
      /** Your seat is being given up (the server stood you up mid-hand). */
      leaving: boolean;
    };

/** restarted: the server came back as a new process. disconnected: our own drop stood us up. */
export type PresenceNotice = "restarted" | "disconnected" | null;

export const initialPresence: PresenceState = {
  serverId: null,
  seated: false,
  droppedFrom: null,
  closing: false,
  stood: false,
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
    case "stand":
      return { state: { ...prev, stood: prev.seated }, notice: null };
    case "state": {
      const sameServer = event.serverId === prev.droppedFrom;
      // Back before the hand ended: the server keeps the seat (leaving) until results, so keep waiting.
      // Seated and not leaving means the drop never stood us up (another tab, or a fast reconnect).
      if (
        prev.droppedFrom !== null &&
        event.seated &&
        event.leaving &&
        sameServer
      ) {
        return {
          state: { ...prev, serverId: event.serverId, seated: true },
          notice: null,
        };
      }
      let notice: PresenceNotice = null;
      if (
        prev.droppedFrom !== null &&
        !event.seated &&
        !prev.closing &&
        !prev.stood
      ) {
        notice = sameServer ? "disconnected" : "restarted";
      }
      return {
        state: {
          serverId: event.serverId,
          seated: event.seated,
          droppedFrom: null,
          closing: false,
          stood: prev.stood && event.seated,
        },
        notice,
      };
    }
  }
}
