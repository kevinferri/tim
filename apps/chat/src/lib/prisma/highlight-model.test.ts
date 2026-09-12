import { beforeEach, describe, it, expect } from "vitest";
import { prismaClient, resetDb } from "@/test/db";

beforeEach(resetDb);

async function createUser() {
  return prismaClient.user.create({
    data: {
      googleId: `google-${crypto.randomUUID()}`,
      name: "Test User",
      email: `${crypto.randomUUID()}@example.com`,
    },
  });
}

async function createMessageWithTopic(authorId: string) {
  const circle = await prismaClient.circle.create({
    data: {
      name: "Test Circle",
      userId: authorId,
      members: { connect: [{ id: authorId }] },
    },
  });
  const topic = await prismaClient.topic.create({
    data: { name: "Test Topic", userId: authorId, circleId: circle.id },
  });
  return prismaClient.message.create({
    data: { text: "hello", userId: authorId, topicId: topic.id },
  });
}

describe("highlightModel.countGivenByUser", () => {
  it("counts highlights created by the user", async () => {
    const author = await createUser();
    const highlighter = await createUser();
    const message = await createMessageWithTopic(author.id);
    await prismaClient.highlight.create({
      data: { userId: highlighter.id, messageId: message.id },
    });

    await expect(
      prismaClient.highlight.countGivenByUser({ userId: highlighter.id }),
    ).resolves.toBe(1);
    await expect(
      prismaClient.highlight.countGivenByUser({ userId: author.id }),
    ).resolves.toBe(0);
  });

  it("returns 0 when userId is missing", async () => {
    await expect(
      prismaClient.highlight.countGivenByUser({ userId: undefined }),
    ).resolves.toBe(0);
  });
});

describe("highlightModel.countReceivedByUser", () => {
  it("counts highlights on messages authored by the user", async () => {
    const author = await createUser();
    const highlighter = await createUser();
    const message = await createMessageWithTopic(author.id);
    await prismaClient.highlight.create({
      data: { userId: highlighter.id, messageId: message.id },
    });

    await expect(
      prismaClient.highlight.countReceivedByUser({ userId: author.id }),
    ).resolves.toBe(1);
    await expect(
      prismaClient.highlight.countReceivedByUser({ userId: highlighter.id }),
    ).resolves.toBe(0);
  });

  it("returns 0 when userId is missing", async () => {
    await expect(
      prismaClient.highlight.countReceivedByUser({ userId: undefined }),
    ).resolves.toBe(0);
  });
});
