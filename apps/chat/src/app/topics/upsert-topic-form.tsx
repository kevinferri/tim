"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LockClosedIcon, PlusIcon } from "@radix-ui/react-icons";
import { Topic } from "@prisma/client";

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
import { upsertTopic } from "@/actions/topics";
import { SocketEvent, useSocketEmit } from "@/components/socket/use-socket";
import { useSelf } from "@/components/auth/self-provider";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { getLinkForTopic } from "@/routes";

type Props = {
  existingTopic?: Pick<Topic, "id" | "name" | "description" | "userId">;
  circleId: string;
  circleName?: string;
  trigger?: React.ReactNode;
};

export const UpsertTopicForm = ({
  existingTopic,
  circleId,
  circleName,
  trigger,
}: Props) => {
  const self = useSelf();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [nameCheck, setNameCheck] = useState(existingTopic?.name ?? "");
  const [submitting, setSubmitting] = useState(false);
  const createdTopicEmitter = useSocketEmit(SocketEvent.CreatedTopic);
  const isCreator = !existingTopic || existingTopic.userId === self.id;

  return (
    <>
      {trigger ? (
        <div className="w-full" onClick={() => setOpen(true)}>
          {trigger}
        </div>
      ) : (
        <Button
          variant="ghost"
          className="flex gap-2 flex-1 w-full"
          onClick={() => setOpen(true)}
        >
          <span>New topic </span>
          <PlusIcon />
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {existingTopic ? (
                <>
                  Settings for{" "}
                  <span className="underline decoration-2 underline-offset-4 hover:text-primary decoration-purple-700">
                    {existingTopic.name}
                  </span>{" "}
                  in <span>{circleName}</span>
                </>
              ) : (
                <>
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
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              Topics are places within your circle to communicate and share
              content with friends.
            </DialogDescription>
          </DialogHeader>
          {!isCreator && (
            <Alert variant="secondary" className="flex flex-col">
              <LockClosedIcon />
              <AlertTitle className="mb-0 leading-relaxed">
                Only the creator of the topic can modify the settings
              </AlertTitle>
            </Alert>
          )}
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              setSubmitting(true);

              const resp = await upsertTopic(new FormData(event.currentTarget));

              setSubmitting(false);
              setOpen(false);

              if (resp && resp.data) {
                const { id, name, createdBy } = resp.data;

                if (existingTopic) {
                  router.push(getLinkForTopic(id));
                  return;
                }

                createdTopicEmitter.emit({
                  circleId,
                  id,
                  name,
                  createdBy,
                });
              }
            }}
          >
            <div className="grid gap-4 py-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  disabled={!isCreator}
                  defaultValue={existingTopic?.name}
                  onChange={(e) => setNameCheck(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  name="description"
                  disabled={!isCreator}
                  defaultValue={existingTopic?.description ?? undefined}
                />
              </div>
            </div>
            <Input
              id="circleId"
              name="circleId"
              value={circleId}
              type="hidden"
            />
            <Input
              id="topicId"
              name="topicId"
              value={existingTopic?.id}
              type="hidden"
            />
            <DialogFooter>
              <DialogClose>
                <Button variant="ghost" type="button">
                  Cancel
                </Button>
              </DialogClose>
              <Button disabled={submitting || !nameCheck.trim() || !isCreator}>
                Save topic
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
