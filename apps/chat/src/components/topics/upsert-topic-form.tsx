"use client";

import { useState } from "react";
import {
  ExclamationTriangleIcon,
  LockClosedIcon,
  PlusIcon,
} from "@radix-ui/react-icons";
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
import { deleteTopic, upsertTopic } from "@/actions/topics";
import { SocketEvent, useSocketEmit } from "@/components/socket/use-socket";
import { useSelf } from "@/components/auth/self-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type Props = {
  existingTopic?: Pick<Topic, "id" | "name" | "description" | "userId">;
  circleId: string;
  circleName?: string;
  trigger?: React.ReactNode;
  isDefaultTopic?: boolean;
};

export const UpsertTopicForm = ({
  existingTopic,
  circleId,
  circleName,
  trigger,
  isDefaultTopic,
}: Props) => {
  const self = useSelf();
  const [open, setOpen] = useState(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [nameCheck, setNameCheck] = useState(existingTopic?.name ?? "");
  const [submitting, setSubmitting] = useState(false);
  const upsertedTopic = useSocketEmit(SocketEvent.UpsertedTopic);
  const deletedTopic = useSocketEmit(SocketEvent.DeletedTopic);
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
          className="flex gap-3 flex-1 w-full"
          onClick={() => setOpen(true)}
        >
          <span>New topic </span>
          <PlusIcon />
        </Button>
      )}
      <Dialog
        open={open}
        onOpenChange={(_open) => {
          setOpen(_open);
          setShowDeleteWarning(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {existingTopic ? (
                <>
                  Settings for{" "}
                  <span className="font-pronounced">{existingTopic.name}</span>{" "}
                  in <span>{circleName}</span>
                </>
              ) : (
                <>
                  {circleName ? (
                    <>
                      Create a new topic in{" "}
                      <span className="font-pronounced">{circleName}</span>
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
          {showDeleteWarning && existingTopic ? (
            <>
              <Alert variant="destructive" className="flex flex-col">
                <ExclamationTriangleIcon />
                <AlertTitle className="mb-0">
                  Are you sure you want to delete{" "}
                  <span className="font-pronounced">{existingTopic?.name}</span>
                  ?
                </AlertTitle>
                <AlertDescription>
                  This will also delete all the messages and highlights within
                  the topic.
                </AlertDescription>
              </Alert>
              <div className="flex gap-1 mt-3 ml-auto">
                <Button
                  variant="ghost"
                  onClick={() => setShowDeleteWarning(false)}
                >
                  Cancel
                </Button>
                <form
                  onSubmit={async (event) => {
                    event.preventDefault();
                    setSubmitting(true);

                    const resp = await deleteTopic({
                      topicId: existingTopic?.id,
                      circleId,
                    });

                    setSubmitting(false);
                    setOpen(false);

                    console.log(resp);

                    if (resp && resp.data) {
                      deletedTopic.emit({
                        id: resp.data.id,
                        name: resp.data.name,
                        circleId: resp.data.parentCircle.id,
                        deletedBy: resp.data.createdBy,
                      });
                    }
                  }}
                >
                  <Button variant="destructive" disabled={submitting}>
                    Delete topic
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                setSubmitting(true);

                const isEdit = !!existingTopic;
                const formData = new FormData(event.currentTarget);
                const resp = await upsertTopic(formData);

                setSubmitting(false);
                setOpen(false);

                if (resp && resp.data) {
                  const { id, name, createdBy } = resp.data;

                  upsertedTopic.emit({
                    circleId,
                    id,
                    name,
                    createdBy,
                    isEdit,
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
                {isCreator && existingTopic && !isDefaultTopic && (
                  <Button
                    className="mr-auto"
                    variant="destructive"
                    disabled={submitting}
                    onClick={() => setShowDeleteWarning(true)}
                    type="button"
                  >
                    Delete topic
                  </Button>
                )}
                <DialogClose asChild>
                  <Button variant="ghost" type="button">
                    {isCreator ? "Cancel" : "Close"}
                  </Button>
                </DialogClose>
                {isCreator && (
                  <Button
                    type="submit"
                    disabled={submitting || !nameCheck.trim()}
                    autoFocus
                  >
                    Save topic
                  </Button>
                )}
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
