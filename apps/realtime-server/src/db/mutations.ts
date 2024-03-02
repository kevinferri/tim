import { v4 } from "uuid";
import { encrypt } from "./encryption";

export async function writeMessage({
  userId,
  topicId,
  text,
}: {
  userId: string;
  topicId: string;
  text: string;
}) {
  const message = await pgClient("messages")
    .insert({
      id: v4(),
      text: encrypt(text),
      userId,
      topicId,
    })
    .returning(["id", "text", "topicId", "highlightCount"]);

  return message[0];
}
