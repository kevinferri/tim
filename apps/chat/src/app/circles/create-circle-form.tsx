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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCircle } from "@/actions/circles";
import { SubmitButton } from "@/components/ui/submit-button";

export const CreateCircleForm = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="iconSm">
          <PlusIcon />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a new circle</DialogTitle>
          <DialogDescription>
            Invite friends to your circle to start communicating
          </DialogDescription>
        </DialogHeader>
        <form action={createCircle}>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" />
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
                The name for your circle&rsquo;s default topic (will default to
                General)
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
              <SubmitButton>Create circle</SubmitButton>
            </DialogClose>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
