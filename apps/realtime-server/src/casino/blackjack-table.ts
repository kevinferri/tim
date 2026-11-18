import {
  BETTING_WINDOW_MS,
  BlackjackPlayAction,
  BlackjackRound,
  BlackjackSeatView,
  BlackjackTableAction,
  BlackjackTablePhase,
  BlackjackTableView,
  Card,
  DEALER_DRAW_MS,
  MAX_BET,
  MIN_BET,
  RESULTS_MS,
  Rng,
  SEAT_COUNT,
  SeatOccupant,
  TURN_MS,
  applyAction,
  dealRound,
  dealerDraw,
  dealerShouldDraw,
  dealerView,
  ensureShoe,
  handView,
  legalActions,
  roundResults,
  settle,
  standSeat,
} from "@tim/casino";
import { BaseSeat, Table } from "./table";
import { ChipStore } from "./chip-store";

type BlackjackSeat = BaseSeat & {
  bet: number | null;
  inRound: boolean;
  lastNet: number | null;
};

export type BlackjackTableDeps = {
  chipStore: ChipStore;
  rng: Rng;
  /** Lets shutdown await settle writes already in flight. */
  trackSettle: (write: Promise<void>) => void;
  onIdle: () => void;
};

const ROUND_FAILED =
  "Something went wrong. This round was cancelled and bets were returned.";

const PLAY_ACTIONS: readonly string[] = ["hit", "stand", "double", "split"];

export class BlackjackTable extends Table<BlackjackSeat, BlackjackTableView> {
  phase: BlackjackTablePhase = "waiting";
  /** Kept across rounds; public so tests can stack it. */
  shoe: Card[] | null = null;
  private round: BlackjackRound | null = null;
  private turnKey: string | null = null;

  constructor(
    circleId: string,
    private deps: BlackjackTableDeps,
  ) {
    super(circleId, "blackjack", deps.onIdle);
  }

  sit(occupant: SeatOccupant, seat: number, stack: number): string | null {
    return this.guard(null, () => this.trySit(occupant, seat, stack));
  }

  stand(userId: string): string | null {
    return this.guard(null, () => this.tryStand(userId));
  }

  act(userId: string, action: BlackjackTableAction): string | null {
    return this.guard(null, () => this.tryAct(userId, action));
  }

  private trySit(
    occupant: SeatOccupant,
    seat: number,
    stack: number,
  ): string | null {
    if (this.closed) return "Table is closing";
    if (!Number.isInteger(seat) || seat < 0 || seat >= SEAT_COUNT) {
      return "Invalid seat";
    }
    if (this.seatIndexOf(occupant.userId) !== null) {
      return "You already have a seat";
    }
    if (!this.isSeatFree(seat)) return "Seat is taken";

    this.seats[seat] = {
      occupant,
      stack,
      leaving: false,
      bet: null,
      inRound: false,
      lastNet: null,
    };
    if (this.phase === "waiting") this.enterBetting();
    else this.broadcast();
    return null;
  }

  private tryStand(userId: string): string | null {
    if (this.closed) return "Table is closing";
    const index = this.seatIndexOf(userId);
    if (index === null) return "You don't have a seat";
    const seat = this.seats[index]!;

    if (!seat.inRound) {
      // Betting refund: chips only move at settle, so nothing to write.
      this.seats[index] = null;
      this.afterSeatFreed();
      return null;
    }

    if (seat.leaving) return null;
    seat.leaving = true;
    if (this.round && this.phase === "players") {
      this.updateRound(standSeat(this.round, index));
    } else {
      this.broadcast();
    }
    return null;
  }

  private tryAct(userId: string, action: BlackjackTableAction): string | null {
    if (this.closed) return "Table is closing";
    const index = this.seatIndexOf(userId);
    if (index === null) return "You don't have a seat";
    if (action.type === "bet") return this.bet(index, action.amount);
    return this.play(index, action.type);
  }

  /** Cancels the round like a deploy would: chips at risk go back, nothing is written. */
  protected recover() {
    this.clearTimer();
    // In results, payouts are already on the stacks.
    if (this.phase !== "results") {
      for (const [i, seat] of this.occupiedSeats()) {
        const player = this.round?.players.find((p) => p.seat === i);
        seat.stack += player
          ? player.hands.reduce((sum, h) => sum + h.bet, 0)
          : (seat.bet ?? 0);
      }
    }
    for (const [i, seat] of this.occupiedSeats()) {
      if (seat.leaving) this.seats[i] = null;
    }
    this.emitErrorToAll(ROUND_FAILED);
    if (this.occupiedSeats().length > 0) this.enterBetting();
    else this.enterWaiting();
  }

  protected hasChipsInPlay() {
    if (this.phase === "players" || this.phase === "dealer") return true;
    return (
      this.phase === "betting" &&
      this.occupiedSeats().some(([, seat]) => seat.bet !== null)
    );
  }

  protected viewFor(): BlackjackTableView {
    const round = this.round;
    const turn = round?.turn ?? null;
    const turnSeat = turn ? this.seats[turn.seat] : null;
    return {
      circleId: this.circleId,
      game: "blackjack",
      tableId: this.tableId,
      phase: this.phase,
      msLeft:
        this.phase === "betting" || this.phase === "players"
          ? this.timerMsLeft()
          : null,
      seats: this.seats.map((seat, i): BlackjackSeatView | null => {
        if (!seat) return null;
        const player = round?.players.find((p) => p.seat === i);
        return {
          seat: i,
          occupant: seat.occupant,
          stack: seat.stack,
          bet: seat.bet,
          inRound: seat.inRound,
          leaving: seat.leaving,
          hands: player ? player.hands.map(handView) : [],
          lastNet: seat.lastNet,
        };
      }),
      dealer: round ? dealerView(round) : { cards: [], total: null },
      turn,
      turnActions:
        round && turn && turnSeat
          ? legalActions(round, turn.seat, turnSeat.stack)
          : [],
      limits: { minBet: MIN_BET, maxBet: MAX_BET },
    };
  }

