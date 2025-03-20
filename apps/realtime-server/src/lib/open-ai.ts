import { decrypt } from "./encryption";
import { pgClient } from "../db/client";
import { commandRegistry } from "./command-handler";

type User = { id: string; name: string };

function getActiveAndNonActiveUsers({
  activeUsers,
  allUsers,
  currentUserId,
}: {
  activeUsers: User[];
  allUsers: User[];
  currentUserId: string;
}) {
  // Filter out the current user from both lists
  const filteredActiveUsers = activeUsers.filter(
    (user) => user.id !== currentUserId
  );
  const filteredAllUsers = allUsers.filter((user) => user.id !== currentUserId);
  const activeUserIds = new Set(filteredActiveUsers.map((user) => user.id));
  const nonActiveUsers = filteredAllUsers.filter(
    (user) => !activeUserIds.has(user.id)
  );

  return {
    inTopic: filteredActiveUsers.map((user) => `${toFirstName(user.name)}`),
    notInTopic: nonActiveUsers.map((user) => `${toFirstName(user.name)}`),
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

  const timCommand = Object.keys(commandRegistry).find(
    (key) => commandRegistry[key].execute === commandRegistry.tim.execute
  );

  const prompts = [
    `Today is ${today}`,
    `You are a bot named "Tim" in a real time group chat with friends`,
    `Within the chat, users prompt you with the command "${timCommand}"`,
    `Only summarize the messages when you are explicity asked to, otherwise just respond to the prompt`,
    `The topic of the group chat is "${topicName}"`,
    `The person who just sent you a message is named "${toFirstName(
      currentUserName
    )}"`,
  ];

  if (inTopic.length > 0) {
    prompts.push(
      `The other people that are currently in the group chat are named ${inTopic.join(
        ", "
      )}`
    );
  }

  if (notInTopic.length > 0) {
    prompts.push(
      `The people that are currently not in the group chat are named ${notInTopic.join(
        ", "
      )}`
    );
  }

  return prompts.join(". ") + ".";
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
  const queries = [
    pgClient("topics").select("id", "name").where("id", topicId).first(),
    pgClient("_circleMembershipsForUser")
      .select("users.id", "users.name")
      .where("_circleMembershipsForUser.A", circleId)
      .join("users", "_circleMembershipsForUser.B", "users.id"),
    pgClient("messages")
      .select("messages.id", "messages.text", "messages.userId", "users.name")
      .join("users", "messages.userId", "users.id")
      .where("messages.topicId", topicId)
      .orderBy("messages.createdAt", "desc")
      .limit(5),
  ];

  const me = activeUsers.find(({ id }) => id === userId);
  const [topic, members, messages] = await Promise.all(queries);
  const messagePrompts = [];
  const reversed = messages.reverse();
  let messageCount = 1;

  (reversed as { text: string; mediaUrl: string; name: string }[]).forEach(
    (m) => {
      const text = decrypt(m.text);

      messagePrompts.push({
        role: "developer",
        content: `Here is message number ${messageCount}, it was sent by ${toFirstName(
          m.name
        )}: ${text}`,
      });

      messageCount++;

      if (text.startsWith("/tim")) {
        messagePrompts.push({
          role: "developer",
          content: `Here is message number ${messageCount}, it was sent by you: ${m.mediaUrl}`,
        });

        messageCount++;
      }
    }
  );

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

  const endpoint = "https://api.openai.com/v1/chat/completions";
  const body = {
    model: "gpt-4o-mini",
    temperature: 0.9,
    messages: [
      {
        role: "developer",
        content: prompt,
      },
      ...messagePrompts,
      { role: "user", content: query },
    ],
  };

  const resp = await fetch(endpoint, {
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

function toFirstName(name: string) {
  return name.split(" ")[0];
}
