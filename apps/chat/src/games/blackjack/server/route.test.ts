import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/session", () => ({
  getLoggedInUserId: vi.fn(),
}));

vi.mock("@/lib/prisma/client", () => ({
  prismaClient: {
    circle: { isUserInCircle: vi.fn() },
  },
}));

vi.mock("./model", () => ({
  getBlackjackState: vi.fn(),
  isCircleAdmin: vi.fn(),
  setBlackjackEnabled: vi.fn(),
}));

vi.mock("@/games/casino/server", () => ({
  getUpDownStandings: vi.fn(),
}));

import { getLoggedInUserId } from "@/lib/session";
import { prismaClient } from "@/lib/prisma/client";
import { getUpDownStandings } from "@/games/casino/server";
import { getBlackjackState, isCircleAdmin, setBlackjackEnabled } from "./model";
import { GET, POST } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
});

const circleId = "circle-1";
const ctx = { params: Promise.resolve({ circleId }) };

const signIn = (member: boolean) => {
  vi.mocked(getLoggedInUserId).mockResolvedValue("user-1");
  vi.mocked(prismaClient.circle.isUserInCircle).mockResolvedValue(member);
};

const post = (body: unknown) =>
  POST(
    new Request("http://localhost/api", {
      method: "POST",
      body: JSON.stringify(body),
    }),
    ctx,
  );

describe("GET /api/circles/[circleId]/blackjack", () => {
  it("returns 401 when not logged in", async () => {
    vi.mocked(getLoggedInUserId).mockResolvedValue(undefined);
    const res = await GET(new Request("http://localhost/api"), ctx);
    expect(res.status).toBe(401);
  });

  it("returns 403 to non-members, standings included", async () => {
    signIn(false);
    const res = await GET(
      new Request("http://localhost/api?view=standings"),
      ctx,
    );
    expect(res.status).toBe(403);
    expect(getUpDownStandings).not.toHaveBeenCalled();
  });

  it("returns whether it's on and whether you're the admin", async () => {
    signIn(true);
    vi.mocked(getBlackjackState).mockResolvedValue({
      enabled: true,
      isAdmin: false,
    });

    const res = await GET(new Request("http://localhost/api"), ctx);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ enabled: true, isAdmin: false });
    expect(getBlackjackState).toHaveBeenCalledWith(circleId, "user-1");
  });

  it("returns the circle's up/down standings", async () => {
    signIn(true);
    vi.mocked(getUpDownStandings).mockResolvedValue([]);

    const res = await GET(
      new Request("http://localhost/api?view=standings"),
      ctx,
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ standings: [] });
    expect(getUpDownStandings).toHaveBeenCalledWith(circleId);
  });
});

describe("POST /api/circles/[circleId]/blackjack", () => {
  it("returns 403 for non-members", async () => {
    signIn(false);
    const res = await post({ action: "enable" });
    expect(res.status).toBe(403);
    expect(setBlackjackEnabled).not.toHaveBeenCalled();
  });

  it.each(["enable", "disable"])(
    "returns 403 when a member who isn't the admin tries to %s it",
    async (action) => {
      signIn(true);
      vi.mocked(isCircleAdmin).mockResolvedValue(false);
      const res = await post({ action });
      expect(res.status).toBe(403);
      expect(setBlackjackEnabled).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["enable", true],
    ["disable", false],
  ] as const)("lets the admin %s it", async (action, enabled) => {
    signIn(true);
    vi.mocked(isCircleAdmin).mockResolvedValue(true);
    const res = await post({ action });
    expect(res.status).toBe(200);
    expect(setBlackjackEnabled).toHaveBeenCalledWith(circleId, enabled);
  });

  it("returns 400 for an unknown action", async () => {
    signIn(true);
    const res = await post({ action: "deal" });
    expect(res.status).toBe(400);
  });
});
