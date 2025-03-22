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
import { useState } from "react";
import { useUpdateUserStatus } from "@/lib/hooks/use-update-status";

type Props = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function SetStatusModal(props: Props) {
  const self = useSelf();
  const [status, setStatus] = useState(self.status);
  const { updateStatus } = useUpdateUserStatus();

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
