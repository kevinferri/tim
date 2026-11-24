import { beforeEach, describe, expect, it, vi } from "vitest";
import { SocketEvent } from "@tim/socket-types";
import { casinoStatus } from "@tim/casino";
import { pgClient, resetDb } from "../test/db";
import { createMockServer, createMockSocket } from "../test/socket-mocks";
import { decrypt } from "../lib/encryption";
import { writeMessage } from "../db/messages";
import {
  ANNOUNCE_COOLDOWN_MS,
  createTablePresence,
  tablePath,
} from "./presence";

// A pass-through spy, so a test can make one write fail.
vi.mock("../db/messages", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../db/messages")>();
  return { ...actual, writeMessage: vi.fn(actual.writeMessage) };
});

beforeEach(resetDb);

const STATUS = casinoStatus("blackjack");
const SET_AT = new Date("2026-11-01T12:00:00.000Z");

async function createUser(status: string | null = null) {
  const id = crypto.randomUUID();
  await pgClient("users").insert({
    id,
    googleId: `google-${id}`,
    name: "Test User",
    displayName: "Test",
    status,
    lastStatusUpdate: status ? SET_AT : null,
  });
  return id;
}

async function createCircle(userId: string, { defaultTopic = true } = {}) {
  const circleId = crypto.randomUUID();
  await pgClient("circles").insert({ id: circleId, name: "Circle", userId });
  await pgClient("_circleMembershipsForUser").insert({
    A: circleId,
    B: userId,
  });
  if (!defaultTopic) return { circleId, topicId: null };
  const topicId = crypto.randomUUID();
  await pgClient("topics").insert({
    id: topicId,
    name: "General",
    userId,
    circleId,
  });
  await pgClient("circles")
    .where("id", circleId)
    .update({ defaultTopicId: topicId });
  return { circleId, topicId };
}

const statusOf = async (userId: string) =>
  pgClient("users")
    .select("status", "lastStatusUpdate")
    .where("id", userId)
    .first();

function setup(start = Date.parse("2026-11-23T20:00:00.000Z")) {
  let clock = start;
  const presence = createTablePresence(() => clock);
  return {
    presence,
    advance: (ms: number) => (clock += ms),
  };
}

async function seat(
  presence: ReturnType<typeof createTablePresence>,
  server: ReturnType<typeof createMockServer>,
  circleId: string,
  userId: string,
) {
  await presence.seated({
    server: server as any,
    circleId,
    game: "blackjack",
    user: { id: userId, displayName: "Test" } as any,
  });
}

const emitted = (server: ReturnType<typeof createMockServer>, event: string) =>
  server.emit.mock.calls.filter(([e]) => e === event).map(([, p]) => p);

describe("sit announcement", () => {
  it("posts a table invite to the default topic", async () => {
    const userId = await createUser();
    const { circleId, topicId } = await createCircle(userId);
    const server = createMockServer();
    const { presence } = setup();

    await seat(presence, server, circleId, userId);

    const rows = await pgClient("messages").where({ topicId });
    expect(rows).toHaveLength(1);
    expect(rows[0].userId).toBe(userId);
    const text = "";
    const mediaUrl = tablePath(circleId, "blackjack");
    expect(decrypt(rows[0].text, rows[0].id)).toBe(text);
    expect(rows[0]).toMatchObject({ mediaUrl, command: "blackjack" });
    expect(server.to).toHaveBeenCalledWith(`circle::${circleId}`);
    expect(emitted(server, SocketEvent.SendMessage)).toEqual([
      expect.objectContaining({
        id: rows[0].id,
        circleId,
        topicId,
        text,
        mediaUrl,
        command: "blackjack",
      }),
    ]);
  });

  it("posts once per circle an hour", async () => {
    const userId = await createUser();
    const { circleId, topicId } = await createCircle(userId);
    const other = await createCircle(userId);
    const server = createMockServer();
    const { presence, advance } = setup();

    await seat(presence, server, circleId, userId);
    await presence.stood({ circleId, game: "blackjack", userId });
    advance(ANNOUNCE_COOLDOWN_MS - 1);
    await seat(presence, server, circleId, userId);
    await seat(presence, server, other.circleId, userId);
    expect(await pgClient("messages").where({ topicId })).toHaveLength(1);
    expect(
      await pgClient("messages").where({ topicId: other.topicId }),
    ).toHaveLength(1);

    await presence.stood({ circleId, game: "blackjack", userId });
    advance(1);
    await seat(presence, server, circleId, userId);
    expect(await pgClient("messages").where({ topicId })).toHaveLength(2);
  });

  it("tries again on the next sit if posting failed", async () => {
    const userId = await createUser();
    const { circleId, topicId } = await createCircle(userId);
    const server = createMockServer();
    const { presence } = setup();
    vi.mocked(writeMessage).mockRejectedValueOnce(new Error("db blip"));
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

    await seat(presence, server, circleId, userId);
    expect(await pgClient("messages").where({ topicId })).toHaveLength(0);
    expect(logged).toHaveBeenCalledWith(
      "casino: sit announcement failed",
      expect.any(Error),
    );
    logged.mockRestore();

    await presence.stood({ circleId, game: "blackjack", userId });
    await seat(presence, server, circleId, userId);
    expect(await pgClient("messages").where({ topicId })).toHaveLength(1);
  });

  it("skips a circle without a default topic", async () => {
    const userId = await createUser();
    const { circleId } = await createCircle(userId, { defaultTopic: false });
    const server = createMockServer();
    const { presence } = setup();

    await seat(presence, server, circleId, userId);

    expect(await pgClient("messages")).toHaveLength(0);
    expect((await statusOf(userId)).status).toBe(STATUS);
  });
});

