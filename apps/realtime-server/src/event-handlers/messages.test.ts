import { beforeEach, describe, it, expect, vi } from "vitest";
import { createMockSocket, createMockServer } from "../test/socket-mocks";
import { encrypt } from "../lib/encryption";

vi.mock("../db/messages", () => ({
  writeMessage: vi.fn(),
  deleteMessage: vi.fn(),
  editMessage: vi.fn(),
  getMessageForUser: vi.fn(),
}));
vi.mock("../lib/media-fetchers", () => ({
  getRandomGif: vi.fn(),
  getYoutubeVideo: vi.fn(),
}));
vi.mock("../lib/open-ai", () => ({
  getChatGpt: vi.fn(),
}));
vi.mock("../db/topics", () => ({
  isUserInTopic: vi.fn().mockResolvedValue(true),
}));

import {
  writeMessage,
  deleteMessage,
  editMessage,
  getMessageForUser,
} from "../db/messages";
import { getRandomGif } from "../lib/media-fetchers";
import {
  handleSendMessage,
  handleDeleteMessage,
  handleEditMessage,
  handleShuffleGif,
} from "./messages";
import { SocketEvent } from "@tim/socket-types";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("handleSendMessage", () => {
  it("saves a plain message and emits it decrypted to the circle room", async () => {
    vi.mocked(writeMessage).mockResolvedValue({
      id: "msg-1",
      text: encrypt("hello"),
      topicId: "topic-1",
      mediaUrl: undefined,
    } as any);

    const socket = createMockSocket({ id: "user-1" });
    socket.rooms.add("circle::circle-1");
    const server = createMockServer();
    handleSendMessage({ socket: socket as any, server: server as any });

    await socket.trigger(SocketEvent.SendMessage, {
      circleId: "circle-1",
      topicId: "topic-1",
      message: "hello",
    });

    expect(writeMessage).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", text: "hello", topicId: "topic-1" })
    );
    expect(server.to).toHaveBeenCalledWith("circle::circle-1");
    expect(server.emit).toHaveBeenCalledWith(
      SocketEvent.SendMessage,
      expect.objectContaining({ text: "hello", circleId: "circle-1" })
    );
  });

  it("does nothing when the socket isn't in the circle room", async () => {
    const socket = createMockSocket({ id: "user-1" });
    const server = createMockServer();
    handleSendMessage({ socket: socket as any, server: server as any });

    await socket.trigger(SocketEvent.SendMessage, {
      circleId: "circle-1",
      topicId: "topic-1",
      message: "hello",
    });

    expect(writeMessage).not.toHaveBeenCalled();
  });

  it("resolves a slash command and attaches the result as mediaUrl", async () => {
    vi.mocked(getRandomGif).mockResolvedValue("http://gif.example/cats.gif");
    vi.mocked(writeMessage).mockResolvedValue({
      id: "msg-1",
      text: encrypt("/giphy cats"),
      topicId: "topic-1",
      mediaUrl: "http://gif.example/cats.gif",
    } as any);

    const socket = createMockSocket({ id: "user-1" });
    socket.rooms.add("circle::circle-1");
    const server = createMockServer();
    handleSendMessage({ socket: socket as any, server: server as any });

    await socket.trigger(SocketEvent.SendMessage, {
      circleId: "circle-1",
      topicId: "topic-1",
      message: "/giphy cats",
    });

    expect(getRandomGif).toHaveBeenCalledWith("cats");
    expect(writeMessage).toHaveBeenCalledWith(
      expect.objectContaining({ mediaUrl: "http://gif.example/cats.gif" })
    );
  });

  it("notifies a mentioned user who's connected in the circle room", async () => {
    vi.mocked(writeMessage).mockResolvedValue({
      id: "msg-1",
      text: encrypt("hey @Bob"),
      topicId: "topic-1",
      mediaUrl: undefined,
    } as any);

    const socket = createMockSocket({ id: "user-1" });
    socket.rooms.add("circle::circle-1");
    const bobSocket = createMockSocket({ id: "bob" });
    const server = createMockServer({ socketsInRoom: [bobSocket as any] });
    handleSendMessage({ socket: socket as any, server: server as any });

    await socket.trigger(SocketEvent.SendMessage, {
      circleId: "circle-1",
      topicId: "topic-1",
      message: "hey @Bob",
      mentionedUserIds: ["bob"],
    });

    expect(bobSocket.emit).toHaveBeenCalledWith(
      "notification:create",
      expect.objectContaining({ messageId: "msg-1", topicId: "topic-1" })
    );
  });
});

