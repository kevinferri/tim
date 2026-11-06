import { useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageIcon } from "@radix-ui/react-icons";
import { useDragAndDrop } from "@/lib/hooks/use-drag-and-drop";

type Props = {
  file?: File;
  disabled?: boolean;
  onFileChange: (file: File) => void;
  onFileRemove: () => void;
};

export function MediaUploader(props: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { isDragging } = useDragAndDrop({
    onDrop: (files) => {
      const file = files[0];

      if (file.type.includes("image")) {
        props.onFileChange(file);
      }
    },
  });

  return (
    <div>
      {isDragging &&
        createPortal(
          <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center gap-6 text-white">
            <ImageIcon height={80} width={80} />
            <div className="text-xl">Drop your file anywhere on the screen</div>
          </div>,
          document.body,
        )}
      <Button
        size="iconSm"
        variant="ghost"
        onClick={() => inputRef.current?.click()}
        disabled={props.disabled ?? false}
      >
        <ImageIcon />
      </Button>
      <Input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={({ target }) => {
          if (target.files) props.onFileChange(target.files[0]);
        }}
      />
    </div>
  );
}
