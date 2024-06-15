"use client";

import { useState } from "react";
import { LockClosedIcon, PlusIcon } from "@radix-ui/react-icons";

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
import { upsertCircle } from "@/actions/circles";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Circle, User } from "@prisma/client";
import { useSelf } from "@/components/auth/self-provider";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { SocketEvent, useSocketEmit } from "@/components/socket/use-socket";

type Props = {
  trigger?: React.ReactNode;
  existingCircle?: Pick<Circle, "id" | "name" | "description" | "userId"> & {
    members: Pick<User, "id" | "email">[];
  };
};

export const UpsertCircleForm = ({ trigger, existingCircle }: Props) => {
  const self = useSelf();
  const upsertedCircle = useSocketEmit(SocketEvent.UpsertedCircle);

  const [open, setOpen] = useState(false);
  const [nameCheck, setNameCheck] = useState(existingCircle?.name ?? "");
  const [submitting, setSubmitting] = useState(false);

  const isEdit = !!existingCircle;
  const isCreator = !existingCircle || existingCircle.userId === self.id;
  const existingMembers = existingCircle?.members
    .filter(({ id }) => id !== self.id)
    .map(({ email }) => email)
    .join(", ");

  return (
    <>
      {trigger ? (
        <div className="w-full" onClick={() => setOpen(true)}>
          {trigger}
        </div>
      ) : (
        <TooltipProvider>
          <Tooltip delayDuration={100}>
            <TooltipTrigger>
              <Avatar>
                <AvatarFallback
                  className="bg-secondary border"
                  onClick={() => setOpen(true)}
                >
                  <PlusIcon height={18} width={18} />
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent side="right">Create a circle</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEdit ? (
                <>
                  Settings for{" "}
                  <span className="underline decoration-2 underline-offset-4 hover:text-primary decoration-purple-700">
                    {existingCircle.name}
                  </span>
                </>
              ) : (
                "Create new circle"
              )}
            </DialogTitle>
            <DialogDescription>
              Invite friends to your circle to start communicating.
            </DialogDescription>
          </DialogHeader>
          {!isCreator && (
            <Alert variant="secondary" className="flex flex-col">
              <LockClosedIcon />
              <AlertTitle className="mb-0 leading-relaxed">
                Only the creator of the circle can modify the settings
              </AlertTitle>
            </Alert>
          )}
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              setSubmitting(true);

              const formData = new FormData(event.currentTarget);
              const resp = await upsertCircle(formData);

              setSubmitting(false);
              setOpen(false);

              if (resp) {
                const members = resp.data.members ?? [];
                const prevMembers = existingCircle?.members ?? [];

                upsertedCircle.emit({
                  id: resp.data.id,
                  name: resp.data.name,
                  createdBy: resp.data.createdBy,
                  prevMembers: prevMembers.map(({ id }) => id),
                  members: members.map(({ id }) => id),
                  defaultTopicId: resp.data.defaultTopicId,
                  isEdit,
                });
              }
            }}
          >
            <Input
              id="circleId"
              name="circleId"
              value={existingCircle?.id}
              type="hidden"
            />
            <div className="grid gap-4 py-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  disabled={!isCreator}
                  id="name"
                  name="name"
                  onChange={(e) => setNameCheck(e.target.value)}
                  defaultValue={existingCircle?.name}
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  disabled={!isCreator}
                  id="description"
                  name="description"
                  defaultValue={existingCircle?.description ?? undefined}
                />
              </div>
              {!isEdit && (
                <div>
                  <Label htmlFor="defaultTopicName">
                    The name for your circle&rsquo;s default topic (will default
                    to General)
                  </Label>
                  <Input
                    disabled={!isCreator}
                    id="defaultTopicName"
                    name="defaultTopicName"
                    defaultValue="General"
                  />
                </div>
              )}
              <div>
                <Label htmlFor="members">
                  Invite your friends via email (seperate by comma)
                </Label>
                <Input
                  disabled={!isCreator}
                  id="members"
                  name="members"
                  placeholder="name@gmail.com, name2@gmail.com"
                  defaultValue={existingMembers}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose>
                <Button variant="ghost" type="button">
                  Cancel
                </Button>
              </DialogClose>
              <Button disabled={submitting || !nameCheck.trim() || !isCreator}>
                Save circle
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
