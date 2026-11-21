import {
  SEAT_COUNT,
  SeatOccupant,
  TableClosingPayload,
  TableErrorPayload,
  TableGame,
} from "@tim/casino";
import { randomUUID } from "node:crypto";
import { SocketEvent } from "@tim/socket-types";
import { AppSocket } from "../lib/socket";

export type BaseSeat = {
  occupant: SeatOccupant;
  /** All-time up/down in this circle, loaded at sit and kept current at settle. */
  net: number;
  /** Stood up mid-round; freed once the round ends. */
  leaving: boolean;
};

type Watcher = { socket: AppSocket; userId: string };

/** Game-agnostic table: seats, watchers, one phase timer, and broadcast. */
// One per server process, sent in views: it changes only on a restart (tables are dropped and recreated whenever they go idle).
const SERVER_ID = randomUUID();

export abstract class Table<Seat extends BaseSeat, View> {
  readonly serverId = SERVER_ID;

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
  /** Puts the table back in a safe state after an unexpected error. */
  protected abstract recover(): void;

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

  /** Free seat closest to the middle of the table, alternating sides: 4, 3, 5, 2, 6, … for 9 seats. */
  nextFreeSeat(): number | null {
    const middle = Math.floor(this.seats.length / 2);
    for (let k = 0; k < this.seats.length; k++) {
      const offset = Math.ceil(k / 2) * (k % 2 ? -1 : 1);
      const i = middle + offset;
      if (i >= 0 && i < this.seats.length && this.seats[i] === null) return i;
    }
    return null;
  }

  isSeatFree(seat: number) {
    return this.seats[seat] === null;
  }

  isClosed() {
    return this.closed;
  }

  /** Clears timers and tells every watcher the table is going away. */
  close() {
    this.closed = true;
    this.clearTimer();
    const payload: TableClosingPayload = {
      circleId: this.circleId,
      game: this.game,
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
      this.guard(undefined, fn);
    }, ms);
    this.timer = { handle, deadline: Date.now() + ms };
  }

  // A throw here would otherwise reach the timer or socket and crash the whole server.
  protected guard<T>(fallback: T, fn: () => T): T {
    try {
      return fn();
    } catch (err) {
      console.error(`casino: ${this.game} table ${this.circleId} failed`, err);
      try {
        this.recover();
      } catch (recoverErr) {
        console.error("casino: table recovery failed", recoverErr);
        this.clearTimer();
      }
      return fallback;
    }
  }

  protected emitErrorToAll(message: string) {
    const payload: TableErrorPayload = {
      circleId: this.circleId,
      game: this.game,
      message,
    };
    for (const { socket } of this.watchers.values()) {
      socket.emit(SocketEvent.TableError, payload);
    }
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
