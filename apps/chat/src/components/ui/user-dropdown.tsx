"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { ExitIcon, SewingPinFilledIcon } from "@radix-ui/react-icons";
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
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/use-toast";
import { UserUpdatedStatusHandlerProps } from "@/components/dashboard/user-status";

export function UserDropDown() {
  const self = useSelf();
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const { updateStatus } = useUpdateUserStatus();
  const router = useRouter();

  useSocketHandler<UserUpdatedStatusHandlerProps>(
    SocketEvent.UpdateUserStatus,
    (payload) => {
      if (payload.user.id === self.id) {
        router.refresh();
        return;
      }

      if (payload.user.status) {
        toast({
          description: `${
            payload.user.name.split(" ")[0]
          } updated their status to "${payload.user.status}"`,
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
              if (self.status) {
                updateStatus(null);
              } else {
                setStatusModalOpen(true);
              }
            }}
          >
            <SewingPinFilledIcon />{" "}
            {self.status ? "Clear status" : "Set status"}
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