describe("handleDeleteMessage", () => {
  it("deletes and emits the deleted message id when owned by the user", async () => {
    vi.mocked(deleteMessage).mockResolvedValue({ id: "msg-1" } as any);

    const socket = createMockSocket({ id: "user-1" });
    socket.rooms.add("topic::topic-1");
    const server = createMockServer();
    handleDeleteMessage({ socket: socket as any, server: server as any });

    await socket.trigger(SocketEvent.DeleteMessage, { topicId: "topic-1", messageId: "msg-1" });

    expect(deleteMessage).toHaveBeenCalledWith({ userId: "user-1", messageId: "msg-1" });
    expect(server.emit).toHaveBeenCalledWith(SocketEvent.DeleteMessage, { deletedMessageId: "msg-1" });
  });

  it("does not emit when the mutation deletes nothing (not owner/not found)", async () => {
    vi.mocked(deleteMessage).mockResolvedValue(undefined);

    const socket = createMockSocket({ id: "user-1" });
    socket.rooms.add("topic::topic-1");
    const server = createMockServer();
    handleDeleteMessage({ socket: socket as any, server: server as any });

    await socket.trigger(SocketEvent.DeleteMessage, { topicId: "topic-1", messageId: "msg-1" });

    expect(server.emit).not.toHaveBeenCalled();
  });

  it("does nothing when not in the topic room", async () => {
    const socket = createMockSocket({ id: "user-1" });
    const server = createMockServer();
    handleDeleteMessage({ socket: socket as any, server: server as any });

    await socket.trigger(SocketEvent.DeleteMessage, { topicId: "topic-1", messageId: "msg-1" });

    expect(deleteMessage).not.toHaveBeenCalled();
  });
});

describe("handleEditMessage", () => {
  it("edits and emits the message decrypted", async () => {
    vi.mocked(editMessage).mockResolvedValue({
      id: "msg-1",
      text: encrypt("updated"),
      mediaUrl: undefined,
    } as any);

    const socket = createMockSocket({ id: "user-1" });
    socket.rooms.add("topic::topic-1");
    const server = createMockServer();
    handleEditMessage({ socket: socket as any, server: server as any });

    await socket.trigger(SocketEvent.EditMessage, {
      topicId: "topic-1",
      messageId: "msg-1",
      text: "updated",
    });

    expect(editMessage).toHaveBeenCalledWith({ userId: "user-1", messageId: "msg-1", text: "updated" });
    expect(server.emit).toHaveBeenCalledWith(
      SocketEvent.EditMessage,
      expect.objectContaining({ text: "updated" })
    );
  });

  it("no-ops when text is missing from the payload", async () => {
    const socket = createMockSocket({ id: "user-1" });
    socket.rooms.add("topic::topic-1");
    const server = createMockServer();
    handleEditMessage({ socket: socket as any, server: server as any });

    await socket.trigger(SocketEvent.EditMessage, { topicId: "topic-1", messageId: "msg-1", text: "" });

    expect(editMessage).not.toHaveBeenCalled();
  });

  it("no-ops when the mutation edits nothing", async () => {
    vi.mocked(editMessage).mockResolvedValue(undefined);

    const socket = createMockSocket({ id: "user-1" });
    socket.rooms.add("topic::topic-1");
    const server = createMockServer();
    handleEditMessage({ socket: socket as any, server: server as any });

    await socket.trigger(SocketEvent.EditMessage, { topicId: "topic-1", messageId: "msg-1", text: "x" });

    expect(server.emit).not.toHaveBeenCalled();
  });
});

describe("handleShuffleGif", () => {
  it("fetches a new gif for the message's command prompt and emits it", async () => {
    vi.mocked(getMessageForUser).mockResolvedValue({
      id: "msg-1",
      text: encrypt("/giphy cats"),
    } as any);
    vi.mocked(getRandomGif).mockResolvedValue("http://gif.example/new.gif");
    vi.mocked(editMessage).mockResolvedValue({ id: "msg-1", mediaUrl: "http://gif.example/new.gif" } as any);

    const socket = createMockSocket({ id: "user-1" });
    socket.rooms.add("topic::topic-1");
    const server = createMockServer();
    handleShuffleGif({ socket: socket as any, server: server as any });

    await socket.trigger(SocketEvent.ShuffleGifMessage, { topicId: "topic-1", messageId: "msg-1" });

    expect(getRandomGif).toHaveBeenCalledWith("cats");
    expect(server.emit).toHaveBeenCalledWith(SocketEvent.ShuffleGifMessage, {
      messageId: "msg-1",
      mediaUrl: "http://gif.example/new.gif",
    });
  });

  it("does nothing when the message isn't found for this user", async () => {
    vi.mocked(getMessageForUser).mockResolvedValue(undefined);

    const socket = createMockSocket({ id: "user-1" });
    socket.rooms.add("topic::topic-1");
    const server = createMockServer();
    handleShuffleGif({ socket: socket as any, server: server as any });

    await socket.trigger(SocketEvent.ShuffleGifMessage, { topicId: "topic-1", messageId: "msg-1" });

    expect(getRandomGif).not.toHaveBeenCalled();
    expect(server.emit).not.toHaveBeenCalled();
  });

  it("does nothing when not in the topic room", async () => {
    const socket = createMockSocket({ id: "user-1" });
    const server = createMockServer();
    handleShuffleGif({ socket: socket as any, server: server as any });

    await socket.trigger(SocketEvent.ShuffleGifMessage, { topicId: "topic-1", messageId: "msg-1" });

    expect(getMessageForUser).not.toHaveBeenCalled();
  });
});
