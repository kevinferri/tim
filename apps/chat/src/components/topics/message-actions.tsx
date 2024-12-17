import { Button } from "@/components/ui/button";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { DeleteMessageModal } from "@/components/topics/delete-message-modal";
import { isGiphy, isValidCommand } from "@/components/topics/message-utils";
import { Pencil1Icon, UpdateIcon } from "@radix-ui/react-icons";
import { useCurrentTopicContext } from "@/components/topics/current-topic-provider";
import { cn } from "@/lib/utils";

type Props = {
  messageId: string;
  text: string;
  mediaUrl: string;
  onEditMessage?: () => void;
  onShuffleGif?: () => void;
  isShufflingGif?: boolean;
  className?: string;
};

export function MessageActions(props: Props) {
  const { topicId } = useCurrentTopicContext();
  const showEdit = !isValidCommand(props.text);
  const isRandomGif =
    isGiphy(props.mediaUrl ?? undefined) &&
    props.text?.split(" ")[0] === "/giphy";

  return (
    <div
      className={cn(
        "absolute top-[-8px] right-[10px] text-primary",
        props.className
      )}
    >
      <div className="flex gap-1">
        <TooltipProvider>
          <Tooltip delayDuration={100}>
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
            <TooltipContent>{isRandomGif ? "Shuffle" : "Edit"}</TooltipContent>
          </Tooltip>

          <Tooltip delayDuration={100}>
            <TooltipTrigger>
              <DeleteMessageModal
                messageId={props.messageId}
                topicId={topicId}
              />
            </TooltipTrigger>
            <TooltipContent align="end">Delete</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
