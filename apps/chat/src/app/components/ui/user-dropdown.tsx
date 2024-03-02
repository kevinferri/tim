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
import {
  CheckCircledIcon,
  ExclamationTriangleIcon,
  ExitIcon,
} from "@radix-ui/react-icons";
import { useSocketContext } from "../socket/socket-provider";

export function UserDropDown({
  avatarUrl,
  email,
}: {
  avatarUrl?: string;
  name?: string;
  email?: string;
}) {
  //const { socketState } = useSocketContext();
  const color = true ? "text-success" : "text-destructive";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="outline"
          className="p-0 rounded-full hover:opacity-80 shadow-sm"
        >
          <Avatar>
            <AvatarImage src={avatarUrl ?? ""} />
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem disabled>{email}</DropdownMenuItem>
        <DropdownMenuItem
          className={`${color} pointer-events-none`}
          onClick={(e) => e.preventDefault()}
        >
          <div className="flex gap-2 items-center">
            {true ? (
              <>
                Connected <CheckCircledIcon />
              </>
            ) : (
              <>
                Disconnected <ExclamationTriangleIcon />
              </>
            )}
          </div>
        </DropdownMenuItem>
        <Separator />
        <DropdownMenuItem onClick={() => signOut()} className="flex gap-2">
          <ExitIcon /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
