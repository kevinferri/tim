"use client";

import { useState, type ReactNode } from "react";
import {
  CopyIcon,
  Pencil1Icon,
  SewingPinFilledIcon,
  StarFilledIcon,
  StarIcon,
  TrashIcon,
  UpdateIcon,
} from "@radix-ui/react-icons";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { ReplyIcon } from "@/components/icons/reply-icon";
import { DeleteMessageModal } from "@/components/topics/delete-message-modal";
import { useUpdateUserStatus } from "@/lib/hooks/use-update-status";

type Props = {
  children: ReactNode;
  // Touch only: on desktop the hover toolbar has these, and right-click stays the browser's.
  enabled: boolean;
  messageId: string;
  topicId: string;
  text: string;
  sentBySelf: boolean;
  highlightedBySelf: boolean;
  onHighlight: () => void;
  onReply: () => void;
  onEdit?: () => void;
  onShuffleGif?: () => void;
};

function Item(props: {
  icon: ReactNode;
  children: ReactNode;
  onSelect: () => void;
  destructive?: boolean;
}) {
  return (
    <ContextMenuItem
      onSelect={props.onSelect}
      className={props.destructive ? "text-destructive" : undefined}
    >
      {props.children}
      <ContextMenuShortcut>{props.icon}</ContextMenuShortcut>
    </ContextMenuItem>
  );
}

// Long-press menu for a message on touch screens.
export function MessageContextMenu(props: Props) {
  const { updateStatus } = useUpdateUserStatus();
  const [isDeleting, setIsDeleting] = useState(false);

  if (!props.enabled) return <>{props.children}</>;

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>{props.children}</ContextMenuTrigger>
        <ContextMenuContent className="w-52">
          <Item
            icon={props.highlightedBySelf ? <StarFilledIcon /> : <StarIcon />}
            onSelect={props.onHighlight}
          >
            {props.highlightedBySelf ? "Remove highlight" : "Highlight"}
          </Item>
          <Item icon={<ReplyIcon />} onSelect={props.onReply}>
            Reply
          </Item>
          {props.text && (
            <Item
              icon={<CopyIcon />}
              onSelect={() => navigator.clipboard?.writeText(props.text)}
            >
              Copy text
            </Item>
          )}
          {props.sentBySelf && (
            <>
              <ContextMenuSeparator />
              <Item
                icon={<SewingPinFilledIcon />}
                onSelect={() => updateStatus(props.text)}
              >
                Set as status
              </Item>
              {props.onShuffleGif && (
                <Item icon={<UpdateIcon />} onSelect={props.onShuffleGif}>
                  Shuffle gif
                </Item>
              )}
              {props.onEdit && (
                <Item icon={<Pencil1Icon />} onSelect={props.onEdit}>
                  Edit
                </Item>
              )}
              <Item
                icon={<TrashIcon />}
                onSelect={() => setIsDeleting(true)}
                destructive
              >
                Delete
              </Item>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>

      {props.sentBySelf && (
        <DeleteMessageModal
          messageId={props.messageId}
          topicId={props.topicId}
          open={isDeleting}
          onOpenChange={setIsDeleting}
        />
      )}
    </>
  );
}
