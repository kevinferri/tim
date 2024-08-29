import { decrypt } from "../lib/encryption";
import { deleteMessage, editMessage, writeMessage } from "../db/mutations";
import { getRandomGif, getYoutubeVideo } from "../lib/media-fetchers";
import { HandlerArgs, SocketEvent } from "./main";
import { RoomType, getRoomKeyOrFail } from "./rooms";
import { pgClient } from "../db/client";

function getCommandTokens(text: string) {
  const words = text.split(" ");
  const wordsCopy = [...words];
  const commandType = words[0].substring(1, words[0].length).toLowerCase();

  wordsCopy.shift();
  const commandPrompt = wordsCopy.join(" ");

  return { words, commandType, commandPrompt };
}

export function handleSendMessage({ socket, server }: HandlerArgs) {
  socket.on(SocketEvent.SendMessage, async (payload) => {
    const roomKey = getRoomKeyOrFail({
      socket,
      id: payload.topicId,
      roomType: RoomType.Topic,
    });

    if (!roomKey) return;

    let _mediaUrl = payload.mediaUrl;
    const { words, commandType, commandPrompt } = getCommandTokens(
      payload.message
    );

    if (words.length > 0 && words[0].charAt(0) === "/") {
      if (commandType === "giphy") {
        _mediaUrl = await getRandomGif(commandPrompt);
      }

      if (commandType === "youtube" || commandType === "yt") {
        _mediaUrl = await getYoutubeVideo(commandPrompt);
      }
    }

    const savedMessage = await writeMessage({
      userId: socket.data.user.id,
      text: payload.message,
      topicId: payload.topicId,
      mediaUrl: _mediaUrl,
    });

    const emittedMessage = {
      ...savedMessage,
      text: decrypt(savedMessage.text),
      sentBy: socket.data.user,
      createdAt: new Date(),
      highlights: [],
    };

    server.to(roomKey).emit(SocketEvent.SendMessage, emittedMessage);
  });
}

export function handleDeleteMessage({ socket, server }: HandlerArgs) {
  socket.on(SocketEvent.DeleteMessage, async (payload) => {
    const roomKey = getRoomKeyOrFail({
      socket,
      id: payload.topicId,
      roomType: RoomType.Topic,
    });

    if (!roomKey) return;

    const deletedMessage = await deleteMessage({
      userId: socket.data.user.id,
      messageId: payload.messageId,
    });

    if (!deletedMessage) return;

    server
      .to(roomKey)
      .emit(SocketEvent.DeleteMessage, { deletedMessageId: deletedMessage.id });
  });
}

export function handleEditMessage({ socket, server }: HandlerArgs) {
  socket.on(SocketEvent.EditMessage, async (payload) => {
    const roomKey = getRoomKeyOrFail({
      socket,
      id: payload.topicId,
      roomType: RoomType.Topic,
    });

    if (!roomKey || !payload.text) return;

    const editiedMessage = await editMessage({
      userId: socket.data.user.id,
      messageId: payload.messageId,
      text: payload.text,
    });

    if (!editiedMessage) return;

    server.to(roomKey).emit(SocketEvent.EditMessage, {
      ...editiedMessage,
      text: decrypt(editiedMessage.text),
    });
  });
}

export function handleShuffleGif({ socket, server }: HandlerArgs) {
  socket.on(SocketEvent.ShuffleGifMessage, async (payload) => {
    const roomKey = getRoomKeyOrFail({
      socket,
      id: payload.topicId,
      roomType: RoomType.Topic,
    });

    if (!roomKey) return;

    const message = await pgClient("messages")
      .select("id", "text")
      .where("id", payload.messageId)
      .where("userId", socket.data.user.id)
      .first();

    if (!message) return;

    const text = decrypt(message.text);
    const { commandPrompt } = getCommandTokens(text);
    const newGif = await getRandomGif(commandPrompt);

    const shuffledMessage = await editMessage({
      text,
      userId: socket.data.user.id,
      messageId: message.id,
      mediaUrl: newGif,
    });

    server.to(roomKey).emit(SocketEvent.ShuffleGifMessage, {
      messageId: shuffledMessage.id,
      mediaUrl: shuffledMessage.mediaUrl,
    });
  });
}
