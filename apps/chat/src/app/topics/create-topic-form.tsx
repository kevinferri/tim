"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { getLinkForTopic } from "@/routes";
import { createTopic } from "@/actions/topics";
import { PlusIcon } from "@radix-ui/react-icons";

export const CreateTopicForm = ({
  circleId,
  circleName,
}: {
  circleId: string;
  circleName?: string;
}) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [nameCheck, setNameCheck] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        className="flex gap-2 flex-1 w-full"
        onClick={() => setOpen(true)}
      >
        <span>New topic </span>
        <PlusIcon />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {circleName ? (
                <>
                  Create a new topic in{" "}
                  <span className="underline decoration-2 underline-offset-4 hover:text-primary decoration-purple-700">
                    {circleName}
                  </span>
                </>
              ) : (
                "Create a new topic"
              )}
            </DialogTitle>
            <DialogDescription>
              Topics are places within your circle to communicate and share
              content with friends.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              setSubmitting(true);
              const resp = await createTopic(new FormData(event.currentTarget));
              setSubmitting(false);
              setOpen(false);

              if (resp && resp.data) {
                router.push(getLinkForTopic(resp.data.id));
              }
            }}
          >
            <div className="grid gap-4 py-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  onChange={(e) => setNameCheck(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input id="description" name="description" />
              </div>
            </div>
            <Input
              id="circleId"
              name="circleId"
              value={circleId}
              type="hidden"
            />
            <DialogFooter>
              <DialogClose>
                <Button variant="ghost" type="button">
                  Cancel
                </Button>
              </DialogClose>
              <Button disabled={submitting || !nameCheck.trim()}>
                Create topic
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
