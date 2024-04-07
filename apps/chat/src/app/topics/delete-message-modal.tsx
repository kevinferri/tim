"use client";
import { useState } from "react";
import { deleteMessage } from "@/actions/messages";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { TrashIcon } from "@radix-ui/react-icons";

type Props = {
  messageId: string;
};

export const DeleteMessageModal = ({ messageId }: Props) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="iconXs" variant="outline">
          <TrashIcon />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete message</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this message? This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose>
            <Button variant="ghost" type="button">
              Cancel
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            disabled={isDeleting}
            onClick={async () => {
              setIsDeleting(true);
              const resp = await deleteMessage(messageId);
              setIsDeleting(false);
              setOpen(false);

              if (resp) {
                console.log("emit deleted message", resp.data);
              }
            }}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
