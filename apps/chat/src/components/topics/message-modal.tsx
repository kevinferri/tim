"use client";

import { useQueryState } from "nuqs";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Message, MessageProps } from "@/components/topics/message";
import {
  getMessagePositionFlags,
  MessageRecency,
  useTopicHighlightsContext,
  useTopicMessagesContext,
} from "@/components/topics/current-topic-provider";

type ContentProps = {
  loading: boolean;
  message?: MessageProps;
  recency: MessageRecency;
};

function Content(props: ContentProps) {
  if (props.loading) {
    return (
      <div className="flex align-center items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (props.message) {
    return (
      <Message
        {...props.message}
        variant="minimal"
        context="modal"
        {...getMessagePositionFlags(props.recency, props.message.id)}
      />
    );
  }

  return null;
}

export function MessageModal() {
  const [messageId, setMessageId] = useQueryState("messageId");
  const { messages, recency } = useTopicMessagesContext();
  const { topHighlights } = useTopicHighlightsContext();
  const thisMessage = [...messages, ...topHighlights].find(
    ({ id }) => id === messageId
  );

  const { data, isLoading: loading } = useQuery({
    queryKey: ["message", messageId],
    queryFn: () =>
      fetch(`/api/message/${messageId}`).then((r) => {
        if (!r.ok) throw new Error(`Request failed with status ${r.status}`);
        return r.json() as Promise<MessageProps>;
      }),
    enabled: !!messageId && !thisMessage,
  });

  const message = thisMessage ?? data;

  return (
    <Dialog
      open={Boolean(messageId)}
      onOpenChange={(open) => {
        if (!open) setMessageId(null);
      }}
    >
      <DialogContent className="px-4 pt-12">
        <Content loading={loading} message={message} recency={recency} />
        <DialogFooter>
          <DialogClose>
            <Button variant="ghost" type="button" autoFocus>
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