describe("casino status", () => {
  it("sets it on sit, tells their circles and tabs, and restores the old one on stand", async () => {
    const userId = await createUser("🌴 On vacation");
    const { circleId } = await createCircle(userId);
    const tab = createMockSocket({ id: userId, status: "🌴 On vacation" });
    const server = createMockServer({ socketsInRoom: [tab] });
    const { presence } = setup();

    await seat(presence, server, circleId, userId);

    expect((await statusOf(userId)).status).toBe(STATUS);
    expect(tab.data.user.status).toBe(STATUS);
    expect(server.to).toHaveBeenCalledWith([
      `circle::${circleId}`,
      `user::${userId}`,
    ]);
    expect(emitted(server, SocketEvent.UserUpdatedStatus)).toEqual([
      {
        user: expect.objectContaining({ id: userId, status: STATUS }),
        automatic: true,
      },
    ]);

    server.emit.mockClear();
    await presence.stood({ circleId, game: "blackjack", userId });

    expect(await statusOf(userId)).toEqual({
      status: "🌴 On vacation",
      lastStatusUpdate: SET_AT,
    });
    expect(tab.data.user.status).toBe("🌴 On vacation");
    expect(emitted(server, SocketEvent.UserUpdatedStatus)).toEqual([
      {
        user: expect.objectContaining({
          id: userId,
          status: "🌴 On vacation",
          lastStatusUpdate: SET_AT,
        }),
        automatic: true,
      },
    ]);
  });

  it("keeps a status they set while seated", async () => {
    const userId = await createUser("🌴 On vacation");
    const { circleId } = await createCircle(userId);
    const server = createMockServer();
    const { presence } = setup();

    await seat(presence, server, circleId, userId);
    await pgClient("users").where("id", userId).update({ status: "🍔 Lunch" });
    server.emit.mockClear();
    await presence.stood({ circleId, game: "blackjack", userId });

    expect((await statusOf(userId)).status).toBe("🍔 Lunch");
    expect(emitted(server, SocketEvent.UserUpdatedStatus)).toEqual([]);
  });

  it("restores only once they've left every table", async () => {
    const userId = await createUser(null);
    const a = await createCircle(userId);
    const b = await createCircle(userId);
    const server = createMockServer();
    const { presence } = setup();

    await seat(presence, server, a.circleId, userId);
    await seat(presence, server, b.circleId, userId);
    await presence.stood({ circleId: a.circleId, game: "blackjack", userId });
    expect((await statusOf(userId)).status).toBe(STATUS);

    await presence.stood({ circleId: b.circleId, game: "blackjack", userId });
    expect(await statusOf(userId)).toEqual({
      status: null,
      lastStatusUpdate: null,
    });
  });

  it("clears a casino status left over from a crash instead of restoring it", async () => {
    const userId = await createUser(STATUS);
    const { circleId } = await createCircle(userId);
    const server = createMockServer();
    const { presence } = setup();

    await seat(presence, server, circleId, userId);
    await presence.stood({ circleId, game: "blackjack", userId });

    expect((await statusOf(userId)).status).toBeNull();
  });

  it("restores everyone still seated at shutdown", async () => {
    const userId = await createUser("🎧 Focusing");
    const { circleId } = await createCircle(userId);
    const server = createMockServer();
    const { presence } = setup();

    await seat(presence, server, circleId, userId);
    await presence.restoreAll();

    expect((await statusOf(userId)).status).toBe("🎧 Focusing");
    // Already restored: a late stand is a no-op.
    await presence.stood({ circleId, game: "blackjack", userId });
    expect((await statusOf(userId)).status).toBe("🎧 Focusing");
  });

  it("restores a sit whose status write was still in flight when shutdown began", async () => {
    const userId = await createUser("🎧 Focusing");
    const { circleId } = await createCircle(userId);
    const server = createMockServer();
    const { presence } = setup();

    const sitting = seat(presence, server, circleId, userId);
    await presence.restoreAll();
    await sitting;

    expect((await statusOf(userId)).status).toBe("🎧 Focusing");
  });

  it("ignores a sit once shutdown has begun", async () => {
    const userId = await createUser("🎧 Focusing");
    const { circleId, topicId } = await createCircle(userId);
    const server = createMockServer();
    const { presence } = setup();

    await presence.restoreAll();
    await seat(presence, server, circleId, userId);

    expect((await statusOf(userId)).status).toBe("🎧 Focusing");
    expect(await pgClient("messages").where({ topicId })).toHaveLength(0);
  });
});
