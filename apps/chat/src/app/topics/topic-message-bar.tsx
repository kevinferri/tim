"use client";

import { ChangeEvent, useState } from "react";

import { SocketEvent, useSocketEmit } from "@/components/socket/use-socket";
import { Textarea } from "@/components/ui/textarea";

function adjustHeight(target: ChangeEvent<HTMLTextAreaElement>["target"]) {
  target.style.height = "";
  target.style.height = `${target.scrollHeight + 2}px`;
}

type MessagePayload = {
  message: string;
  topicId: string;
};

export function TopicMessageBar({ topicId }: { topicId: string }) {
  const [message, setMessage] = useState("");
  const sendMessage = useSocketEmit<MessagePayload>(SocketEvent.SendMessage);

  const emitMessage = (message: string) => {
    if (!message.trim()) return;

    sendMessage.emit({
      message,
      topicId,
    });

    setMessage("");
  };

  return (
    <div className="flex flex-1 p-4">
      <Textarea
        rows={1}
        autoFocus
        className="focus-visible:ring-transparent focus-visible:border-slate-300 resize-none"
        onChange={(e) => {
          setMessage(e.target.value);
          adjustHeight(e.target);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            emitMessage(message);
            e.currentTarget.style.height = "";
          }
        }}
        value={message}
      />
    </div>
  );
}
