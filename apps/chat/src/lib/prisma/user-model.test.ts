import { beforeEach, describe, it, expect } from "vitest";
import { prismaClient, resetDb } from "@/test/db";

beforeEach(resetDb);

async function createUser(overrides: Partial<{ name: string; status: string | null }> = {}) {
  return prismaClient.user.create({
    data: {
      googleId: `google-${crypto.randomUUID()}`,
      name: overrides.name ?? "Test User",
      email: `${crypto.randomUUID()}@example.com`,
      status: overrides.status,
    },
  });
}

describe("userModel.getById", () => {
  it("returns the user for a valid id", async () => {
    const user = await createUser({ name: "Alice" });

    await expect(
      prismaClient.user.getById({ userId: user.id, select: { name: true } })
    ).resolves.toEqual({ name: "Alice" });
  });

  it("returns undefined when userId is missing", async () => {
    await expect(
      prismaClient.user.getById({ userId: undefined, select: { name: true } })
    ).resolves.toBeUndefined();
  });
});

describe("userModel.getMembersForCircle", () => {
  it("returns members of the given circle", async () => {
    const owner = await createUser({ name: "Owner" });
    const member = await createUser({ name: "Member" });
    const circle = await prismaClient.circle.create({
      data: {
        name: "Test Circle",
        userId: owner.id,
        members: { connect: [{ id: owner.id }, { id: member.id }] },
      },
    });

    const members = await prismaClient.user.getMembersForCircle({
      userId: owner.id,
      circleId: circle.id,
      select: { name: true },
    });

    expect(members.map((m) => m.name).sort()).toEqual(["Member", "Owner"]);
  });

  it("returns an empty list when userId is missing", async () => {
    await expect(
      prismaClient.user.getMembersForCircle({
        userId: undefined,
        circleId: "x",
        select: { name: true },
      })
    ).resolves.toEqual([]);
  });
});

describe("userModel.updateStatus", () => {
  it("updates the user's status and sets lastStatusUpdate", async () => {
    const user = await createUser({ status: "away" });

    const result = await prismaClient.user.updateStatus({ userId: user.id, status: "online" });

    expect(result).not.toBe(false);
    if (result === false) return;
    expect(result.data.status).toBe("online");
    expect(result.data.lastStatusUpdate).toBeInstanceOf(Date);
  });

  it("clears lastStatusUpdate when status is set to null", async () => {
    const user = await createUser({ status: "online" });

    const result = await prismaClient.user.updateStatus({ userId: user.id, status: null });

    expect(result).not.toBe(false);
    if (result === false) return;
    expect(result.data.status).toBeNull();
    expect(result.data.lastStatusUpdate).toBeNull();
  });

  it("is a no-op when the status hasn't changed", async () => {
    const user = await createUser({ status: "online" });

    const result = await prismaClient.user.updateStatus({ userId: user.id, status: "online" });

    expect(result).toBe(false);
  });

  it("returns false when userId is missing", async () => {
    await expect(
      prismaClient.user.updateStatus({ userId: undefined, status: "online" })
    ).resolves.toBe(false);
  });
});
