import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockCookies = { get: vi.fn() };
vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve(mockCookies),
}));

import { proxy } from "./proxy";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXTAUTH_COOKIE_KEY", "next-auth.session-token");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function makeRequest(pathname: string) {
  return new NextRequest(`http://localhost${pathname}`);
}

describe("proxy /api/dev bypass", () => {
  it("lets /api/dev/* through with no session cookie outside production", async () => {
    vi.stubEnv("NODE_ENV", "development");
    mockCookies.get.mockReturnValue(undefined);

    const res = await proxy(makeRequest("/api/dev/login"));

    expect(res.status).toBe(200);
  });

  it("still gates /api/dev/* like any other API route in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    mockCookies.get.mockReturnValue(undefined);

    const res = await proxy(makeRequest("/api/dev/login"));

    expect(res.status).toBe(401);
  });
});

describe("proxy baseline auth gate", () => {
  it("returns 401 for an unauthenticated non-dev API request", async () => {
    vi.stubEnv("NODE_ENV", "development");
    mockCookies.get.mockReturnValue(undefined);

    const res = await proxy(makeRequest("/api/topics/topic-1/messages"));

    expect(res.status).toBe(401);
  });

  it("passes through an authenticated request", async () => {
    vi.stubEnv("NODE_ENV", "development");
    mockCookies.get.mockReturnValue({ value: "a-session-token" });

    const res = await proxy(makeRequest("/circles/circle-1"));

    expect(res.status).toBe(200);
  });
});
