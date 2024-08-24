"use client";

import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { FaceIcon } from "@radix-ui/react-icons";
import { useTheme } from "next-themes";

type Props = {
  onEmojiSelect: (emoji: string) => void;
};

export function EmojiPicker(props: Props) {
  const { theme } = useTheme();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="iconSm" className="mb-[2px]">
          <FaceIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-full p-0"
        align="end"
        sideOffset={12}
        alignOffset={-5}
      >
        <Picker
          data={data}
          onEmojiSelect={({ native }: { native: string }) =>
            props.onEmojiSelect(native)
          }
          theme={theme}
          previewPosition="none"
          skinTonePosition="none"
        />
      </PopoverContent>
    </Popover>
  );
}
