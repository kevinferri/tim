import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pgClient, resetDb } from "../test/db";
import { addTableChatLine, recentTableChatLines } from "./table-chat";

beforeEach(resetDb);
afterEach(() => vi.useRealTimers());

async function createUser(name: string) {
  const [user] = await pgClient("users")
    .insert({
      id: crypto.randomUUID(),
      googleId: `google-${crypto.randomUUID()}`,
      name: `${name} Full`,
      displayName: name,
    })
    .returning(["id"]);
  return user.id as string;
}

async function setup() {
  const a = await createUser("Ada");
  const b = await createUser("Bo");
  const [circle] = await pgClient("circles")
    .insert({ id: crypto.randomUUID(), name: "Test Circle", userId: a })
    .returning(["id"]);
  return {
    a,
    b,
    ref: { circleId: circle.id as string, game: "blackjack" as const },
  };
}

const person = (userId: string, name: string) => ({
  userId,
  name: `${name} Full`,
  displayName: name,
  imageUrl: null,
});

describe("table chat", () => {
  it("saves what was said, text encrypted, and reads it back in order", async () => {
    const { a, b, ref } = await setup();
    await addTableChatLine(ref, {
      id: "1",
      kind: "say",
      ...person(a, "Ada"),
      text: "evening all",
    });
    await addTableChatLine(ref, {
      id: "2",
      kind: "say",
      ...person(b, "Bo"),
      text: "hi",
    });

    const row = await pgClient("table_chat_lines").where({ id: "1" }).first();
    expect(row.text).not.toContain("evening");

    expect(await recentTableChatLines(ref)).toEqual([
      { id: "1", kind: "say", ...person(a, "Ada"), text: "evening all" },
      { id: "2", kind: "say", ...person(b, "Bo"), text: "hi" },
    ]);
  });

  it("reads only the last 24 hours, only this table, and current names", async () => {
    const { a, ref } = await setup();
    await addTableChatLine(ref, {
      id: "old",
      kind: "say",
      ...person(a, "Ada"),
      text: "old",
    });
    await pgClient("table_chat_lines")
      .where({ id: "old" })
      .update({ createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000) });
    await addTableChatLine(
      { ...ref, game: "other" as "blackjack" },
      { id: "elsewhere", kind: "say", ...person(a, "Ada"), text: "hi" },
    );
    await addTableChatLine(ref, {
      id: "new",
      kind: "say",
      ...person(a, "Ada"),
      text: "new",
    });
    await pgClient("users").where({ id: a }).update({ displayName: "Ada L" });

    const lines = await recentTableChatLines(ref);
    expect(lines.map((l) => l.id)).toEqual(["new"]);
    expect(lines[0]).toMatchObject({ displayName: "Ada L" });
  });

  it("goes when its circle or sender is deleted", async () => {
    const { a, b, ref } = await setup();
    await addTableChatLine(ref, {
      id: "1",
      kind: "say",
      ...person(b, "Bo"),
      text: "hi",
    });
    await pgClient("users").where({ id: b }).del();
    expect(
      await pgClient("table_chat_lines").count({ n: "*" }).first(),
    ).toEqual({ n: "0" });

    await addTableChatLine(ref, {
      id: "2",
      kind: "say",
      ...person(a, "Ada"),
      text: "hi",
    });
    await pgClient("circles").where({ id: ref.circleId }).del();
    expect(
      await pgClient("table_chat_lines").count({ n: "*" }).first(),
    ).toEqual({ n: "0" });
  });

  it("deletes expired lines as new ones come in, at most every 10 minutes", async () => {
    const { a, ref } = await setup();
    await addTableChatLine(ref, {
      id: "1",
      kind: "say",
      ...person(a, "Ada"),
      text: "old",
    });
    await pgClient("table_chat_lines")
      .where({ id: "1" })
      .update({ createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000) });

    vi.useFakeTimers({ toFake: ["Date"], now: Date.now() + 11 * 60 * 1000 });
    await addTableChatLine(ref, {
      id: "2",
      kind: "say",
      ...person(a, "Ada"),
      text: "new",
    });
    const ids = await pgClient("table_chat_lines").pluck("id");
    expect(ids).toEqual(["2"]);
  });
});
