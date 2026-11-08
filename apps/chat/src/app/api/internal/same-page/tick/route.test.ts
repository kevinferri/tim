import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma/client", () => ({
  prismaClient: {
    circle: { findMany: vi.fn() },
    samePageRound: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/same-page/same-page-model", () => ({
  ensureTodayRound: vi.fn(),
  revealRound: vi.fn(),
}));

vi.mock("@/lib/same-page/est-day", async () => {
  const actual = await vi.importActual<typeof import("@/lib/same-page/est-day")>(
    "@/lib/same-page/est-day",
  );
  return {
    ...actual,
    isSamePageActiveDay: vi.fn(),
    getEstHour: vi.fn(),
    getEstGameDate: vi.fn(),
    getSamePagePhase: vi.fn(),
  };
});

import { prismaClient } from "@/lib/prisma/client";
import {
  ensureTodayRound,
  revealRound,
} from "@/lib/same-page/same-page-model";
import {
  getEstGameDate,
  getEstHour,
  getSamePagePhase,
  isSamePageActiveDay,
} from "@/lib/same-page/est-day";
import { POST } from "./route";

const SECRET = "tick-test-secret";

beforeEach(() => {
  vi.clearAllMocks();
  process.env.JWT_SECRET = SECRET;
  vi.mocked(isSamePageActiveDay).mockReturnValue(true);
  vi.mocked(getEstGameDate).mockReturnValue("2026-11-09");
  vi.mocked(getEstHour).mockReturnValue(10);
  vi.mocked(getSamePagePhase).mockReturnValue("play");
  vi.mocked(prismaClient.circle.findMany).mockResolvedValue([
    {
      id: "circle-1",
      members: [{ id: "u1" }, { id: "u2" }],
    },
  ] as any);
});

afterEach(() => {
  delete process.env.JWT_SECRET;
});

function post(auth?: string) {
  return POST(
    new Request("http://localhost/api/internal/same-page/tick", {
      method: "POST",
      headers: auth ? { Authorization: auth } : {},
    }),
  );
}

describe("POST /api/internal/same-page/tick", () => {
  it("rejects missing or wrong bearer tokens", async () => {
    expect((await post()).status).toBe(401);
    expect((await post("Bearer wrong")).status).toBe(401);
  });

  it("accepts a timing-safe JWT_SECRET bearer and emits a prompt once", async () => {
    vi.mocked(ensureTodayRound).mockResolvedValue({
      id: "round-1",
      prompt: "Name a snack",
      promptNotifiedAt: null,
    } as any);
    vi.mocked(prismaClient.samePageRound.updateMany).mockResolvedValue({
      count: 1,
    } as any);

    const res = await post(`Bearer ${SECRET}`);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.alerts).toEqual([
      expect.objectContaining({
        circleId: "circle-1",
        kind: "prompt",
        prompt: "Name a snack",
        userIds: ["u1", "u2"],
      }),
    ]);
    expect(prismaClient.samePageRound.updateMany).toHaveBeenCalledWith({
      where: { id: "round-1", promptNotifiedAt: null },
      data: { promptNotifiedAt: expect.any(Date) },
    });
  });

  it("skips prompt alert when the notify flag was already claimed", async () => {
    vi.mocked(ensureTodayRound).mockResolvedValue({
      id: "round-1",
      prompt: "Name a snack",
    } as any);
    vi.mocked(prismaClient.samePageRound.updateMany).mockResolvedValue({
      count: 0,
    } as any);

    const res = await post(`Bearer ${SECRET}`);
    const body = await res.json();
    expect(body.alerts).toEqual([]);
  });

  it("emits reveal only when newlyRevealed", async () => {
    vi.mocked(getEstHour).mockReturnValue(16);
    vi.mocked(getSamePagePhase).mockReturnValue("results");
    vi.mocked(prismaClient.samePageRound.findUnique).mockResolvedValue({
      id: "round-1",
      prompt: "Name a snack",
      revealedAt: null,
    } as any);
    vi.mocked(revealRound).mockResolvedValue({
      newlyRevealed: true,
      round: { id: "round-1" },
    } as any);

    const res = await post(`Bearer ${SECRET}`);
    const body = await res.json();
    expect(body.alerts).toEqual([
      expect.objectContaining({ kind: "reveal", circleId: "circle-1" }),
    ]);
  });

  it("returns no alerts on inactive days", async () => {
    vi.mocked(isSamePageActiveDay).mockReturnValue(false);
    const res = await post(`Bearer ${SECRET}`);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ alerts: [] });
    expect(prismaClient.circle.findMany).not.toHaveBeenCalled();
  });
});
