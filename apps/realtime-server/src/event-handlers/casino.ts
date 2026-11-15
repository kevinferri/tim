import {
  BlackjackTableAction,
  SEAT_COUNT,
  TableErrorPayload,
  TableRef,
} from "@tim/casino";
import { isUserInCircle } from "../db/circles";
import { CasinoRegistry, casinoRegistry } from "../casino/registry";
import { AppSocket } from "../lib/socket";
import { HandlerArgs, SocketEvent } from "./main";

const ACTION_TYPES = ["bet", "hit", "stand", "double", "split"];

function parseRef(payload: any): TableRef | null {
  if (
    !payload ||
    typeof payload.circleId !== "string" ||
    !payload.circleId ||
    payload.game !== "blackjack"
  ) {
    return null;
  }
  return { circleId: payload.circleId, game: payload.game };
}

function parseAction(action: any): BlackjackTableAction | null {
  if (!action || !ACTION_TYPES.includes(action.type)) return null;
  if (action.type === "bet") {
    return Number.isInteger(action.amount)
      ? { type: "bet", amount: action.amount }
      : null;
  }
  return { type: action.type };
}

function emitError(socket: AppSocket, ref: TableRef, message: string | null) {
  if (!message) return;
  const payload: TableErrorPayload = { ...ref, message };
  socket.emit(SocketEvent.TableError, payload);
}

export function handleCasino(args: HandlerArgs) {
  registerCasinoHandlers(args, casinoRegistry);
}

export function registerCasinoHandlers(
  { socket }: HandlerArgs,
  registry: CasinoRegistry,
) {
  const user = () => socket.data.user;

  // Sit/stand/act are only for sockets already watching (authorized at watch).
  const watchedTable = (ref: TableRef) => {
    const table = registry.get(ref.circleId, ref.game);
    if (!table || !table.isWatching(socket.id)) {
      emitError(socket, ref, "You're not at this table");
      return null;
    }
    return table;
  };

  socket.on(SocketEvent.TableWatch, async (payload: unknown) => {
    const ref = parseRef(payload);
    if (!ref) return;
    if (registry.closing) return emitError(socket, ref, "Table is closing");
    const isMember = await isUserInCircle({
      userId: user().id,
      circleId: ref.circleId,
    });
    if (!isMember) return emitError(socket, ref, "Not a member of this circle");
    if (registry.closing) return emitError(socket, ref, "Table is closing");
    registry.getOrCreate(ref.circleId, ref.game).addWatcher(socket);
  });

  socket.on(SocketEvent.TableUnwatch, (payload: unknown) => {
    const ref = parseRef(payload);
    if (!ref) return;
    registry.get(ref.circleId, ref.game)?.removeWatcher(socket.id);
  });

  socket.on(SocketEvent.TableSit, async (payload: any) => {
    const ref = parseRef(payload);
    if (!ref) return;
    const seat = payload.seat;
    if (!Number.isInteger(seat) || seat < 0 || seat >= SEAT_COUNT) {
      return emitError(socket, ref, "Invalid seat");
    }
    const table = watchedTable(ref);
    if (!table) return;
    const { id, name, displayName, imageUrl, createdAt } = user();
    if (table.seatIndexOf(id) !== null) {
      return emitError(socket, ref, "You already have a seat");
    }
    if (!table.isSeatFree(seat)) return emitError(socket, ref, "Seat is taken");

    const stack = await registry.deps.chipStore.load(ref.circleId, id);
    // Re-checked after the await: the socket may have left or the table closed.
    if (registry.closing) return emitError(socket, ref, "Table is closing");
    const current = watchedTable(ref);
    if (!current) return;
    emitError(
      socket,
      ref,
      current.sit(
        { userId: id, name, displayName, imageUrl, createdAt },
        seat,
        stack,
      ),
    );
  });

  socket.on(SocketEvent.TableStand, (payload: unknown) => {
    const ref = parseRef(payload);
    if (!ref) return;
    const table = watchedTable(ref);
    if (table) emitError(socket, ref, table.stand(user().id));
  });

  socket.on(SocketEvent.TableAction, (payload: any) => {
    const ref = parseRef(payload);
    if (!ref) return;
    const action = parseAction(payload.action);
    if (!action) return emitError(socket, ref, "Invalid action");
    const table = watchedTable(ref);
    if (table) emitError(socket, ref, table.act(user().id, action));
  });

  socket.on(SocketEvent.Disconnecting, () => {
    registry.removeSocket(socket.id);
  });
}
