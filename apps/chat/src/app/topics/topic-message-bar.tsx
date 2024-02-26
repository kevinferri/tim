"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { EmitEvent, useSocketEmit } from "@/components/socket/use-socket";

type MessagePayload = {
  message: string;
  topicId: string;
};

export function TopicMessageBar({ topicId }: { topicId: string }) {
  const [message, setMessage] = useState("");
  const sendMessage = useSocketEmit<MessagePayload>(EmitEvent.SendMessage);

  const emitMessage = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    sendMessage.emit({
      message,
      topicId,
    });

    setMessage("");
  };

  return (
    <div className="flex flex-1 bg-secondary p-4">
      <form onSubmit={emitMessage} className="basis-full">
        <Input
          autoFocus
          className="bg-white focus-visible:ring-transparent focus-visible:border-slate-300"
          type="text"
          onChange={(e) => setMessage(e.target.value)}
          value={message}
        />
      </form>
    </div>
  );
}
