import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageIcon } from "@radix-ui/react-icons";
import { useRef } from "react";

type Props = {
  file?: File;
  onFileChange: (file: File) => void;
  onFileRemove: () => void;
};

export function MediaUploader(props: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <Button
        size="iconSm"
        variant="ghost"
        onClick={() => inputRef.current?.click()}
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
