import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DialogClose } from "@/components/ui/dialog";
import { useSelf } from "../auth/self-provider";
import { Input } from "../ui/input";
import { useEffect, useState } from "react";
import { useUpdateUserStatus } from "@/lib/hooks/use-update-status";
import { useUserStatus } from "@/components/dashboard/user-status-store";
import { EmojiPicker } from "@/components/topics/emoji-picker";
import { joinStatus, splitStatus } from "@/lib/status";

const QUICK_PICKS = [
  { emoji: "🍔", text: "Lunch" },
  { emoji: "🏠", text: "Working from home" },
  { emoji: "🎧", text: "Focusing" },
  { emoji: "🚗", text: "Commuting" },
  { emoji: "🤒", text: "Out sick" },
  { emoji: "🌴", text: "On vacation" },
];

type Props = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function SetStatusModal(props: Props) {
  const self = useSelf();
  const liveStatus = useUserStatus(self.id, {
    status: self.status,
    lastStatusUpdate: self.lastStatusUpdate,
  });
  const [draft, setDraft] = useState(() => splitStatus(liveStatus.status));
  const { updateStatus } = useUpdateUserStatus();

  // The dialog never unmounts (parent just toggles `open`), so resync the local draft each time it opens instead of only on mount.
  useEffect(() => {
    if (props.open) setDraft(splitStatus(liveStatus.status));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.open]);

  const canSave = draft.text.trim() !== "";

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {liveStatus.status ? "Edit status" : "Set status"}
          </DialogTitle>
          <DialogDescription>
            Shown on your avatar and under your name in all your circles.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSave) return;
            updateStatus(joinStatus(draft.emoji, draft.text));
            props.onOpenChange?.(false);
          }}
        >
          <div className="flex flex-col gap-4">
            <div className="flex gap-2">
              <EmojiPicker
                align="start"
                closeOnSelect
                onEmojiSelect={(emoji) => setDraft((d) => ({ ...d, emoji }))}
                trigger={
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0 text-lg"
                    aria-label="Choose status emoji"
                  >
                    {draft.emoji}
                  </Button>
                }
              />
              <Input
                value={draft.text}
                placeholder="What's your status?"
                onChange={(e) =>
                  setDraft((d) => ({ ...d, text: e.target.value }))
                }
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {QUICK_PICKS.map((pick) => {
                const selected =
                  draft.emoji === pick.emoji && draft.text === pick.text;
                return (
                  <Button
                    key={pick.text}
                    type="button"
                    variant={selected ? "default" : "secondary"}
                    size="sm"
                    className="h-7 gap-1.5 rounded-full px-3 text-xs"
                    onClick={() => setDraft(pick)}
                  >
                    {pick.emoji} {pick.text}
                  </Button>
                );
              })}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              {liveStatus.status && (
                <DialogClose asChild>
                  <Button
                    variant="ghost"
                    type="button"
                    className="text-destructive hover:text-destructive sm:mr-auto"
                    onClick={() => updateStatus(null)}
                  >
                    Clear status
                  </Button>
                </DialogClose>
              )}
              <DialogClose asChild>
                <Button variant="ghost" type="button">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={!canSave}>
                Save
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
