"use client";

import { useMemo, useRef, useState } from "react";
import {
  ExclamationTriangleIcon,
  LockClosedIcon,
  PlusIcon,
} from "@radix-ui/react-icons";

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
import { deleteCircle, upsertCircle } from "@/actions/circles";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Circle, User } from "@prisma/client";
import { useSelf } from "@/components/auth/self-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SocketEvent, useSocketEmit } from "@/components/socket/use-socket";
import { getInitials } from "@/components/ui/user-avatar";
import { uploadMedia } from "@/actions/media";
import { toBase64 } from "@/lib/utils";

type Props = {
  trigger?: React.ReactNode;
  existingCircle?: Pick<
    Circle,
    "id" | "name" | "description" | "userId" | "imageUrl"
  > & {
    members: Pick<User, "id" | "email">[];
  };
};

export const UpsertCircleForm = ({ trigger, existingCircle }: Props) => {
  const self = useSelf();
  const upsertedCircle = useSocketEmit(SocketEvent.UpsertedCircle);
  const deletedCircle = useSocketEmit(SocketEvent.DeletedCircle);
  const [open, setOpen] = useState(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [nameCheck, setNameCheck] = useState(existingCircle?.name ?? "");
  const [submitting, setSubmitting] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);
  const [avatar, setAvatar] = useState<File | string | undefined>(
    existingCircle?.imageUrl ?? undefined
  );
  const avatarBlobUrl = useMemo(() => {
    if (typeof avatar === "string") return avatar;
    if (avatar) return URL.createObjectURL(avatar);
  }, [avatar]);

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
              <Button
                asChild
                variant="secondary"
                size="icon"
                className="rounded-full"
                onClick={() => setOpen(true)}
              >
                <div>
                  <PlusIcon />
                </div>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Create a circle</TooltipContent>
          </Tooltip>
        </TooltipProvider>
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
              {isEdit ? (
                <>
                  Settings for{" "}
                  <span className="font-pronounced">{existingCircle.name}</span>
                </>
              ) : (
                "Create a new circle"
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
          {isCreator && existingCircle && showDeleteWarning ? (
            <>
              <Alert variant="destructive" className="flex flex-col">
                <ExclamationTriangleIcon />
                <AlertTitle className="mb-0 leading-relaxed">
                  Are you sure you want to delete{" "}
                  <span className="font-pronounced">{existingCircle.name}</span>
                  ?
                </AlertTitle>
                <AlertDescription>
                  This will also delete all the topics, messages, and highlights
                  within the circle.
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

                    const resp = await deleteCircle({
                      circleId: existingCircle.id,
                    });

                    setSubmitting(false);
                    setOpen(false);

                    if (resp && resp.data) {
                      const members = resp.data.members.map(({ id }) => id);
                      deletedCircle.emit({
                        id: resp.data.id,
                        name: resp.data.name,
                        deletedBy: resp.data.createdBy,
                        members,
                      });
                    }
                  }}
                >
                  <Button variant="destructive" disabled={submitting}>
                    Delete circle
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                setSubmitting(true);

                const formData = new FormData(event.currentTarget);

                if (typeof avatar === "string") {
                  formData.append("imageUrl", avatar);
                }

                if (typeof avatar === "object") {
                  const file = (await toBase64(avatar)) as string;
                  const resp = await uploadMedia({ file });

                  if (resp && typeof resp.mediaUrl === "string") {
                    formData.append("imageUrl", resp.mediaUrl);
                  }
                }

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
                      The name for your circle&rsquo;s default topic (will
                      default to General)
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

                <div>
                  <Label htmlFor="avatar">Avatar</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      ref={avatarRef}
                      className="hidden"
                      disabled={!isCreator}
                      type="file"
                      accept="image/*"
                      onChange={({ target }) => {
                        if (target.files) {
                          setAvatar(target.files[0]);
                        }
                      }}
                    />
                    <Avatar>
                      <AvatarImage src={avatarBlobUrl} alt={""} />
                      <AvatarFallback>
                        <div className="mt-[1.5px]">
                          {getInitials(nameCheck)}
                        </div>
                      </AvatarFallback>
                    </Avatar>
                    {isCreator && (
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        onClick={() => {
                          if (avatar) {
                            setAvatar(undefined);
                            return;
                          }

                          avatarRef.current?.click();
                        }}
                      >
                        {avatar ? "Clear" : "Upload custom"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter>
                {isCreator && existingCircle && (
                  <Button
                    className="mr-auto"
                    variant="destructive"
                    disabled={submitting}
                    onClick={() => setShowDeleteWarning(true)}
                    type="button"
                  >
                    Delete circle
                  </Button>
                )}
                <DialogClose asChild>
                  <Button variant="ghost" type="button">
                    {isCreator ? "Cancel" : "Close"}
                  </Button>
                </DialogClose>
                {isCreator && (
                  <Button
                    disabled={submitting || !nameCheck.trim()}
                    autoFocus
                    type="submit"
                  >
                    {existingCircle ? "Save circle" : "Create circle"}
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
