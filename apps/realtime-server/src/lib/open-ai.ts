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
- Users talk to you using "/${timCommand}" followed by their question.
- You can recall recent messages and summarize them if asked.
- Available commands: ${availableCommands.map((c) => `/${c}`).join(", ")}.

# Chat Context
- Topic: "${topicName}"
- Current user: ${toFirstName(currentUserName)}
${inTopic.length ? `- Active: ${inTopic.join(", ")}` : ""}
${notInTopic.length ? `- Offline: ${notInTopic.join(", ")}` : ""}

# Behavior Guidelines
- Be funny and witty. Pretend the user is a close friend.
- Be confident and definitive in your tone.
- Do not end your messages with follow-up questions unless the user explicitly asks for a discussion.
- Avoid filler like "Would you like me to..." or "Should I...?" unless it’s clearly requested.
- Use context from previous messages if helpful.
- If asked for a "summary" or "recap", write a comprehensive summary. Really go into detail.

Here are the app's features:

Messaging & Chat:
- Real-time chat in topics with friends
- Send images, files, and emoji-rich messages
- Message threading and conversation history
- Highlight/bookmark important messages

Circles & Topics:
- Circles are top-level groups where users can create, join, or leave
- Each circle can have multiple topics for focused conversations
- Users can create new topics within a circle
- Topics track recent activity and unread messages

Organization & Navigation:
- Track recently visited topics
- Automatic redirect to last visited conversation
- Unread message indicators

User Interaction:
- User profiles with avatars and status updates
- Real-time presence and activity tracking
- Notifications for messages, connection changes, and events

Real-Time Features:
- Instant message delivery with live updates
- Automatic reconnection and room rejoining
- Activity indicators and typing feedback

Content & UX:
- Persistent message history with timestamps
- Emoji picker, link formatting, and media previews
- Dark/light theme switching, responsive design

Answer users’ questions using this feature set. Do not make up features or technical implementation details.`;
}

async function callOpenAI(messages: { role: string; content: string }[]) {
  const body = {
    model: "gpt-4o-mini",
    temperature: 0.8,
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
  const limit = expand ? 50 : 5; // Fetch more if summarizing
  return pgClient("messages")
    .select("messages.text", "users.name")
    .join("users", "messages.userId", "users.id")
    .where("messages.topicId", topicId)
    .orderBy("messages.createdAt", "desc")
    .limit(limit);
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

  const [topic, members, messages] = await Promise.all([
    pgClient("topics").select("id", "name").where("id", topicId).first(),
    pgClient("_circleMembershipsForUser")
      .select("users.id", "users.name")
      .where("_circleMembershipsForUser.A", circleId)
      .join("users", "_circleMembershipsForUser.B", "users.id"),
    fetchMessageHistory(topicId, isSummaryRequest),
  ]);

  const me = activeUsers.find(({ id }) => id === userId)!;
  const timCommand = findCommandKeyByExecute(commandRegistry.tim);
  const reversed = messages.reverse();
  const messagePrompts = reversed.map((m, i) => ({
    role: "developer",
    content: `Message ${i + 1} from ${toFirstName(m.name)}: ${decrypt(m.text)}`,
  }));

  const { inTopic, notInTopic } = getActiveAndNonActiveUsers({
    activeUsers,
    allUsers: members,
    currentUserId: me.id,
  });

  const prompt = generatePrompt({
    topicName: topic.name,
    currentUserName: me.name,
    inTopic,
    notInTopic,
  });

  const openAIMessages = [
    { role: "system", content: prompt },
    ...messagePrompts,
    { role: "user", content: query },
  ];

  return callOpenAI(openAIMessages);
}
