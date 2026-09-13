import { describe, it, expect, vi } from "vitest";
import { pickRandomOwner, seedCircle } from "./seed";
import { TIM_SANDBOX_EMAIL } from "./seed-constants";

describe("pickRandomOwner", () => {
  it("picks from candidates other than Tim Sandbox", () => {
    const owner = pickRandomOwner([
      TIM_SANDBOX_EMAIL,
      "ada@example.com",
      "alan@example.com",
    ]);

    expect(["ada@example.com", "alan@example.com"]).toContain(owner);
  });

  it("falls back to Tim Sandbox when no other candidates exist", () => {
    expect(pickRandomOwner([TIM_SANDBOX_EMAIL])).toBe(TIM_SANDBOX_EMAIL);
  });
});

function makeTx(existingCircle: { id: string; userId: string } | null) {
  return {
    circle: {
      findFirst: vi.fn().mockResolvedValue(existingCircle),
      update: vi.fn().mockResolvedValue(undefined),
      create: vi.fn(),
    },
    topic: { create: vi.fn() },
    message: { createMany: vi.fn() },
    topicHistory: { createMany: vi.fn() },
  } as any;
}

const usersByEmail = new Map([
  [TIM_SANDBOX_EMAIL, { id: "tim-id" }],
  ["ada@example.com", { id: "ada-id" }],
]);

describe("seedCircle idempotency", () => {
  it("skips an existing same-named circle not owned by a seed user", async () => {
    const tx = makeTx({ id: "circle-1", userId: "some-real-users-id" });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await seedCircle(
      tx,
      {
        name: "Tim's Sandbox",
        ownerEmail: TIM_SANDBOX_EMAIL,
        memberEmails: [TIM_SANDBOX_EMAIL],
        topics: [{ name: "General", messages: [] }],
      },
      usersByEmail,
      0,
    );

    expect(tx.circle.update).not.toHaveBeenCalled();
    expect(tx.circle.create).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("not owned by a seed user"),
    );

    warn.mockRestore();
  });

  it("backfills membership on an existing seed-owned circle", async () => {
    const tx = makeTx({ id: "circle-1", userId: "tim-id" });

    await seedCircle(
      tx,
      {
        name: "Tim's Sandbox",
        ownerEmail: TIM_SANDBOX_EMAIL,
        memberEmails: [TIM_SANDBOX_EMAIL, "ada@example.com"],
        topics: [{ name: "General", messages: [] }],
      },
      usersByEmail,
      0,
    );

    expect(tx.circle.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "circle-1" } }),
    );
    expect(tx.circle.create).not.toHaveBeenCalled();
  });
});
