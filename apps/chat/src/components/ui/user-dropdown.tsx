"use client";

import { signOut } from "next-auth/react";
import { ExitIcon } from "@radix-ui/react-icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useSelf } from "@/components/auth/self-provider";
import { ConnectionStatus } from "@/components/socket/connection-status";

export function UserDropDown() {
  const self = useSelf();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="relative">
          <Button
            size="icon"
            variant="ghost"
            className="p-0 rounded-full hover:opacity-80 shadow-sm"
          >
            <UserAvatar
              size="sm"
              id={self.id}
              name={self.name}
              imageUrl={self.imageUrl}
            />
          </Button>
          <ConnectionStatus />
        </div>
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
