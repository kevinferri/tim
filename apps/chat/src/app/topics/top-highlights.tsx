import { DEFAULT_MESSAGE_SELECT } from "@/lib/prisma/message-model";
import { prismaClient } from "@/lib/prisma/client";
import { ScrollArea } from "@/components/ui/scroll-area";

type Props = {
  topicId: string;
};

export async function TopHighlights(props: Props) {
  const messages = await prismaClient.message.getTopHighlightedMessagesForTopic(
    {
      topicId: props.topicId,
      select: DEFAULT_MESSAGE_SELECT,
    }
  );

  return (
    <ScrollArea>
      {messages.map((m) => {
        return (
          <div key={m.id}>
            {m.text} ({m.highlights.length})
          </div>
        );
      })}
    </ScrollArea>
  );
}
