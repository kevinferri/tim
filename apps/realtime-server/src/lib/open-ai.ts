import { decrypt } from "./encryption";
import { pgClient } from "../db/client";
import { commandRegistry, findCommandKeyByExecute } from "./command-handler";

type User = { id: string; name: string };

function toFirstName(name: string) {
  return name.split(" ")[0];
}

function getActiveAndNonActiveUsers({
  activeUsers,
  allUsers,
  currentUserId,
}: {
  activeUsers: User[];
  allUsers: User[];
  currentUserId: string;
}) {
  const filteredActive = activeUsers.filter((u) => u.id !== currentUserId);
  const filteredAll = allUsers.filter((u) => u.id !== currentUserId);
  const activeIds = new Set(filteredActive.map((u) => u.id));
  const nonActive = filteredAll.filter((u) => !activeIds.has(u.id));

  return {
    inTopic: filteredActive.map((u) => toFirstName(u.name)),
    notInTopic: nonActive.map((u) => toFirstName(u.name)),
  };
}

function generatePrompt({
  topicName,
  currentUserName,
  inTopic,
  notInTopic,
}: {
  topicName: string;
  currentUserName: string;
  inTopic: string[];
  notInTopic: string[];
}) {
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const timCommand = findCommandKeyByExecute(commandRegistry.tim);
  const availableCommands = Object.keys(commandRegistry).filter(
    (key) => key !== "tim"
  );

  return `# System Context
- Today is ${today}
- You are "Tim", a helpful and witty bot in a small friend group chat.
- Users talk to you using "/${timCommand}" followed by a question.
- Available commands: ${availableCommands.map((c) => `/${c}`).join(", ")}.

# Chat Context
- Topic: "${topicName}"
- Current user: ${toFirstName(currentUserName)}
${inTopic.length ? `- Active: ${inTopic.join(", ")}` : ""}
${notInTopic.length ? `- Offline: ${notInTopic.join(", ")}` : ""}

# Behavior Guidelines
- Be funny, witty, confident, and banter like a close friend.
- Never ask follow-up questions unless explicitly requested.
- Use prior chat context naturally.
- If asked for a recap, write a detailed summary.
- If earlier messages conflict, use the most recent ones.

Use the conversation history below to understand context.`;
}

async function callOpenAI(messages: { role: string; content: string }[]) {
  const body = {
    model: "gpt-4o-mini",
    temperature: 0.4,
    messages,
  };

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) return undefined;
  const json = await resp.json();
  return json.choices[0].message.content;
}

async function fetchMessageHistory(topicId: string, expand: boolean) {
  const limit = expand ? 50 : 20;

  return pgClient("messages")
    .select("messages.text", "messages.mediaUrl", "users.name")
    .join("users", "messages.userId", "users.id")
    .where("messages.topicId", topicId)
    .orderBy("messages.createdAt", "asc")
    .limit(limit);
}

function convertDbRowToMessages(row: {
  text: string;
  mediaUrl: string;
  name: string;
}) {
  const rawText = row.text ? decrypt(row.text) : "";
  const botResponse = row.mediaUrl;
  const isBotTrigger = rawText.startsWith("/tim");

  if (isBotTrigger && botResponse) {
    return [
      {
        role: "user",
        content: `${row.name}: ${rawText.replace(/^\/tim\s*/, "")}`,
      },
      {
        role: "assistant",
        content: botResponse,
      },
    ];
  }

  return [
    {
      role: "user",
      content: `${row.name}: ${rawText}`,
    },
  ];
}

async function summarizeMessages(
  messages: { role: string; content: string }[]
) {
  const text = messages
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n");

  const summaryPrompt = [
    {
      role: "system",
      content:
        "Summarize the conversation in 6-10 sentences. Include speaker names, useful context, decisions, and jokes.",
    },
    {
      role: "user",
      content: text,
    },
  ];

  const summary = await callOpenAI(summaryPrompt);
  return summary ?? "";
}

export async function getChatGpt({
  query,
  userId,
  topicId,
  circleId,
  activeUsers,
}: {
  query: string;
  userId: string;
  topicId: string;
  circleId: string;
  activeUsers: User[];
}) {
  const isSummaryRequest = /\b(summary|summarize|recap|catch\s?up)\b/i.test(
    query
  );

  const [topic, members, rows] = await Promise.all([
    pgClient("topics").select("id", "name").where("id", topicId).first(),
    pgClient("_circleMembershipsForUser")
      .select("users.id", "users.name")
      .where("_circleMembershipsForUser.A", circleId)
      .join("users", "_circleMembershipsForUser.B", "users.id"),
    fetchMessageHistory(topicId, isSummaryRequest),
  ]);

  const currentUser = activeUsers.find((u) => u.id === userId)!;

  let history = rows.flatMap(convertDbRowToMessages);

  if (history.length > 20 && !isSummaryRequest) {
    const older = history.slice(0, history.length - 10);
    const recent = history.slice(-10);

    const summary = await summarizeMessages(older);

    history = [
      { role: "developer", content: `Summary of earlier messages: ${summary}` },
      ...recent,
    ];
  }

  const { inTopic, notInTopic } = getActiveAndNonActiveUsers({
    activeUsers,
    allUsers: members,
    currentUserId: currentUser.id,
  });

  const prompt = generatePrompt({
    topicName: topic.name,
    currentUserName: currentUser.name,
    inTopic,
    notInTopic,
  });

  const messages = [
    { role: "system", content: prompt },
    ...history,
    { role: "user", content: query },
  ];

  return callOpenAI(messages);
}
