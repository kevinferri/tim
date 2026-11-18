// What a player should be told about their seat across a disconnect, decided from socket events alone.

export type PresenceState = {
  /** The table instance last seen (it changes when the server restarts). */
  tableId: string | null;
  seated: boolean;
  /** Set on disconnect while seated: the table we were seated at. */
  droppedFrom: string | null;
  /** The server announced it was closing (it told players itself). */
  closing: boolean;
};

export type PresenceEvent =
  | { type: "disconnect" }
  | { type: "closing" }
  | { type: "state"; tableId: string; seated: boolean };

/** restarted: the server came back with a new table. disconnected: our own drop stood us up. */
export type PresenceNotice = "restarted" | "disconnected" | null;

export const initialPresence: PresenceState = {
  tableId: null,
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
        state: { ...prev, droppedFrom: prev.seated ? prev.tableId : null },
        notice: null,
      };
    case "closing":
      return { state: { ...prev, closing: true }, notice: null };
    case "state": {
      let notice: PresenceNotice = null;
      if (prev.droppedFrom !== null && !event.seated && !prev.closing) {
        notice =
          event.tableId === prev.droppedFrom ? "disconnected" : "restarted";
      }
      return {
        state: {
          tableId: event.tableId,
          seated: event.seated,
          droppedFrom: null,
          closing: false,
        },
        notice,
      };
    }
  }
}
