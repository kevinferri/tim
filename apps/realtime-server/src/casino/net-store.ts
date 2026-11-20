import { HandRecord, loadCircleNet, recordHand } from "../db/casino-stats";

export type { HandRecord };

/** Where each player's all-time up/down lives; written only when a round settles. */
export interface NetStore {
  load(circleId: string, userId: string): Promise<number>;
  record(hand: HandRecord): Promise<void>;
}

export const dbNetStore: NetStore = {
  load: loadCircleNet,
  record: recordHand,
};

/** For unit tests. */
export class InMemoryNetStore implements NetStore {
  private nets = new Map<string, number>();

  async load(circleId: string, userId: string) {
    return this.nets.get(`${circleId}:${userId}`) ?? 0;
  }

  async record({ circleId, userId, net }: HandRecord) {
    const key = `${circleId}:${userId}`;
    this.nets.set(key, (this.nets.get(key) ?? 0) + net);
  }
}
