"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type FormEvent,
} from "react";
import {
  TABLE_CHAT_MAX_LENGTH,
  type TableChatEvent,
  type TableChatLine,
  type TableChatPerson,
  type TableChatSay,
} from "@tim/casino";
import {
  ChatBubbleIcon,
  DoubleArrowRightIcon,
  EnterIcon,
  ExitIcon,
} from "@radix-ui/react-icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { getInitials } from "@/components/ui/user-avatar";
import { cn } from "@/lib/utils";
import type { TableChat } from "../use-table-chat";

export type TableChatProps = TableChat & {
  selfId: string;
  /** Not connected to the table yet (or reconnecting). */
  disabled?: boolean;
};

const WIDE = "(min-width: 768px)";
const OPEN_KEY = "tim:table-chat-open";

function subscribeWide(onChange: () => void) {
  const media = window.matchMedia(WIDE);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/** The panel beside the felt on wide screens (open unless you closed it; a thin strip when closed), a sheet on phones; a dot for lines you missed. */
export function useTableChatPanel(chat: TableChatProps | undefined) {
  const wide = useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia(WIDE).matches,
    () => true,
  );
  const [open, setOpen] = useState(true);
  useEffect(() => {
    try {
      if (localStorage.getItem(OPEN_KEY) === "false") setOpen(false);
    } catch {}
  }, []);
  const [sheetOpen, setSheetOpen] = useState(false);
  const shown = wide ? open : sheetOpen;

  const [unread, setUnread] = useState(false);
  const latest = chat?.latest;
  useEffect(() => {
    if (latest && latest.userId !== chat?.selfId && !shown) setUnread(true);
    // Only a new line lights it, not opening or closing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latest]);
  useEffect(() => {
    if (shown) setUnread(false);
  }, [shown]);

  const setOpenSaved = (next: boolean) => {
    setOpen(next);
    try {
      localStorage.setItem(OPEN_KEY, String(next));
    } catch {}
  };
  const dot = unread && (
    <span className="absolute right-1 top-1 size-2 rounded-full bg-purple-500 ring-2 ring-background" />
  );

  return {
    /** Phones only: opens the sheet. On wide screens the panel has its own controls. */
    headerToggle: chat && (
      <Button
        variant="ghost"
        size="icon"
        className="relative size-8 md:hidden"
        onClick={() => setSheetOpen(true)}
        aria-label="Show table chat"
        title="Show table chat"
      >
        <ChatBubbleIcon />
        {dot}
      </Button>
    ),
    /** Wide screens: the panel beside the felt, or a thin strip to bring it back. */
    side:
      chat &&
      (open ? (
        <aside className="hidden w-80 shrink-0 flex-col border-l md:flex">
          {/* Header height, so its bottom line runs on from the table's header. */}
          <div className="grid h-12 shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b px-2">
            {/* Styled like the table's own title. */}
            <h2 className="col-start-2 text-sm font-medium">Table chat</h2>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 justify-self-end text-muted-foreground"
              onClick={() => setOpenSaved(false)}
              aria-label="Hide table chat"
              title="Hide table chat"
            >
              <DoubleArrowRightIcon />
            </Button>
          </div>
          <TableChatPanel {...chat} />
        </aside>
      ) : (
        <aside className="hidden w-11 shrink-0 flex-col items-center border-l md:flex">
          <div className="flex h-12 w-full shrink-0 items-center justify-center border-b">
            <Button
              variant="ghost"
              size="icon"
              className="relative size-8"
              onClick={() => setOpenSaved(true)}
              aria-label="Show table chat"
              title="Show table chat"
            >
              <ChatBubbleIcon />
              {dot}
            </Button>
          </div>
        </aside>
      )),
    sheet: chat && (
      <Sheet open={sheetOpen && !wide} onOpenChange={setSheetOpen}>
        {/* Room above the lines for the sheet's close button. */}
        <SheetContent className="flex w-full flex-col gap-0 p-0 pt-10 sm:max-w-sm">
          <SheetTitle className="sr-only">Table chat</SheetTitle>
          <TableChatPanel {...chat} />
        </SheetContent>
      </Sheet>
    ),
  };
}

/** Table talk: each line with its sender, and a plain text box. No replies, links, or media. */
export function TableChatPanel({
  lines,
  send,
  selfId,
  disabled,
}: TableChatProps) {
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);

  // Follows new lines unless you've scrolled up to read; your own always brings you down.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const last = lines.at(-1);
    if (atBottom.current || (last?.kind === "say" && last.userId === selfId)) {
      list.scrollTop = list.scrollHeight;
    }
  }, [lines, selfId]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim() || disabled) return;
    send(text);
    setText("");
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ScrollArea
        ref={listRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          atBottom.current =
            el.scrollHeight - el.scrollTop - el.clientHeight < 24;
        }}
        className="min-h-0 flex-1 px-3 [overflow-anchor:none]"
      >
        <ul className="flex flex-col pb-2 pt-3">
          {lines.map((line, i) => {
            const prev = lines[i - 1];
            return line.kind === "say" ? (
              <ChatLine
                key={line.id}
                line={line}
                isYou={line.userId === selfId}
                // Same sender as the line before: no avatar or name again.
                continues={prev?.kind === "say" && prev.userId === line.userId}
                first={i === 0}
              />
            ) : (
              <EventLine
                key={line.id}
                line={line}
                selfId={selfId}
                first={i === 0}
              />
            );
          })}
        </ul>
      </ScrollArea>
      <form onSubmit={submit} className="p-3">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={TABLE_CHAT_MAX_LENGTH}
          aria-label="Message the table"
          enterKeyHint="send"
          autoComplete="off"
          disabled={disabled}
        />
      </form>
    </div>
  );
}

