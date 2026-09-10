import { beforeEach, describe, it, expect } from "vitest";
import { prismaClient, resetDb } from "@/test/db";

beforeEach(resetDb);

async function createUser(overrides: Partial<{ googleId: string; name: string; email: string }> = {}) {
  return prismaClient.user.create({
    data: {
      googleId: overrides.googleId ?? `google-${crypto.randomUUID()}`,
      name: overrides.name ?? "Test User",
      email: overrides.email ?? `${crypto.randomUUID()}@example.com`,
    },
  });
}

describe("circleModel.isUserInCircle", () => {
  it("returns true when the user is a member", async () => {
    const owner = await createUser();
    const circle = await prismaClient.circle.create({
      data: {
        name: "Test Circle",
        userId: owner.id,
        members: { connect: [{ id: owner.id }] },
      },
    });

    await expect(
      prismaClient.circle.isUserInCircle({ circleId: circle.id, userId: owner.id })
    ).resolves.toBe(true);
  });

  it("returns false when the user is not a member", async () => {
    const owner = await createUser();
    const outsider = await createUser();
    const circle = await prismaClient.circle.create({
      data: {
        name: "Test Circle",
        userId: owner.id,
        members: { connect: [{ id: owner.id }] },
      },
    });

    await expect(
      prismaClient.circle.isUserInCircle({ circleId: circle.id, userId: outsider.id })
    ).resolves.toBe(false);
  });

  it("returns false when circleId or userId is missing", async () => {
    await expect(
      prismaClient.circle.isUserInCircle({ circleId: undefined, userId: "x" })
    ).resolves.toBe(false);
    await expect(
      prismaClient.circle.isUserInCircle({ circleId: "x", userId: undefined })
    ).resolves.toBe(false);
  });
});

describe("circleModel.getForUser", () => {
  it("returns only circles the user is a member of", async () => {
    const member = await createUser();
    const outsider = await createUser();
    await prismaClient.circle.create({
      data: { name: "Mine", userId: member.id, members: { connect: [{ id: member.id }] } },
    });
    await prismaClient.circle.create({
      data: { name: "Not mine", userId: outsider.id, members: { connect: [{ id: outsider.id }] } },
    });

    const circles = await prismaClient.circle.getForUser({
      userId: member.id,
      select: { name: true },
    });

    expect(circles).toEqual([{ name: "Mine" }]);
  });

  it("returns undefined when userId is missing", async () => {
    await expect(
      prismaClient.circle.getForUser({ userId: undefined, select: { name: true } })
    ).resolves.toBeUndefined();
  });
});

describe("circleModel.upsertForUser", () => {
  it("creates a circle with a default topic and the creator as a member", async () => {
    const owner = await createUser();

    const result = await prismaClient.circle.upsertForUser({
      userId: owner.id,
      circleId: null,
      name: "New Circle",
      description: null,
      imageUrl: null,
      memberEmails: null,
      defaultTopicName: null,
    });

    expect(result).not.toBe(false);
    if (result === false) return;

    expect(result.data.name).toBe("New Circle");
    expect(result.data.defaultTopicId).toBeTruthy();

    const topic = await prismaClient.topic.findUnique({
      where: { id: result.data.defaultTopicId! },
    });
    expect(topic?.name).toBe("General");
    expect(topic?.circleId).toBe(result.data.id);
  });

  it("refuses to update a circle the user doesn't own", async () => {
    const owner = await createUser();
    const attacker = await createUser();
    const circle = await prismaClient.circle.create({
      data: { name: "Original", userId: owner.id, members: { connect: [{ id: owner.id }] } },
    });

    const result = await prismaClient.circle.upsertForUser({
      userId: attacker.id,
      circleId: circle.id,
      name: "Hijacked",
      description: null,
      imageUrl: null,
      memberEmails: null,
      defaultTopicName: null,
    });

    expect(result).toBe(false);
  });
});

describe("circleModel.deleteByIdForUser", () => {
  it("deletes a circle owned by the user", async () => {
    const owner = await createUser();
    const circle = await prismaClient.circle.create({
      data: { name: "Doomed", userId: owner.id, members: { connect: [{ id: owner.id }] } },
    });

    const result = await prismaClient.circle.deleteByIdForUser({
      userId: owner.id,
      circleId: circle.id,
    });

    expect(result).not.toBe(false);
    await expect(
      prismaClient.circle.findUnique({ where: { id: circle.id } })
    ).resolves.toBeNull();
  });

  it("refuses to delete a circle the user doesn't own", async () => {
    const owner = await createUser();
    const attacker = await createUser();
    const circle = await prismaClient.circle.create({
      data: { name: "Not yours", userId: owner.id, members: { connect: [{ id: owner.id }] } },
    });

    const result = await prismaClient.circle.deleteByIdForUser({
      userId: attacker.id,
      circleId: circle.id,
    });

    expect(result).toBe(false);
    await expect(
      prismaClient.circle.findUnique({ where: { id: circle.id } })
    ).resolves.not.toBeNull();
  });
});
