"use client";

import { ExitIcon } from "@radix-ui/react-icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";
import { Separator } from "@/components/ui/separator";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useSelf } from "../auth/self-provider";

export function UserDropDown() {
  const self = useSelf();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="p-0 rounded-full hover:opacity-80 shadow-sm"
        >
          <UserAvatar id={self.id} name={self.name} imageUrl={self.imageUrl} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem disabled>{self.email}</DropdownMenuItem>
        <Separator />
        <DropdownMenuItem onClick={() => signOut()} className="flex gap-3">
          <ExitIcon /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
