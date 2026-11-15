import {
  SEAT_COUNT,
  SeatOccupant,
  TableClosingPayload,
  TableGame,
} from "@tim/casino";
import { SocketEvent } from "@tim/socket-types";
import { AppSocket } from "../lib/socket";

export type BaseSeat = {
  occupant: SeatOccupant;
  stack: number;
  /** Stood up mid-round; freed once the round ends. */
  leaving: boolean;
};

type Watcher = { socket: AppSocket; userId: string };

/** Game-agnostic table: seats, watchers, one phase timer, and broadcast. */
export abstract class Table<Seat extends BaseSeat, View> {
  protected seats: (Seat | null)[] = Array(SEAT_COUNT).fill(null);
  protected closed = false;
  private watchers = new Map<string, Watcher>();
  private timer: { handle: NodeJS.Timeout; deadline: number } | null = null;

  constructor(
    readonly circleId: string,
    readonly game: TableGame,
    private onIdle: () => void,
  ) {}

  /** The state as `userId` should see it (poker will hide others' cards). */
  protected abstract viewFor(userId: string): View;
  /** Stands the user up; called when their last watching socket goes away. */
  abstract stand(userId: string): string | null;

  addWatcher(socket: AppSocket) {
    this.watchers.set(socket.id, { socket, userId: socket.data.user.id });
    socket.emit(SocketEvent.TableState, this.viewFor(socket.data.user.id));
  }

  isWatching(socketId: string) {
    return this.watchers.has(socketId);
  }

  removeWatcher(socketId: string) {
    const watcher = this.watchers.get(socketId);
    if (!watcher) return;
    this.watchers.delete(socketId);
    const stillHere = [...this.watchers.values()].some(
      (w) => w.userId === watcher.userId,
    );
    if (!stillHere && this.seatIndexOf(watcher.userId) !== null) {
      this.stand(watcher.userId);
    }
    this.checkIdle();
  }

  seatIndexOf(userId: string): number | null {
    const i = this.seats.findIndex((s) => s?.occupant.userId === userId);
    return i === -1 ? null : i;
  }

  isSeatFree(seat: number) {
    return this.seats[seat] === null;
  }

  isClosed() {
    return this.closed;
  }

  /** Clears timers and tells every watcher the table is going away. */
  close(message: string) {
    this.closed = true;
    this.clearTimer();
    const payload: TableClosingPayload = {
      circleId: this.circleId,
      game: this.game,
      message,
    };
    for (const { socket } of this.watchers.values()) {
      socket.emit(SocketEvent.TableClosing, payload);
    }
  }

  dispose() {
    this.clearTimer();
  }

  protected broadcast() {
    for (const { socket, userId } of this.watchers.values()) {
      socket.emit(SocketEvent.TableState, this.viewFor(userId));
    }
  }

  protected occupiedSeats(): [number, Seat][] {
    return this.seats.flatMap((s, i) => (s ? [[i, s] as [number, Seat]] : []));
  }

  protected setTimer(ms: number, fn: () => void) {
    this.clearTimer();
    if (this.closed) return;
    const handle = setTimeout(() => {
      this.timer = null;
      fn();
    }, ms);
    this.timer = { handle, deadline: Date.now() + ms };
  }

  protected clearTimer() {
    if (this.timer) clearTimeout(this.timer.handle);
    this.timer = null;
  }

  protected hasTimer() {
    return this.timer !== null;
  }

  protected timerMsLeft(): number | null {
    return this.timer ? Math.max(0, this.timer.deadline - Date.now()) : null;
  }

  protected checkIdle() {
    if (this.watchers.size === 0 && this.occupiedSeats().length === 0) {
      this.onIdle();
    }
  }
}
