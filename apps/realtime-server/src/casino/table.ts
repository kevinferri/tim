import {
  SEAT_COUNT,
  SeatOccupant,
  TABLE_CHAT_MAX_LENGTH,
  TableChatEvent,
  TableChatLine,
  TableChatPayload,
  TableChatSay,
  TableClosingPayload,
  TableErrorPayload,
  TableGame,
} from "@tim/casino";
import { randomUUID } from "node:crypto";
import { SocketEvent } from "@tim/socket-types";
import { AppSocket } from "../lib/socket";
import { TableChatLog } from "./chat-store";

export type BaseSeat = {
  occupant: SeatOccupant;
  /** All-time up/down in this circle, loaded at sit and kept current at settle. */
  net: number;
  /** Stood up mid-round; freed once the round ends. */
  leaving: boolean;
};

type Watcher = {
  socket: AppSocket;
  userId: string;
  spectator: boolean;
  // Live lines held until the recent ones are sent, so they don't get wiped by them.
  held: TableChatLine[] | null;
};

// Chat rate limit: lines per user per window.
const CHAT_LINES_PER_WINDOW = 5;
const CHAT_WINDOW_MS = 5_000;

/** Game-agnostic table: seats, watchers, one phase timer, and broadcast. */
// One per server process, sent in views: it changes only on a restart (tables are dropped and recreated whenever they go idle).
const SERVER_ID = randomUUID();

export abstract class Table<Seat extends BaseSeat, View> {
  readonly serverId = SERVER_ID;

  protected seats: (Seat | null)[] = Array(SEAT_COUNT).fill(null);
  protected closed = false;
  private watchers = new Map<string, Watcher>();
  private chatSentAt = new Map<string, number[]>();
  private timer: { handle: NodeJS.Timeout; deadline: number } | null = null;

  constructor(
    readonly circleId: string,
    readonly game: TableGame,
    private onIdle: () => void,
    private chatLog: TableChatLog,
  ) {}

  /** The state as `userId` should see it (poker will hide others' cards). */
  protected abstract viewFor(userId: string): View;
  /** Stands the user up; called when their last watching socket goes away. */
  abstract stand(userId: string): string | null;
  /** Puts the table back in a safe state after an unexpected error. */
  protected abstract recover(): void;

  /** Resolves once the newcomer has the recent chat too. */
  async addWatcher(socket: AppSocket, { spectator = false } = {}) {
    const watcher: Watcher = {
      socket,
      userId: socket.data.user.id,
      spectator,
      held: spectator ? null : [],
    };
    this.watchers.set(socket.id, watcher);
    socket.emit(SocketEvent.TableState, this.viewFor(socket.data.user.id));
    // Spectators (the Game room) don't show the chat.
    if (spectator) return;
    const ref = { circleId: this.circleId, game: this.game };
    let recent: TableChatSay[] | null = null;
    try {
      recent = await this.chatLog.recent();
    } catch (err) {
      console.error("casino: table chat load failed", err);
    }
    // Left, or watched again (that newer load sends the chat instead).
    if (this.watchers.get(socket.id) !== watcher) return;
    const held = watcher.held ?? [];
    watcher.held = null;
    if (recent) {
      const payload: TableChatPayload = { ...ref, recent };
      socket.emit(SocketEvent.TableChat, payload);
    }
    // A held line can already be in `recent` if its write landed before the load read.
    const loaded = new Set((recent ?? []).map((l) => l.id));
    for (const line of held) {
      if (!loaded.has(line.id)) this.emitLine(socket, line);
    }
  }

  /** Adds a line from a watching player and sends it to everyone at the table; returns an error message, if any. */
  chat(socketId: string, text: string): string | null {
    const watcher = this.watchers.get(socketId);
    if (!watcher || watcher.spectator) return "You're not at this table";
    const clean = text.replace(/\s+/g, " ").trim();
    if (!clean) return null;
    if (clean.length > TABLE_CHAT_MAX_LENGTH) return "That message is too long";
    const now = Date.now();
    const sent = (this.chatSentAt.get(watcher.userId) ?? []).filter(
      (at) => now - at < CHAT_WINDOW_MS,
    );
    if (sent.length >= CHAT_LINES_PER_WINDOW) return "Slow down a little";
    this.chatSentAt.set(watcher.userId, [...sent, now]);

    const { id, name, displayName, imageUrl } = watcher.socket.data.user;
    this.pushLine({
      id: randomUUID(),
      kind: "say",
      userId: id,
      name: name ?? null,
      displayName,
      imageUrl: imageUrl ?? null,
      text: clean,
    });
    return null;
  }

  /** Posts a table event (someone joined or left) to the chat. */
  protected announce(event: Omit<TableChatEvent, "id">) {
    this.pushLine({ ...event, id: randomUUID() });
  }

  private pushLine(line: TableChatLine) {
    // Joins and leaves only matter to whoever's here now, so only what people say is saved.
    if (line.kind === "say") this.chatLog.write(line);
    for (const w of this.watchers.values()) {
      if (w.spectator) continue;
      if (w.held) w.held.push(line);
      else this.emitLine(w.socket, line);
    }
  }

  private emitLine(socket: AppSocket, line: TableChatLine) {
    const payload: TableChatPayload = {
      circleId: this.circleId,
      game: this.game,
      line,
    };
    socket.emit(SocketEvent.TableChat, payload);
  }

  /** Watching as a player, so allowed to sit, stand and act; spectators aren't. */
  isWatching(socketId: string) {
    const watcher = this.watchers.get(socketId);
    return !!watcher && !watcher.spectator;
  }

  removeWatcher(socketId: string) {
    const watcher = this.watchers.get(socketId);
    if (!watcher) return;
    this.watchers.delete(socketId);
    // A spectating tab (e.g. the Game room) doesn't keep its user seated.
    const stillHere = [...this.watchers.values()].some(
      (w) => w.userId === watcher.userId && !w.spectator,
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
