import {
  CircleStanding,
  HandRecord,
  loadCircleStanding,
  recordHand,
} from "../db/casino-stats";

export type { CircleStanding, HandRecord };

/** Where each player's all-time up/down lives; written only when a round settles. */
export interface NetStore {
  load(circleId: string, userId: string): Promise<CircleStanding>;
  record(hand: HandRecord): Promise<void>;
}

export const dbNetStore: NetStore = {
  load: loadCircleStanding,
  record: recordHand,
};

/** For unit tests. */
export class InMemoryNetStore implements NetStore {
  private standings = new Map<string, CircleStanding>();

  async load(circleId: string, userId: string): Promise<CircleStanding> {
    return (
      this.standings.get(`${circleId}:${userId}`) ?? {
        net: 0,
        lastPlayedAt: null,
      }
    );
  }

  async record({ circleId, userId, net }: HandRecord) {
    const key = `${circleId}:${userId}`;
    const previous = this.standings.get(key)?.net ?? 0;
    this.standings.set(key, { net: previous + net, lastPlayedAt: new Date() });
  }
}
