"use client";
import React from "react";
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
import { SocketEvent, useSocketEmit } from "@/components/socket/use-socket";

type Props = {
  messageId: string;
  topicId: string;
};

export function DeleteMessageModal({ messageId, topicId }: Props) {
  const deleteMessage = useSocketEmit<Props>(SocketEvent.DeleteMessage);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="font-normal" size="iconSm" variant="outline" asChild>
          <div>
            <TrashIcon />
          </div>
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
          <DialogClose asChild>
            <Button variant="ghost" type="button">
              Cancel
            </Button>
          </DialogClose>
          <DialogClose asChild>
            <Button
              variant="destructive"
              onClick={() => {
                deleteMessage.emit({ messageId, topicId });
              }}
            >
              Delete
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
