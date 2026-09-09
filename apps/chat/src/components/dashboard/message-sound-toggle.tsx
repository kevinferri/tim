"use client";

import { SpeakerLoudIcon, SpeakerOffIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { useMessageSound } from "@/components/dashboard/use-message-sound";

export function MessageSoundToggle() {
  const { isMessageSoundEnabled, toggleMessageSound } = useMessageSound();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="rounded-full"
      onClick={toggleMessageSound}
    >
      <div>
        {isMessageSoundEnabled ? <SpeakerLoudIcon /> : <SpeakerOffIcon />}
      </div>
    </Button>
  );
}
