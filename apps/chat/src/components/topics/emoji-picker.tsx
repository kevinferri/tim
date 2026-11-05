"use client";

import Picker from "@emoji-mart/react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { FaceIcon } from "@radix-ui/react-icons";
import { useTheme } from "next-themes";
import { ReactNode, useState } from "react";
import { loadEmojiData } from "@/lib/emoji-shortcodes";

type Props = {
  onEmojiSelect: (emoji: string) => void;
  disabled?: boolean;
  // Replaces the default smiley button.
  trigger?: ReactNode;
  align?: "start" | "end";
  closeOnSelect?: boolean;
};

export function EmojiPicker(props: Props) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {props.trigger ?? (
          <Button
            variant="ghost"
            size="iconSm"
            className="mb-[2px]"
            disabled={props.disabled}
          >
            <FaceIcon />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        className="w-full p-0"
        align={props.align ?? "end"}
        sideOffset={12}
        alignOffset={-5}
      >
        <Picker
          data={loadEmojiData}
          onEmojiSelect={({ native }: { native: string }) => {
            props.onEmojiSelect(native);
            if (props.closeOnSelect) setOpen(false);
          }}
          theme={theme}
          previewPosition="none"
          skinTonePosition="none"
          autoFocus={true}
        />
      </PopoverContent>
    </Popover>
  );
}
