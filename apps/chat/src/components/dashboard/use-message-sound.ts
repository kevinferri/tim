import { create } from "zustand";
import { persist } from "zustand/middleware";

type MessageSoundStore = {
  isMessageSoundEnabled: boolean;
  toggleMessageSound: () => void;
};

export const useMessageSound = create<MessageSoundStore>()(
  persist(
    (set) => ({
      isMessageSoundEnabled: true,
      toggleMessageSound: () =>
        set((state) => ({
          isMessageSoundEnabled: !state.isMessageSoundEnabled,
        })),
    }),
    {
      name: "tim:message-sound-enabled",
    }
  )
);
