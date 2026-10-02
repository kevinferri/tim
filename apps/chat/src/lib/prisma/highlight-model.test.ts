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

describe("highlightModel.countsByMemberInCircle", () => {
  it("counts each poster's messages and others' highlights, scoped to the circle", async () => {
    const a = await createUser();
    const b = await createUser();
    const first = await createMessageWithTopic(a.id);
    const topic = await prismaClient.topic.findUniqueOrThrow({
      where: { id: first.topicId },
    });
    const second = await prismaClient.message.create({
      data: { text: "two", userId: a.id, topicId: topic.id },
    });
    const fromB = await prismaClient.message.create({
      data: { text: "hi", userId: b.id, topicId: topic.id },
    });
    // Highlights but never posts: still needs a row for their giving tag.
    const lurker = await createUser();

    await prismaClient.highlight.createMany({
      data: [
        { userId: b.id, messageId: first.id },
        { userId: b.id, messageId: second.id },
        { userId: a.id, messageId: first.id }, // self-highlight: excluded
        { userId: a.id, messageId: fromB.id },
        { userId: lurker.id, messageId: second.id },
      ],
    });
    // A message in another circle shouldn't count.
    await createMessageWithTopic(a.id);

    const rows = await prismaClient.highlight.countsByMemberInCircle({
      circleId: topic.circleId,
    });

    expect(rows).toHaveLength(3);
    expect(rows).toEqual(
      expect.arrayContaining([
        { userId: a.id, messages: 2, highlights: 3, given: 1 },
        { userId: b.id, messages: 1, highlights: 1, given: 2 },
        { userId: lurker.id, messages: 0, highlights: 0, given: 1 },
      ]),
    );
  });
});
