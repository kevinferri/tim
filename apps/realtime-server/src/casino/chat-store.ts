import { TABLE_CHAT_KEPT, TableChatSay, TableRef } from "@tim/casino";
import { addTableChatLine, recentTableChatLines } from "../db/table-chat";

/** Where what people said at a table lives between visits (the last 24 hours of it). */
export interface ChatStore {
  add(ref: TableRef, line: TableChatSay): Promise<void>;
  recent(ref: TableRef): Promise<TableChatSay[]>;
}

export const dbChatStore: ChatStore = {
  add: addTableChatLine,
  recent: recentTableChatLines,
};

/** For unit tests. */
export class InMemoryChatStore implements ChatStore {
  private lines = new Map<string, TableChatSay[]>();

  async add({ circleId, game }: TableRef, line: TableChatSay) {
    const key = `${game}:${circleId}`;
    this.lines.set(key, [...(this.lines.get(key) ?? []), line]);
  }

  async recent({ circleId, game }: TableRef) {
    return (this.lines.get(`${game}:${circleId}`) ?? []).slice(
      -TABLE_CHAT_KEPT,
    );
  }
}
