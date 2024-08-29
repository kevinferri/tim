import { ChangeEvent } from "react";
import { AutoResizeTextarea } from "@/components/topics/auto-resize-textarea";

type Props = {
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  onEditConfirm: () => void;
  onEditCancel: () => void;
  editingText: string;
};

export function MessageEdit(props: Props) {
  return (
    <div>
      <AutoResizeTextarea
        onChange={props.onChange}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            props.onEditConfirm();
          }

          if (e.key === "Escape") {
            props.onEditCancel();
          }
        }}
        value={props.editingText ?? ""}
      />
      <div className="flex gap-1 text-xs">
        <span>
          esc to{" "}
          <span
            className="cursor-pointer text-purple-700"
            onClick={props.onEditCancel}
          >
            cancel
          </span>
        </span>
        <span>•</span>
        <span>
          enter to{" "}
          <span
            className="cursor-pointer text-purple-700"
            onClick={props.onEditConfirm}
          >
            save changes
          </span>
        </span>
      </div>
    </div>
  );
}
