import { beforeEach, describe, it, expect } from "vitest";
import { pgClient, resetDb } from "../test/db";
import { decrypt } from "../lib/encryption";
import {
  writeMessage,
  editMessage,
  deleteMessage,
  getMessageForUser,
  getMessageOwnerInTopic,
  getMessageHistoryForTopic,
} from "./messages";

beforeEach(resetDb);

async function createUser() {
  const [user] = await pgClient("users")
    .insert({
      id: crypto.randomUUID(),
      googleId: `google-${crypto.randomUUID()}`,
      name: "Test User",
    })
    .returning(["id"]);
  return user.id as string;
}

async function createCircle(userId: string) {
  const [circle] = await pgClient("circles")
    .insert({ id: crypto.randomUUID(), name: "Test Circle", userId })
    .returning(["id"]);
  return circle.id as string;
}

async function createTopic(userId: string, circleId: string) {
  const [topic] = await pgClient("topics")
    .insert({ id: crypto.randomUUID(), name: "Test Topic", userId, circleId })
    .returning(["id"]);
  return topic.id as string;
}

async function createMessage(userId: string, topicId: string, text = "hello") {
  return writeMessage({ userId, topicId, text, mediaUrl: undefined as any });
}

describe("writeMessage", () => {
  it("stores the message text encrypted and returns it decryptable", async () => {
    const userId = await createUser();
    const circleId = await createCircle(userId);
    const topicId = await createTopic(userId, circleId);

    const message = await writeMessage({
      userId,
      topicId,
      text: "hello world",
      mediaUrl: undefined as any,
    });

    expect(decrypt(message.text!, message.id)).toBe("hello world");

    const stored = await pgClient("messages").where("id", message.id).first();
    expect(stored.text).not.toBe("hello world");
  });
});

describe("editMessage", () => {
  it("updates the text of a message owned by the user", async () => {
    const userId = await createUser();
    const circleId = await createCircle(userId);
    const topicId = await createTopic(userId, circleId);
    const message = await createMessage(userId, topicId);

    const edited = await editMessage({
      userId,
      messageId: message.id,
      text: "edited",
      mediaUrl: undefined,
    });

    expect(decrypt(edited.text!, edited.id)).toBe("edited");
  });

  it("does not update a message owned by a different user", async () => {
    const owner = await createUser();
    const attacker = await createUser();
    const circleId = await createCircle(owner);
    const topicId = await createTopic(owner, circleId);
    const message = await createMessage(owner, topicId);

    const result = await editMessage({
      userId: attacker,
      messageId: message.id,
      text: "hijacked",
      mediaUrl: undefined,
    });

    expect(result).toBeUndefined();
  });
});

describe("getMessageForUser", () => {
  it("returns the message id/text when owned by the user", async () => {
    const userId = await createUser();
    const circleId = await createCircle(userId);
    const topicId = await createTopic(userId, circleId);
    const message = await createMessage(userId, topicId);

    await expect(
      getMessageForUser({ messageId: message.id, userId }),
    ).resolves.toEqual({ id: message.id, text: message.text });
  });

  it("returns undefined for a message owned by a different user", async () => {
    const owner = await createUser();
    const outsider = await createUser();
    const circleId = await createCircle(owner);
    const topicId = await createTopic(owner, circleId);
    const message = await createMessage(owner, topicId);

    await expect(
      getMessageForUser({ messageId: message.id, userId: outsider }),
    ).resolves.toBeUndefined();
  });
});

describe("getMessageOwnerInTopic", () => {
  it("returns the message id/userId when it belongs to the topic", async () => {
    const userId = await createUser();
    const circleId = await createCircle(userId);
    const topicId = await createTopic(userId, circleId);
    const message = await createMessage(userId, topicId);

    await expect(
      getMessageOwnerInTopic({ messageId: message.id, topicId }),
    ).resolves.toEqual({ id: message.id, userId });
  });

  it("returns undefined when the message isn't in that topic", async () => {
    const userId = await createUser();
    const circleId = await createCircle(userId);
    const topicId = await createTopic(userId, circleId);
    const otherTopicId = await createTopic(userId, circleId);
    const message = await createMessage(userId, topicId);

    await expect(
      getMessageOwnerInTopic({ messageId: message.id, topicId: otherTopicId }),
    ).resolves.toBeUndefined();
  });
});

describe("getMessageHistoryForTopic", () => {
  it("returns the most recent messages for a topic, oldest first, with sender name", async () => {
    const userId = await createUser();
    const circleId = await createCircle(userId);
    const topicId = await createTopic(userId, circleId);
    await createMessage(userId, topicId, "first");
    await createMessage(userId, topicId, "second");

    const history = await getMessageHistoryForTopic({ topicId, limit: 10 });

    expect(history).toHaveLength(2);
    expect(history.map((m) => decrypt(m.text, m.id))).toEqual([
      "first",
      "second",
    ]);
    expect(history[0].name).toBe("Test User");
  });

  it("respects the limit", async () => {
    const userId = await createUser();
    const circleId = await createCircle(userId);
    const topicId = await createTopic(userId, circleId);
    await createMessage(userId, topicId, "first");
    await createMessage(userId, topicId, "second");
    await createMessage(userId, topicId, "third");

    const history = await getMessageHistoryForTopic({ topicId, limit: 2 });

    expect(history.map((m) => decrypt(m.text, m.id))).toEqual([
      "second",
      "third",
    ]);
  });
});

describe("deleteMessage", () => {
  it("deletes a message owned by the user", async () => {
    const userId = await createUser();
    const circleId = await createCircle(userId);
    const topicId = await createTopic(userId, circleId);
    const message = await createMessage(userId, topicId);

    await deleteMessage({ userId, messageId: message.id });

    await expect(
      pgClient("messages").where("id", message.id).first(),
    ).resolves.toBeUndefined();
  });
});
