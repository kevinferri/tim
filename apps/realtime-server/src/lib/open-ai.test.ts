import { beforeEach, describe, it, expect, vi } from "vitest";
import { encrypt } from "./encryption";

vi.mock("../db/messages", () => ({
  getMessageHistoryForTopic: vi.fn(),
}));
vi.mock("../db/topics", () => ({
  getTopicSummary: vi.fn(),
}));
vi.mock("../db/circles", () => ({
  getCircleMembers: vi.fn(),
}));

import { getMessageHistoryForTopic } from "../db/messages";
import { getTopicSummary } from "../db/topics";
import { getCircleMembers } from "../db/circles";
import { getChatGpt } from "./open-ai";

const activeUsers = [
  { id: "u1", name: "Alice Smith" },
  { id: "u2", name: "Bob Jones" },
];

function mockOpenAiResponse(content: string) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ choices: [{ message: { content } }] }),
    }),
  );
}

function lastRequestMessages() {
  const call = vi.mocked(fetch).mock.calls[0];
  const body = JSON.parse((call[1] as RequestInit).body as string);
  return body.messages as { role: string; content: string }[];
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getTopicSummary).mockResolvedValue({
    id: "topic-1",
    name: "General",
  } as any);
  vi.mocked(getCircleMembers).mockResolvedValue(activeUsers as any);
});

describe("getChatGpt", () => {
  it("attributes each history message to its sender by name", async () => {
    vi.mocked(getMessageHistoryForTopic).mockResolvedValue([
      {
        id: "m1",
        text: encrypt("hey everyone", "m1"),
        mediaUrl: "",
        name: "Alice Smith",
      },
      {
        id: "m2",
        text: encrypt("/tim summarize the thread", "m2"),
        mediaUrl: "Tim's earlier reply",
        name: "Bob Jones",
      },
    ] as any);
    mockOpenAiResponse("the reply");

    await getChatGpt({
      query: "what's new",
      userId: "u1",
      topicId: "topic-1",
      circleId: "circle-1",
      activeUsers,
    });

    const messages = lastRequestMessages();

    expect(messages).toContainEqual({
      role: "user",
      content: "Alice: hey everyone",
    });
    expect(messages).toContainEqual({
      role: "user",
      content: "Bob: summarize the thread",
    });
    expect(messages).toContainEqual({
      role: "assistant",
      content: "Tim's earlier reply",
    });
  });

  it("carries speaker names into the transcript for a summary request", async () => {
    vi.mocked(getMessageHistoryForTopic).mockResolvedValue([
      {
        id: "m1",
        text: encrypt("shipped the fix", "m1"),
        mediaUrl: "",
        name: "Alice Smith",
      },
    ] as any);
    mockOpenAiResponse("a recap");

    const result = await getChatGpt({
      query: "catch me up",
      userId: "u1",
      topicId: "topic-1",
      circleId: "circle-1",
      activeUsers,
    });

    const messages = lastRequestMessages();
    const transcript = messages.find((m) => m.role === "user")!.content;

    expect(transcript).toContain("Alice: shipped the fix");
    expect(result).toBe("a recap");
  });

  it("describes a non-tim command naturally instead of leaving raw slash syntax", async () => {
    vi.mocked(getMessageHistoryForTopic).mockResolvedValue([
      {
        id: "m1",
        text: encrypt("/giphy cats", "m1"),
        mediaUrl: "http://gif.example/cats.gif",
        name: "Alice Smith",
      },
    ] as any);
    mockOpenAiResponse("the reply");

    await getChatGpt({
      query: "what's new",
      userId: "u1",
      topicId: "topic-1",
      circleId: "circle-1",
      activeUsers,
    });

    const messages = lastRequestMessages();

    expect(messages).toContainEqual({
      role: "user",
      content: 'Alice sent a gif of "cats"',
    });
  });

  it("labels Tim's own past replies in the summary transcript without touching the live message history", async () => {
    vi.mocked(getMessageHistoryForTopic).mockResolvedValue([
      {
        id: "m1",
        text: encrypt("/tim summarize", "m1"),
        mediaUrl: "Tim's earlier reply",
        name: "Bob Jones",
      },
    ] as any);
    mockOpenAiResponse("a recap");

    await getChatGpt({
      query: "catch me up",
      userId: "u1",
      topicId: "topic-1",
      circleId: "circle-1",
      activeUsers,
    });

    const transcript = lastRequestMessages().find(
      (m) => m.role === "user",
    )!.content;

    expect(transcript).toContain("Tim: Tim's earlier reply");
  });

  it("short-circuits an empty topic without calling OpenAI", async () => {
    vi.mocked(getMessageHistoryForTopic).mockResolvedValue([]);
    vi.stubGlobal("fetch", vi.fn());

    const result = await getChatGpt({
      query: "catch me up",
      userId: "u1",
      topicId: "topic-1",
      circleId: "circle-1",
      activeUsers,
    });

    expect(result).toBe("Nothing's happened here yet.");
    expect(fetch).not.toHaveBeenCalled();
  });
});
