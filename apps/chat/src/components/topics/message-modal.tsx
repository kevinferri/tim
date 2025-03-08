"use client";

import { useQueryState } from "nuqs";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { useFetch } from "@/lib/hooks";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Message, MessageProps } from "@/components/topics/message";
import { useCurrentTopicContext } from "@/components/topics/current-topic-provider";

type ContentProps = {
  loading: boolean;
  message?: MessageProps;
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
    return <Message {...props.message} variant="minimal" context="modal" />;
  }

  return null;
}

export function MessageModal() {
  const [messageId, setMessageId] = useQueryState("messageId");
  const { messages, topHighlights } = useCurrentTopicContext();
  const thisMessage = [...messages, ...topHighlights].find(
    ({ id }) => id === messageId
  );

  const { data, loading } = useFetch<MessageProps>({
    url: `/api/message/${messageId}`,
    skip: !messageId || Boolean(thisMessage),
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
        <Content loading={loading} message={message} />
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
