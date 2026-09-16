"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Topic } from "@prisma/client";
import {
  DndContext,
  DragEndEvent,
  DraggableAttributes,
  DraggableSyntheticListeners,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  useSocketHandler,
  SocketEvent,
  useSocketEmit,
} from "@/components/socket/use-socket";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useSelf } from "@/components/auth/self-provider";
import { getInitials, UserAvatar } from "@/components/ui/user-avatar";
import {
  useActiveCircleMembers,
  ActiveUser,
} from "@/components/dashboard/active-circle-members-store";
import { useEffectOnce } from "@/lib/hooks/use-effect-once";
import { useLocalStorage } from "@/lib/hooks/use-local-storage";
import { UpsertTopicForm } from "@/components/topics/upsert-topic-form";
import { UpsertCircleForm } from "@/components/circles/upsert-circle-form";
import { reorderTopics } from "@/actions/topics";
import {
  ArrowRightIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CopyIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
  DragHandleDots2Icon,
  GearIcon,
  HomeIcon,
  PlusIcon,
  SpeakerLoudIcon,
  SpeakerOffIcon,
  CrossCircledIcon,
  MagnifyingGlassIcon,
} from "@radix-ui/react-icons";
import { Prisma } from "@prisma/client";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipProvider } from "@radix-ui/react-tooltip";
import { TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useUnreadTopics } from "@/components/dashboard/unread-topics-store";
import { Badge } from "@/components/ui/badge";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Input } from "@/components/ui/input";

type Props = {
  topics?: Topic[];
  unreadTopicIds: Record<string, boolean>;
  topicOrder: Record<string, number | null>;
  circle: Prisma.CircleGetPayload<{
    include: { members: true };
  }>;
};

type NewTopicHandlerProps = {
  id: string;
  name: string;
  isEdit: boolean;
  circleId: string;
  createdBy: {
    name: string;
    id: string;
  };
};

type DeletedTopicHandlerProps = {
  id: string;
  name: string;
  circleId: string;
  deletedBy: {
    name: string;
    id: string;
  };
};

type ReorderedTopicsHandlerProps = {
  circleId: string;
  orderedTopicIds: string[];
};

type TopicWithMeta = Topic & {
  isMuted: boolean;
  isUnread: boolean;
  isDefault: boolean;
};

type TopicRowProps = {
  topic: TopicWithMeta;
  circle: Props["circle"];
  isCurrentTopic: boolean;
  activeUsers: ActiveUser[];
  onToggleMute: () => void;
  onGoToTopic: () => void;
  onCopyLink: () => void;
  dragHandle?: {
    attributes: DraggableAttributes;
    listeners: DraggableSyntheticListeners;
  };
};

// Shared row content for both the sortable "active topics" group and the
// static "muted" group -- only the former passes `dragHandle`.
const TopicRow = ({
  topic,
  circle,
  isCurrentTopic,
  activeUsers,
  onToggleMute,
  onGoToTopic,
  onCopyLink,
  dragHandle,
}: TopicRowProps) => {
  const link = `/circles/${circle.id}/topics/${topic.id}`;

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div className="flex items-center gap-1">
          {dragHandle && (
            <button
              {...dragHandle.attributes}
              {...dragHandle.listeners}
              className="shrink-0 touch-none cursor-grab text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing"
              aria-label={`Reorder ${topic.name}`}
            >
              <DragHandleDots2Icon />
            </button>
          )}
          <Link href={link} className="min-w-0 flex-1">
            <Button
              variant={isCurrentTopic ? "secondary" : "ghost"}
              className="w-full flex justify-start text-base font-normal p-3"
            >
              <span
                className={cn(
                  "truncate min-w-0",
                  topic.isUnread &&
                    "underline decoration-wavy decoration-mention underline-offset-4",
                  topic.isMuted && "text-muted-foreground",
                )}
              >
                {topic.name}
              </span>
              <div className="flex gap-1 ml-auto shrink-0">
                {activeUsers.map((user) => (
                  <UserAvatar
                    key={user.id}
                    id={user.id}
                    name={user.name}
                    imageUrl={user.imageUrl}
                    createdAt={user.createdAt}
                    size="xs"
                    showStatus={false}
                    status={user.status}
                    lastStatusUpdate={user.lastStatusUpdate}
                  />
                ))}
              </div>
            </Button>
          </Link>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-30">
        <ContextMenuItem onClick={onGoToTopic}>
          Go to topic
          <ContextMenuShortcut>
            <ArrowRightIcon />
          </ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={onToggleMute}>
          {topic.isMuted ? "Unmute" : "Mute"}
          <ContextMenuShortcut>
            {topic.isMuted ? <SpeakerLoudIcon /> : <SpeakerOffIcon />}
          </ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={onCopyLink}>
          Copy link
          <ContextMenuShortcut>
            <CopyIcon />
          </ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

const SortableTopicRow = (props: Omit<TopicRowProps, "dragHandle">) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: props.topic.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TopicRow {...props} dragHandle={{ attributes, listeners }} />
    </div>
  );
};

