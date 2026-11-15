import { STARTING_CHIPS, TableGame } from "@tim/casino";

export type ChipSettlement = {
  circleId: string;
  userId: string;
  game: TableGame;
  net: number;
};

// Swapped for a DB-backed store when chips persist (TIM-8).
export interface ChipStore {
  load(circleId: string, userId: string): Promise<number>;
  settle(settlement: ChipSettlement): Promise<void>;
}

export class InMemoryChipStore implements ChipStore {
  private balances = new Map<string, number>();

  async load(circleId: string, userId: string) {
    return this.balances.get(`${circleId}:${userId}`) ?? STARTING_CHIPS;
  }

  async settle({ circleId, userId, net }: ChipSettlement) {
    const key = `${circleId}:${userId}`;
    this.balances.set(key, (this.balances.get(key) ?? STARTING_CHIPS) + net);
  }
}
