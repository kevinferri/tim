"use client";

import { useState } from "react";
import { PlusIcon } from "@radix-ui/react-icons";

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
import { createCircle } from "@/actions/circles";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";
import { Routes, getLinkForTopic } from "@/routes";

export const CreateCircleForm = () => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [nameCheck, setNameCheck] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <>
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
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a new circle</DialogTitle>
            <DialogDescription>
              Invite friends to your circle to start communicating
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              setSubmitting(true);

              const resp = await createCircle(
                new FormData(event.currentTarget)
              );

              setSubmitting(false);
              setOpen(false);

              if (resp && resp.data.defaultTopicId) {
                router.push(getLinkForTopic(resp.data.defaultTopicId));
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

              <div>
                <Label htmlFor="members">
                  Invite your friends via email (seperate by comma)
                </Label>
                <Input
                  id="members"
                  name="members"
                  placeholder="name@gmail.com, name2@gmail.com"
                />
              </div>

              <div>
                <Label htmlFor="defaultTopicName">
                  The name for your circle&rsquo;s default topic (will default
                  to General)
                </Label>
                <Input
                  id="defaultTopicName"
                  name="defaultTopicName"
                  defaultValue="General"
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose>
                <Button variant="ghost" type="button">
                  Cancel
                </Button>
              </DialogClose>
              <Button disabled={submitting || !nameCheck.trim()}>
                Create circle
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
