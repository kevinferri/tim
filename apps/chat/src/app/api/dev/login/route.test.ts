import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma/client", () => ({
  prismaClient: {
    user: { getSeedUserByEmail: vi.fn() },
  },
}));
vi.mock("next-auth/jwt", () => ({
  encode: vi.fn(),
}));

import { prismaClient } from "@/lib/prisma/client";
import { encode } from "next-auth/jwt";
import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function makeRequest(email?: string) {
  const url = email
    ? `http://localhost/api/dev/login?email=${encodeURIComponent(email)}`
    : "http://localhost/api/dev/login";
  return new NextRequest(url);
}

describe("GET /api/dev/login", () => {
  it("returns 404 in production, before ever looking up a user", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const res = await GET(makeRequest("ada@example.com"));

    expect(res.status).toBe(404);
    expect(prismaClient.user.getSeedUserByEmail).not.toHaveBeenCalled();
  });

  it("returns 400 when email is missing", async () => {
    vi.stubEnv("NODE_ENV", "development");

    const res = await GET(makeRequest());

    expect(res.status).toBe(400);
    expect(prismaClient.user.getSeedUserByEmail).not.toHaveBeenCalled();
  });

  it("returns 404 when no seed user matches the email", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.mocked(prismaClient.user.getSeedUserByEmail).mockResolvedValue(
      undefined as any,
    );

    const res = await GET(makeRequest("nobody@example.com"));

    expect(res.status).toBe(404);
  });

  it("throws when NEXTAUTH_SECRET is unset, rather than minting an unvalidatable cookie", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXTAUTH_SECRET", "");
    vi.mocked(prismaClient.user.getSeedUserByEmail).mockResolvedValue({
      id: "user-1",
      name: "Ada Lovelace",
      email: "ada@example.com",
      imageUrl: null,
    } as any);

    await expect(GET(makeRequest("ada@example.com"))).rejects.toThrow(
      "NEXTAUTH_SECRET is not set",
    );
    expect(encode).not.toHaveBeenCalled();
  });

  it("throws when NEXTAUTH_COOKIE_KEY is unset, rather than minting an unfindable cookie", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXTAUTH_SECRET", "test-secret");
    vi.stubEnv("NEXTAUTH_COOKIE_KEY", "");
    vi.mocked(prismaClient.user.getSeedUserByEmail).mockResolvedValue({
      id: "user-1",
      name: "Ada Lovelace",
      email: "ada@example.com",
      imageUrl: null,
    } as any);
    vi.mocked(encode).mockResolvedValue("signed-jwt");

    await expect(GET(makeRequest("ada@example.com"))).rejects.toThrow(
      "NEXTAUTH_COOKIE_KEY is not set",
    );
  });

  it("mints a session cookie for the matched user on the happy path", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXTAUTH_SECRET", "test-secret");
    vi.stubEnv("NEXTAUTH_COOKIE_KEY", "next-auth.session-token");
    vi.mocked(prismaClient.user.getSeedUserByEmail).mockResolvedValue({
      id: "user-1",
      name: "Ada Lovelace",
      email: "ada@example.com",
      imageUrl: null,
    } as any);
    vi.mocked(encode).mockResolvedValue("signed-jwt");

    const res = await GET(makeRequest("ada@example.com"));

    expect(res.status).toBe(307);
    expect(encode).toHaveBeenCalledWith({
      token: {
        name: "Ada Lovelace",
        email: "ada@example.com",
        picture: null,
        sub: "user-1",
        id: "user-1",
      },
      secret: "test-secret",
    });
    const cookie = res.cookies.get("next-auth.session-token");
    expect(cookie?.value).toBe("signed-jwt");
    expect(cookie?.httpOnly).toBe(true);
  });
});
