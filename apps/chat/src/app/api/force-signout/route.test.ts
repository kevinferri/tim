import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function makeRequest() {
  return new Request("http://localhost/api/force-signout");
}

describe("GET /api/force-signout", () => {
  it("redirects to sign-in and clears the session cookie when the key is set", async () => {
    vi.stubEnv("NEXTAUTH_COOKIE_KEY", "next-auth.session-token");

    const res = await GET(makeRequest());

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost/signin");

    const cookie = res.cookies.get("next-auth.session-token");
    expect(cookie?.value).toBe("");
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.maxAge).toBe(0);
  });

  it("still redirects when NEXTAUTH_COOKIE_KEY is unset, without clearing a cookie", async () => {
    vi.stubEnv("NEXTAUTH_COOKIE_KEY", "");

    const res = await GET(makeRequest());

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost/signin");
    expect(res.cookies.getAll()).toEqual([]);
  });
});
