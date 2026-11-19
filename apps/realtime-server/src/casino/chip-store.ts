import { STARTING_CHIPS, TableGame } from "@tim/casino";

export type ChipSettlement = {
  circleId: string;
  userId: string;
  game: TableGame;
  net: number;
};

export type ChipRefill = {
  circleId: string;
  userId: string;
  amount: number;
};

// Swapped for a DB-backed store when chips persist (TIM-8).
export interface ChipStore {
  /** A new player's balance, which sitting down (or going broke at the table) refills to. */
  readonly starting: number;
  load(circleId: string, userId: string): Promise<number>;
  /** A hand's result: the only writes that count as winnings or losses. */
  settle(settlement: ChipSettlement): Promise<void>;
  /** Free chips from a refill: changes the balance, but never counts as a hand won. */
  refill(refill: ChipRefill): Promise<void>;
}

export class InMemoryChipStore implements ChipStore {
  private balances = new Map<string, number>();

  constructor(readonly starting = STARTING_CHIPS) {}

  async load(circleId: string, userId: string) {
    return this.balances.get(`${circleId}:${userId}`) ?? this.starting;
  }

  async settle({ circleId, userId, net }: ChipSettlement) {
    this.add(circleId, userId, net);
  }

  async refill({ circleId, userId, amount }: ChipRefill) {
    this.add(circleId, userId, amount);
  }

  private add(circleId: string, userId: string, amount: number) {
    const key = `${circleId}:${userId}`;
    this.balances.set(key, (this.balances.get(key) ?? this.starting) + amount);
  }
}
