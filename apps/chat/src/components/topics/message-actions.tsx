import { Button } from "@/components/ui/button";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { DeleteMessageModal } from "@/components/topics/delete-message-modal";
import { isGiphy, isValidCommand } from "@/components/topics/message-utils";
import { CommandName, parseCommand } from "@tim/commands";
import {
  Pencil1Icon,
  StarFilledIcon,
  StarIcon,
  UpdateIcon,
} from "@radix-ui/react-icons";
import { useTopicMetaContext } from "@/components/topics/current-topic-provider";
import { cn } from "@/lib/utils";
import { ReplyIcon } from "@/components/icons/reply-icon";

type Props = {
  messageId: string;
  text: string;
  mediaUrl: string;
  onEditMessage?: () => void;
  onShuffleGif?: () => void;
  onReply?: () => void;
  onHighlight: () => void;
  highlightedBySelf: boolean;
  isShufflingGif?: boolean;
  className?: string;
  // Own message, in the topic you're in: edit/shuffle/delete.
  canModify: boolean;
};

const DELAY_DURATION = 100;

// Commands can't be edited; a random gif can be reshuffled instead.
export function getOwnMessageActions(text: string, mediaUrl?: string | null) {
  const isRandomGif =
    isGiphy(mediaUrl ?? undefined) &&
    parseCommand(text)?.name === CommandName.Giphy;
  return { canShuffle: isRandomGif, canEdit: !isValidCommand(text) };
}

export function MessageActions(props: Props) {
  const { topicId } = useTopicMetaContext();
  const { canShuffle: isRandomGif, canEdit: showEdit } = getOwnMessageActions(
    props.text,
    props.mediaUrl,
  );

  return (
    <div
      className={cn(
        // -12px centres the 24px toolbar on the message's top edge; z-10 lifts
        // it clear of message content, which baseStyles pins at z-0.
        "absolute top-[-12px] right-[10px] z-10 text-primary",
        props.className,
      )}
    >
      <div className="flex gap-1">
        <TooltipProvider>
          <Tooltip delayDuration={DELAY_DURATION}>
            <TooltipTrigger asChild>
              <Button
                size="iconSm"
                variant="outline"
                aria-pressed={props.highlightedBySelf}
                // Gold only once it's yours, like the pill and the left edge.
                className={cn(
                  props.highlightedBySelf &&
                    "text-highlight-icon hover:text-highlight-icon",
                )}
                onClick={props.onHighlight}
              >
                {props.highlightedBySelf ? <StarFilledIcon /> : <StarIcon />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {props.highlightedBySelf ? "Remove highlight" : "Highlight"}
            </TooltipContent>
          </Tooltip>
          {props.onReply && (
            <Tooltip delayDuration={DELAY_DURATION}>
              <TooltipTrigger asChild>
                <Button size="iconSm" variant="outline" onClick={props.onReply}>
                  <ReplyIcon />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reply</TooltipContent>
            </Tooltip>
          )}
          {props.canModify && (
            <>
              <Tooltip delayDuration={DELAY_DURATION}>
                <TooltipTrigger asChild>
                  {isRandomGif ? (
                    <Button
                      className="font-normal"
                      size="iconSm"
                      variant="outline"
                      disabled={!!props.isShufflingGif}
                      onClick={props.onShuffleGif}
                    >
                      <UpdateIcon
                        className={!!props.isShufflingGif ? "animate-spin" : ""}
                      />
                    </Button>
                  ) : (
                    showEdit && (
                      <Button
                        className="font-normal"
                        size="iconSm"
                        variant="outline"
                        onClick={props.onEditMessage}
                      >
                        <Pencil1Icon />
                      </Button>
                    )
                  )}
                </TooltipTrigger>
                <TooltipContent>
                  {isRandomGif ? "Shuffle" : "Edit"}
                </TooltipContent>
              </Tooltip>

              <Tooltip delayDuration={DELAY_DURATION}>
                <TooltipTrigger>
                  <DeleteMessageModal
                    messageId={props.messageId}
                    topicId={topicId}
                  />
                </TooltipTrigger>
                <TooltipContent align="end">Delete</TooltipContent>
              </Tooltip>
            </>
          )}
        </TooltipProvider>
      </div>
    </div>
  );
}
