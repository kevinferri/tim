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
  const [status, setStatus] = useState(liveStatus.status);
  const { updateStatus } = useUpdateUserStatus();

  // The dialog never unmounts (parent just toggles `open`), so resync the local draft each time it opens instead of only on mount.
  useEffect(() => {
    if (props.open) setStatus(liveStatus.status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.open]);

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set status</DialogTitle>
          <DialogDescription>
            Your status will be displayed next to your avatar in all your
            circles.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            updateStatus(status);
          }}
        >
          <div className="flex flex-col gap-4">
            <Input
              value={status ?? ""}
              onChange={(e) => setStatus(e.target.value)}
            />

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost" type="button">
                  Cancel
                </Button>
              </DialogClose>
              <DialogClose asChild>
                <Button
                  type="submit"
                  disabled={!status || status.trim() === ""}
                >
                  Save
                </Button>
              </DialogClose>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
