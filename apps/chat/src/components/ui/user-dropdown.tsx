"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { ExitIcon, SewingPinFilledIcon } from "@radix-ui/react-icons";
import { getDisplayName } from "@tim/user-display";
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
import { SetStatusModal } from "@/components/dashboard/set-status-modal";
import { useUpdateUserStatus } from "@/lib/hooks/use-update-status";
import { SocketEvent, useSocketHandler } from "@/components/socket/use-socket";
import { toast } from "@/components/ui/use-toast";
import {
  UserUpdatedStatusPayload,
  useUserStatus,
} from "@/components/dashboard/user-status-store";

export function UserDropDown() {
  const self = useSelf();
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const { updateStatus } = useUpdateUserStatus();
  const { status } = useUserStatus(self.id, {
    status: self.status,
    lastStatusUpdate: self.lastStatusUpdate,
  });

  useSocketHandler<UserUpdatedStatusPayload>(
    SocketEvent.UserUpdatedStatus,
    (payload) => {
      if (payload.user.id === self.id) return;

      if (payload.user.status) {
        toast({
          description: `${getDisplayName(
            payload.user.name
          )} updated their status to "${payload.user.status}"`,
        });
      }
    }
  );

  return (
    <>
      <SetStatusModal
        open={statusModalOpen}
        onOpenChange={setStatusModalOpen}
      />
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
                showStatus={false}
                status={self.status}
                lastStatusUpdate={self.lastStatusUpdate}
              />
            </Button>
            <ConnectionStatus />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem disabled>{self.email}</DropdownMenuItem>
          <Separator />
          <DropdownMenuItem
            className="flex gap-3"
            onClick={() => {
              if (status) {
                updateStatus(null);
              } else {
                setStatusModalOpen(true);
              }
            }}
          >
            <SewingPinFilledIcon /> {status ? "Clear status" : "Set status"}
          </DropdownMenuItem>
          <Separator />
          <DropdownMenuItem onClick={() => signOut()} className="flex gap-3">
            <ExitIcon /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
