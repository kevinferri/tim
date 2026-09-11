import { cn, isEmojiOnly } from "@/lib/utils";
import Link from "next/link";
import { useMemo } from "react";
import { SocketEvent, useSocketEmit } from "@/components/socket/use-socket";
import {
  CircleMember,
  CircleTopic,
  useTopicMetaContext,
} from "@/components/topics/current-topic-provider";
import { UserAvatar } from "@/components/ui/user-avatar";
import { CommandIcon } from "@/components/topics/command-icon";
import { getDisplayName } from "@tim/user-display";
import { MessageToken, tokenizeMessage } from "@/components/topics/message-utils";
import Linkify from "linkify-react";

type Props = {
  id: string;
  topicId: string;
  text?: string | null;
  isNewestMessage?: boolean;
};

// Renders "@Name" and "#Topic" as clickable elements only for names/topics
// that actually exist in the circle, so an arbitrary "@" or "#" the user
// typed doesn't get styled as if it were a real link -- tokenizeMessage only
// recognizes the names/topics it's given. Styled like the embedded links
// below (underline + text-mention), not like the font-pronounced command
// highlighting -- both are actually clickable (a mention opens a profile
// via the same trigger the sender name uses in message.tsx; a topic link
// navigates to that topic), so they should read as links, not as
// decoration. The hover fade lives on that shared trigger wrapper.
//
// A mention selected from the dropdown carries the exact member's id (see
// selectMention in topic-message-bar.tsx), so it resolves unambiguously via
// membersById even when two members share a first name. A mention with no
// id -- a plain "@Name" typed by hand, or one sent before this format
// existed -- falls back to matching display name, which membersByName
// resolves to whichever same-named member comes last in circleMembers.
// Topic links match on the full topic name (see selectTopicLink), which is
// unique per circle.
function renderTokens(
  tokens: MessageToken[],
  topicId: string,
  circleId: string,
  membersById: Map<string, CircleMember>,
  membersByName: Map<string, CircleMember>,
  topicsByName: Map<string, CircleTopic>
) {
  return tokens.map((token, index) => {
    switch (token.type) {
      case "command":
        return (
          <span key={index}>
            <CommandIcon
              name={token.name}
              className="mr-1 inline-block h-4 w-4 align-text-bottom"
            />
            <span className="font-pronounced">{token.value}</span>
          </span>
        );

      case "mention": {
        const member = token.id
          ? membersById.get(token.id)
          : membersByName.get(token.value.slice(1));
        const mentionSpan = (
          <span className="underline text-mention underline-offset-4">
            {token.value}
          </span>
        );

        return member ? (
          <UserAvatar
            key={index}
            id={member.id}
            topicId={topicId}
            name={member.name}
            imageUrl={member.imageUrl}
            status={member.status}
            lastStatusUpdate={member.lastStatusUpdate}
          >
            {mentionSpan}
          </UserAvatar>
        ) : (
          <span key={index}>{mentionSpan}</span>
        );
      }

      case "topicLink": {
        const topic = topicsByName.get(token.value.slice(1));

        return topic ? (
          <Link
            key={index}
            href={`/circles/${circleId}/topics/${topic.id}`}
            className="underline text-mention underline-offset-4 hover:opacity-80"
          >
            {token.value}
          </Link>
        ) : (
          <span key={index}>{token.value}</span>
        );
      }

      default:
        return token.value;
    }
  });
}

function parseMessage(
  text: string,
  topicId: string,
  circleId: string,
  membersById: Map<string, CircleMember>,
  membersByName: Map<string, CircleMember>,
  topicsByName: Map<string, CircleTopic>
) {
  if (!text) return text;

  const tokens = tokenizeMessage(
    text,
    Array.from(membersByName.keys()),
    Array.from(topicsByName.keys())
  );

  return (
    <>
      {renderTokens(
        tokens,
        topicId,
        circleId,
        membersById,
        membersByName,
        topicsByName
      )}
    </>
  );
}

export function MessageText(props: Props) {
  const { circleId, circleMembers, circleTopics } = useTopicMetaContext();
  const membersById = useMemo(() => {
    const map = new Map<string, CircleMember>();
    for (const member of circleMembers) {
      map.set(member.id, member);
    }
    return map;
  }, [circleMembers]);
  const membersByName = useMemo(() => {
    const map = new Map<string, CircleMember>();
    for (const member of circleMembers) {
      if (member.name) map.set(getDisplayName(member.name), member);
    }
    return map;
  }, [circleMembers]);
  const topicsByName = useMemo(() => {
    const map = new Map<string, CircleTopic>();
    for (const topic of circleTopics) {
      map.set(topic.name, topic);
    }
    return map;
  }, [circleTopics]);

  const isOnlyEmoji = useMemo(
    () => (props.text ? isEmojiOnly(props.text) : false),
    [props.text]
  );

  const clickedLink = useSocketEmit<{ messageId: string; topicId: string }>(
    SocketEvent.UserClickedLink
  );

  return (
    <Linkify
      options={{
        render: {
          url: ({ attributes, content }) => (
            <Link
              href={attributes.href}
              target="_blank"
              className="underline text-mention underline-offset-4 hover:opacity-80"
              onClick={() => {
                clickedLink.emit({
                  topicId: props.topicId,
                  messageId: props.id,
                });
              }}
            >
              {content}
            </Link>
          ),
        },
      }}
    >
      <div
        className={cn(
          "whitespace-pre-line break-word leading-normal",
          isOnlyEmoji ? "text-4xl" : ""
        )}
        style={{ overflowWrap: "anywhere" }}
      >
        {props.text
          ? parseMessage(
              props.text,
              props.topicId,
              circleId,
              membersById,
              membersByName,
              topicsByName
            )
          : null}
      </div>
    </Linkify>
  );
}