  private bet(index: number, amount: unknown): string | null {
    const seat = this.seats[index]!;
    if (this.phase !== "betting") return "Betting is closed";
    if (seat.bet !== null) return "You already bet this round";
    if (
      typeof amount !== "number" ||
      !Number.isInteger(amount) ||
      amount < MIN_BET ||
      amount > MAX_BET
    ) {
      return `Bet must be a whole number from ${MIN_BET} to ${MAX_BET}`;
    }
    if (amount > seat.stack) return "Not enough chips";

    seat.stack -= amount;
    seat.bet = amount;
    if (this.everyoneBet()) {
      this.deal();
    } else {
      if (!this.hasTimer()) {
        this.setTimer(BETTING_WINDOW_MS, () => this.deal());
      }
      this.broadcast();
    }
    return null;
  }

  private play(index: number, action: string): string | null {
    if (!PLAY_ACTIONS.includes(action)) return "Unknown action";
    const round = this.round;
    if (!round || this.phase !== "players" || round.turn?.seat !== index) {
      return "It's not your turn";
    }
    const seat = this.seats[index]!;
    const playAction = action as BlackjackPlayAction;
    if (!legalActions(round, index, seat.stack).includes(playAction)) {
      return `You can't ${action} now`;
    }
    const result = applyAction(round, index, playAction, seat.stack);
    seat.stack -= result.wagered;
    // Every decision gets a fresh turn clock, not just a new hand.
    this.turnKey = null;
    this.updateRound(result.round);
    return null;
  }

  private everyoneBet() {
    const seats = this.occupiedSeats();
    return seats.length > 0 && seats.every(([, s]) => s.bet !== null);
  }

  private enterBetting() {
    this.clearTimer();
    this.round = null;
    this.turnKey = null;
    this.phase = "betting";
    for (const [, seat] of this.occupiedSeats()) {
      seat.bet = null;
      seat.inRound = false;
    }
    this.broadcast();
  }

  private enterWaiting() {
    this.clearTimer();
    this.round = null;
    this.turnKey = null;
    this.phase = "waiting";
    this.broadcast();
    this.checkIdle();
  }

  private afterSeatFreed() {
    if (this.occupiedSeats().length === 0) {
      if (this.phase === "betting") this.enterWaiting();
      else this.broadcast();
      this.checkIdle();
      return;
    }
    if (this.phase === "betting") {
      const anyBet = this.occupiedSeats().some(([, s]) => s.bet !== null);
      if (!anyBet) this.clearTimer();
      if (this.everyoneBet()) return this.deal();
    }
    this.broadcast();
  }

  private deal() {
    if (this.closed) return;
    this.clearTimer();
    const entries = this.occupiedSeats()
      .filter(([, s]) => s.bet !== null)
      .map(([i, s]) => ({ seat: i, userId: s.occupant.userId, bet: s.bet! }));
    if (entries.length === 0) return this.broadcast();

    for (const [, seat] of this.occupiedSeats()) {
      seat.inRound = seat.bet !== null;
      seat.lastNet = null;
    }
    this.shoe = ensureShoe(this.shoe, this.deps.rng);
    this.updateRound(dealRound(this.shoe, entries));
  }

  /** Adopts a new engine state and drives the phase that follows from it. */
  private updateRound(round: BlackjackRound) {
    this.round = round;
    this.shoe = round.shoe;

    if (round.phase === "players") {
      this.phase = "players";
      const key = `${round.turn!.seat}:${round.turn!.hand}`;
      if (key !== this.turnKey) {
        this.turnKey = key;
        this.setTimer(TURN_MS, () => this.onTurnTimeout());
      }
      return this.broadcast();
    }

    this.turnKey = null;
    if (round.phase === "dealer") {
      this.phase = "dealer";
      this.broadcast();
      this.setTimer(DEALER_DRAW_MS, () => this.dealerStep());
      return;
    }
    this.settleRound();
  }

  private onTurnTimeout() {
    if (!this.round?.turn) return;
    this.updateRound(standSeat(this.round, this.round.turn.seat));
  }

  private dealerStep() {
    const round = this.round!;
    if (!dealerShouldDraw(round)) return this.settleRound();
    this.round = dealerDraw(round);
    this.shoe = this.round.shoe;
    this.broadcast();
    this.setTimer(DEALER_DRAW_MS, () => this.dealerStep());
  }

  private settleRound() {
    if (this.closed) return;
    const round = settle(this.round!);
    this.round = round;
    this.shoe = round.shoe;

    for (const result of roundResults(round)) {
      const seat = this.seats[result.seat]!;
      seat.stack += result.payout;
      seat.lastNet = result.net;
      this.deps.trackSettle(
        this.writeSettlement(result.userId, result.net).catch((err) =>
          console.error("casino: chip settle failed", err),
        ),
      );
    }

    this.phase = "results";
    this.broadcast();
    this.setTimer(RESULTS_MS, () => this.endResults());
  }

  // A synchronous throw becomes a rejection so it can't stop the payout loop halfway.
  private async writeSettlement(userId: string, net: number) {
    await this.deps.chipStore.settle({
      circleId: this.circleId,
      userId,
      game: "blackjack",
      net,
    });
  }

  private endResults() {
    for (const [i, seat] of this.occupiedSeats()) {
      if (seat.leaving) this.seats[i] = null;
    }
    if (this.occupiedSeats().length > 0) this.enterBetting();
    else this.enterWaiting();
  }
}
