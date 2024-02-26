"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/drop-down-menu";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "./separator";
import { ExitIcon } from "@radix-ui/react-icons";

export function UserDropDown({
  avatarUrl,
  name,
  email,
}: {
  avatarUrl?: string;
  name?: string;
  email?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="p-0 rounded-full hover:opacity-80 shadow-sm"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={avatarUrl ?? ""} />
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem disabled>{email}</DropdownMenuItem>
        <Separator />
        <DropdownMenuItem onClick={() => signOut()} className="flex gap-2">
          <ExitIcon /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