function ChatLine({
  line,
  isYou,
  continues,
  first,
}: {
  line: TableChatSay;
  isYou: boolean;
  continues: boolean;
  first: boolean;
}) {
  if (continues) {
    return (
      // Lined up under the first line's text (avatar 24px + gap 8px).
      <li className="mt-0.5 pl-8">
        <p className="break-words text-sm">{line.text}</p>
      </li>
    );
  }
  return (
    <li className={cn("flex gap-2", !first && "mt-3")}>
      <ChatAvatar person={line} className="mt-0.5 size-6 text-[10px]" />
      <div className="min-w-0">
        <div className="truncate text-xs font-medium text-muted-foreground">
          {isYou ? "You" : line.displayName}
        </div>
        <p className="break-words text-sm">{line.text}</p>
      </div>
    </li>
  );
}

/** The table's own lines: who sat down or left, and each round's results. */
function EventLine({
  line,
  selfId,
  first,
}: {
  line: TableChatEvent;
  selfId: string;
  first: boolean;
}) {
  const Icon = line.kind === "joined" ? EnterIcon : ExitIcon;
  return (
    <li className={cn("flex justify-center", !first && "mt-2")}>
      {/* A small centered pill, so it reads as the table's note rather than someone talking. */}
      <span className="flex min-w-0 items-center gap-1 rounded-full bg-foreground/[0.06] px-2.5 py-0.5 text-[11px] text-muted-foreground">
        <Icon className="size-3 shrink-0" />
        <span className="truncate">
          {line.userId === selfId ? "You" : line.displayName}
        </span>
        {line.kind}
      </span>
    </li>
  );
}

function ChatAvatar({
  person,
  className,
}: {
  person: TableChatPerson;
  className: string;
}) {
  return (
    <Avatar className={cn("shrink-0", className)}>
      <AvatarImage src={person.imageUrl ?? undefined} alt="" />
      {/* Initials from the full name, as the seat's avatar does. */}
      <AvatarFallback>{getInitials(person.name ?? undefined)}</AvatarFallback>
    </Avatar>
  );
}

// One line, like the game calls; the panel has the rest.
const BUBBLE_CHARS = 36;

/** What a player said, over their avatar: ActionBubble (Hit, Stand) in white, in the message's own case. */
export function ChatBubble({ text, ms }: { text: string; ms: number }) {
  const shown =
    text.length > BUBBLE_CHARS
      ? `${text.slice(0, BUBBLE_CHARS - 1).trimEnd()}…`
      : text;
  return (
    <div
      className="flex animate-chat-bubble flex-col items-center motion-reduce:animate-none"
      style={{ "--bubble-hold": `${ms - 300}ms` } as CSSProperties}
    >
      {/* Normal letter spacing: the game calls' wide tracking is for one capitalized word. */}
      <span className="flex whitespace-nowrap rounded-full bg-white/90 px-3.5 py-2 text-[13px] font-semibold text-neutral-900 shadow-lg ring-1 ring-black/10">
        {/* Trimmed as ActionBubble's word is, so the padding matches. */}
        <span className="leading-none [text-box:trim-both_cap_alphabetic]">
          {shown}
        </span>
      </span>
      <span
        aria-hidden
        className="-mt-px size-0 border-x-[6px] border-t-[7px] border-x-transparent border-t-white/90"
      />
    </div>
  );
}