export const TopicsList = ({
  topics,
  circle,
  unreadTopicIds,
  topicOrder,
}: Props) => {
  const params = useParams();
  const self = useSelf();
  const router = useRouter();
  const { toast } = useToast();
  const { getActiveMembersInTopic } = useActiveCircleMembers();
  const [showTopics, setShowTopics] = useState(false);
  const { unreadTopics, hydrateUnreadTopics } = useUnreadTopics();
  const [isMinimized, setIsMinimized] = useLocalStorage(
    `tim:topics-nav-minimized:${self.id}`,
    false,
  );
  const [mutedTopics, setMutedTopics] = useLocalStorage<string[]>(
    `tim:muted-topics:${self.id}`,
    [],
  );
  const [isMutedSectionCollapsed, setIsMutedSectionCollapsed] = useLocalStorage(
    `tim:muted-topics-collapsed:${self.id}`,
    false,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [dragOverrideIds, setDragOverrideIds] = useState<string[] | null>(null);

  const reorderedTopics = useSocketEmit(SocketEvent.ReorderedTopics);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffectOnce(() => {
    hydrateUnreadTopics(unreadTopicIds);
    setShowTopics(true);
  });

  // A fresh `topicOrder` prop means the server round-trip from our own (or
  // someone else's) reorder has landed -- drop the optimistic override so
  // real data takes over.
  useEffect(() => {
    setDragOverrideIds(null);
  }, [topicOrder]);

  const isGroupedView = !isMinimized && !searchQuery;

  // Legacy flat sort -- used while minimized (avatar rail) or searching,
  // where grouping/dragging doesn't apply.
  const flatTopics = useMemo(() => {
    if (!topics) return [];

    return topics
      .map((topic) => {
        const isMuted = mutedTopics.includes(topic.id);
        const isUnread = unreadTopics[topic.id];
        const isDefault = circle.defaultTopicId === topic.id;

        return { ...topic, isMuted, isUnread, isDefault };
      })
      .filter((topic) => {
        if (isMinimized) return true;
        return topic.name.toLowerCase().includes(searchQuery.toLowerCase());
      })
      .sort((a, b) => {
        if (a.isDefault !== b.isDefault) {
          return a.isDefault ? -1 : 1;
        }

        if (a.isMuted !== b.isMuted) {
          return a.isMuted ? 1 : -1;
        }

        if (a.isUnread !== b.isUnread) {
          return a.isUnread ? -1 : 1;
        }

        return 0;
      });
  }, [
    topics,
    mutedTopics,
    unreadTopics,
    circle.defaultTopicId,
    searchQuery,
    isMinimized,
  ]);

  const grouped = useMemo(() => {
    if (!topics) {
      return {
        defaultTopic: undefined as TopicWithMeta | undefined,
        activeTopics: [] as TopicWithMeta[],
        mutedTopicsList: [] as TopicWithMeta[],
      };
    }

    const withMeta: (TopicWithMeta & {
      sortOrder: number | null;
      createdIndex: number;
    })[] = topics.map((topic, createdIndex) => ({
      ...topic,
      isMuted: mutedTopics.includes(topic.id),
      isUnread: unreadTopics[topic.id],
      isDefault: circle.defaultTopicId === topic.id,
      sortOrder: topicOrder[topic.id] ?? null,
      createdIndex,
    }));

    const byOrder = (
      a: (typeof withMeta)[number],
      b: (typeof withMeta)[number],
    ) => {
      if (a.sortOrder !== null && b.sortOrder !== null) {
        return a.sortOrder - b.sortOrder;
      }
      if (a.sortOrder !== null) return -1;
      if (b.sortOrder !== null) return 1;
      return a.createdIndex - b.createdIndex;
    };

    return {
      defaultTopic: withMeta.find((topic) => topic.isDefault),
      activeTopics: withMeta
        .filter((topic) => !topic.isDefault && !topic.isMuted)
        .sort(byOrder),
      mutedTopicsList: withMeta
        .filter((topic) => !topic.isDefault && topic.isMuted)
        .sort(byOrder),
    };
  }, [topics, mutedTopics, unreadTopics, circle.defaultTopicId, topicOrder]);

  const displayedActiveTopics = useMemo(() => {
    if (!dragOverrideIds) return grouped.activeTopics;

    const byId = new Map(
      grouped.activeTopics.map((topic) => [topic.id, topic]),
    );
    return dragOverrideIds
      .map((id) => byId.get(id))
      .filter((topic): topic is TopicWithMeta => Boolean(topic));
  }, [grouped.activeTopics, dragOverrideIds]);

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;

    const oldIndex = displayedActiveTopics.findIndex(
      (topic) => topic.id === active.id,
    );
    const newIndex = displayedActiveTopics.findIndex(
      (topic) => topic.id === over.id,
    );

    if (oldIndex === -1 || newIndex === -1) return;

    const orderedTopicIds = arrayMove(
      displayedActiveTopics,
      oldIndex,
      newIndex,
    ).map((topic) => topic.id);

    setDragOverrideIds(orderedTopicIds);

    reorderTopics({ circleId: circle.id, orderedTopicIds }).then((success) => {
      if (success) {
        reorderedTopics.emit({ circleId: circle.id, orderedTopicIds });
      }
    });
  }

  useSocketHandler<NewTopicHandlerProps>(
    SocketEvent.UpsertedTopic,
    (payload) => {
      router.refresh();

      if (payload.circleId !== circle.id) return;
      if (payload.isEdit) return;

      const createdBySelf = payload.createdBy.id === self.id;
      const name = createdBySelf ? "You" : payload.createdBy.name;

      toast({
        title: `New topic created in ${circle.name}`,
        description: `${name} created a new topic called "${payload.name}"`,
        action: (
          <ToastAction
            altText="Go there now"
            onClick={() => {
              router.push(`/circles/${payload.circleId}/topics/${payload.id}`);
            }}
          >
            Go there now
          </ToastAction>
        ),
      });
    },
  );

  useSocketHandler<DeletedTopicHandlerProps>(
    SocketEvent.DeletedTopic,
    (payload) => {
      if (payload.id === params.topicId) {
        router.push(`/circles/${payload.circleId}`);
      }

      router.refresh();

      if (payload.circleId !== circle.id) return;

      const deletedBySelf = payload.deletedBy.id === self.id;
      const name = deletedBySelf ? "You" : payload.deletedBy.name;

      toast({
        title: `Topic deleted in ${circle.name}`,
        description: `${name} deleted the topic called "${payload.name}"`,
      });
    },
  );

  useSocketHandler<ReorderedTopicsHandlerProps>(
    SocketEvent.ReorderedTopics,
    (payload) => {
      if (payload.circleId !== circle.id) return;
      router.refresh();
    },
  );

  if (!topics) {
    return <>No topics yet...</>;
  }

  const rowPropsFor = (topic: TopicWithMeta) => ({
    topic,
    circle,
    isCurrentTopic: topic.id === params.topicId,
    activeUsers: getActiveMembersInTopic(topic.id),
    onGoToTopic: () => router.push(`/circles/${circle.id}/topics/${topic.id}`),
    onToggleMute: () => {
      setMutedTopics((mutedTopicIds) => {
        return topic.isMuted
          ? mutedTopicIds.filter((id) => id !== topic.id)
          : [...mutedTopicIds, topic.id];
      });
    },
    onCopyLink: () => {
      navigator.clipboard.writeText(
        `${window.location.host}/circles/${circle.id}/topics/${topic.id}`,
      );
      toast({ duration: 3000, title: `Link copied` });
    },
  });

  return (
    <div
      className={cn(
        `flex flex-col shadow-md border-r shrink-0`,
        isMinimized
          ? ""
          : "max-w-sidebar-nav min-w-sidebar-nav lg:max-w-sidebar-nav-lg lg:min-w-sidebar-nav-lg",
      )}
    >
      <div
        className={cn(
          `flex block p-3 border-b whitespace-nowrap text-ellipsis font-medium flex`,
          isMinimized ? "justify-center" : "",
        )}
      >
        {!isMinimized && circle.name}
        <Button
          className={cn(`font-normal`, isMinimized ? "" : "flex ml-auto")}
          size="iconSm"
          variant="ghost"
          onClick={() => setIsMinimized(!isMinimized)}
        >
          {isMinimized ? <DoubleArrowRightIcon /> : <DoubleArrowLeftIcon />}
        </Button>
      </div>

      {!isMinimized && (
        <div className="px-3 pt-3">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <CrossCircledIcon width={16} height={16} />
              </button>
            )}
          </div>
        </div>
      )}

      <ScrollArea>
        <div className="flex flex-col gap-3 p-3">
          {showTopics &&
            !isGroupedView &&
            flatTopics.length === 0 &&
            searchQuery &&
            !isMinimized && (
              <div className="text-center text-sm text-muted-foreground py-2">
                No topics found for{" "}
                <span className="font-medium">&quot;{searchQuery}&quot;</span>
              </div>
            )}

          {showTopics &&
            !isGroupedView &&
            flatTopics.map((topic) => {
              const activeUsers = getActiveMembersInTopic(topic.id);
              const link = `/circles/${circle.id}/topics/${topic.id}`;
              const isMuted = mutedTopics.includes(topic.id);
              const isUnread =
                !isMuted &&
                unreadTopics[topic.id] &&
                params.topicId !== topic.id;

              return (
                <ContextMenu key={topic.id}>
                  <Link href={link}>
                    {isMinimized ? (
                      <TooltipProvider>
                        <Tooltip delayDuration={100}>
                          <TooltipTrigger>
                            <div className="relative">
                              <Avatar
                                className={`active:border ${
                                  params.topicId === topic.id
                                    ? "border shadow-glow"
                                    : "shadow-lg hover:opacity-80"
                                }`}
                              >
                                <AvatarFallback
                                  className={
                                    isUnread
                                      ? "bg-highlight dark:bg-purple-900 border"
                                      : ""
                                  }
                                >
                                  <div className="mt-[1.5px]">
                                    {topic.id === circle.defaultTopicId ? (
                                      <HomeIcon height={16} width={16} />
                                    ) : (
                                      <span>
                                        {getInitials(
                                          topic.name.replace(
                                            /([✀-➿]|[-]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[‑-⛿]|\uD83E[\uDD10-\uDDFF])/g,
                                            "",
                                          ),
                                        )}
                                      </span>
                                    )}
                                  </div>
                                </AvatarFallback>
                              </Avatar>
                              {activeUsers.length > 0 && (
                                <div className="border absolute top-[-4px] right-[-4px] w-[16px] h-[16px] text-[10px] rounded-full bg-purple-500 text-slate-100 flex items-center justify-center">
                                  {activeUsers.length}
                                </div>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent
                            side="right"
                            className="p-2"
                            sideOffset={8}
                          >
                            <div className="flex flex-col gap-2">
                              <div className="text-sm leading-none flex items-center gap-1">
                                <span>{topic.name}</span>
                                {isUnread && (
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] p-1 tracking-wide dark:bg-purple-900"
                                  >
                                    New messages
                                  </Badge>
                                )}
                              </div>
                              {activeUsers.length > 0 && (
                                <div className="flex gap-1">
                                  {activeUsers.map((user) => {
                                    return (
                                      <UserAvatar
                                        key={user.id}
                                        id={user.id}
                                        name={user.name}
                                        imageUrl={user.imageUrl}
                                        createdAt={user.createdAt}
                                        size="xs"
                                        showStatus={false}
                                        status={user.status}
                                        lastStatusUpdate={user.lastStatusUpdate}
                                      />
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <ContextMenuTrigger>
                        <Button
                          variant={
                            topic.id === params.topicId ? "secondary" : "ghost"
                          }
                          className="w-full flex justify-start text-base font-normal p-3"
                        >
                          <span
                            className={cn(
                              "truncate min-w-0",
                              isUnread &&
                                "underline decoration-wavy decoration-mention underline-offset-4",
                              isMuted && "text-muted-foreground",
                            )}
                          >
                            {topic.name}
                          </span>
                          <div className="flex gap-1 ml-auto shrink-0">
                            {activeUsers.map((user) => (
                              <UserAvatar
                                key={user.id}
                                id={user.id}
                                name={user.name}
                                imageUrl={user.imageUrl}
                                createdAt={user.createdAt}
                                size="xs"
                                showStatus={false}
                                status={user.status}
                                lastStatusUpdate={user.lastStatusUpdate}
                              />
                            ))}
                          </div>
                        </Button>
                      </ContextMenuTrigger>
                    )}
                  </Link>
                  <ContextMenuContent className="w-30">
                    <ContextMenuItem onClick={() => router.push(link)}>
                      Go to topic
                      <ContextMenuShortcut>
                        <ArrowRightIcon />
                      </ContextMenuShortcut>
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() => {
                        setMutedTopics((mutedTopicIds) => {
                          return isMuted
                            ? mutedTopicIds.filter((id) => id !== topic.id)
                            : [...mutedTopicIds, topic.id];
                        });
                      }}
                    >
                      {isMuted ? "Unmute" : "Mute"}
                      <ContextMenuShortcut>
                        {isMuted ? <SpeakerLoudIcon /> : <SpeakerOffIcon />}
                      </ContextMenuShortcut>
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `${window.location.host}${link}`,
                        );
                        toast({
                          duration: 3000,
                          title: `Link copied`,
                        });
                      }}
                    >
                      Copy link
                      <ContextMenuShortcut>
                        <CopyIcon />
                      </ContextMenuShortcut>
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              );
            })}

          {showTopics && isGroupedView && (
            <>
              {grouped.defaultTopic && (
                <TopicRow {...rowPropsFor(grouped.defaultTopic)} />
              )}

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={displayedActiveTopics.map((topic) => topic.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="flex flex-col gap-3">
                    {displayedActiveTopics.map((topic) => (
                      <SortableTopicRow
                        key={topic.id}
                        {...rowPropsFor(topic)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              {grouped.mutedTopicsList.length > 0 && (
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() =>
                      setIsMutedSectionCollapsed(!isMutedSectionCollapsed)
                    }
                    className="flex items-center gap-1 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
                  >
                    {isMutedSectionCollapsed ? (
                      <ChevronRightIcon />
                    ) : (
                      <ChevronDownIcon />
                    )}
                    Muted ({grouped.mutedTopicsList.length})
                  </button>

                  {!isMutedSectionCollapsed &&
                    grouped.mutedTopicsList.map((topic) => (
                      <TopicRow key={topic.id} {...rowPropsFor(topic)} />
                    ))}
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
      <div className="flex flex-col items-center mt-auto gap-3 p-3">
        <UpsertTopicForm
          circleId={circle.id ?? ""}
          circleName={circle.name}
          trigger={
            isMinimized ? (
              <TooltipProvider>
                <Tooltip delayDuration={100}>
                  <TooltipTrigger asChild>
                    <div>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="rounded-full"
                      >
                        <PlusIcon />
                      </Button>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">New topic</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : undefined
          }
        />
        <UpsertCircleForm
          existingCircle={circle ?? undefined}
          trigger={
            isMinimized ? (
              <TooltipProvider>
                <Tooltip delayDuration={100}>
                  <TooltipTrigger asChild>
                    <div>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="rounded-full"
                      >
                        <GearIcon />
                      </Button>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">Circle settings</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <Button variant="ghost" className="flex gap-3 w-full">
                <span>Circle settings</span>
                <span>
                  <GearIcon />
                </span>
              </Button>
            )
          }
        />
      </div>
    </div>
  );
};
