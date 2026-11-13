import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/session", () => ({ getLoggedInUserId: vi.fn() }));

import { ApiError, apiRoute } from "./api";

const request = () => new Request("http://localhost/api/thing");

describe("apiRoute", () => {
  it("passes the handler's response through", async () => {
    const route = apiRoute(async (_req: Request) =>
      Response.json({ ok: true }),
    );
    const res = await route(request());
    await expect(res.json()).resolves.toEqual({ ok: true });
  });

  it("turns an ApiError into its status, with a fresh body every time", async () => {
    const route = apiRoute(async (_req: Request) => {
      throw new ApiError(401);
    });

    for (let i = 0; i < 2; i++) {
      const res = await route(request());
      expect(res.status).toBe(401);
      await expect(res.json()).resolves.toEqual({ error: "Unauthorized" });
    }
  });

  it("keeps a custom ApiError message", async () => {
    const route = apiRoute(async (_req: Request) => {
      throw new ApiError(400, "Answer is locked");
    });
    const res = await route(request());
    await expect(res.json()).resolves.toEqual({ error: "Answer is locked" });
  });

  it("hides unexpected errors behind a generic 500", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const route = apiRoute(async (_req: Request) => {
      throw new Error("prisma exploded: connection refused");
    });

    const res = await route(request());

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ error: "Request failed" });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
