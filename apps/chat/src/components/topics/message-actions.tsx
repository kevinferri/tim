import { Button } from "@/components/ui/button";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { DeleteMessageModal } from "@/components/topics/delete-message-modal";
import { isGiphy, isValidCommand } from "@/components/topics/message-utils";
import {
  Pencil1Icon,
  SewingPinFilledIcon,
  UpdateIcon,
} from "@radix-ui/react-icons";
import { useCurrentTopicContext } from "@/components/topics/current-topic-provider";
import { cn } from "@/lib/utils";
import { useUpdateUserStatus } from "@/lib/hooks/use-update-status";

type Props = {
  messageId: string;
  text: string;
  mediaUrl: string;
  onEditMessage?: () => void;
  onShuffleGif?: () => void;
  isShufflingGif?: boolean;
  className?: string;
};

const DELAY_DURATION = 100;

export function MessageActions(props: Props) {
  const { topicId } = useCurrentTopicContext();
  const { updateStatus } = useUpdateUserStatus();
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
          <Tooltip delayDuration={DELAY_DURATION}>
            <TooltipTrigger asChild>
              <Button
                size="iconSm"
                variant="outline"
                onClick={() => {
                  updateStatus(props.text);
                }}
              >
                <SewingPinFilledIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Set as status</TooltipContent>
          </Tooltip>
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
            <TooltipContent>{isRandomGif ? "Shuffle" : "Edit"}</TooltipContent>
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
        </TooltipProvider>
      </div>
    </div>
  );
}
