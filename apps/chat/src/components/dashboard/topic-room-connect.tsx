"use client";

import { useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import {
  RoomType,
  useRoomManagement,
} from "@/components/socket/use-current-user-rooms";

// Lives in the root layout rather than the topic page so a topic switch (whose loading.tsx unmounts the page) doesn't leave the room until the next one has loaded.
export function TopicRoomConnect() {
  const { joinRoom, leaveRoom } = useRoomManagement();
  const params = useParams<{ topicId?: string }>();
  const topicId = params?.topicId;
  const joinedTopicId = useRef<string | undefined>(undefined);

  useEffect(() => {
    const previousTopicId = joinedTopicId.current;
    if (previousTopicId === topicId) return;

    // Join before leaving so the user never drops out of the circle's presence mid-switch.
    if (topicId) joinRoom(topicId, RoomType.Topic);
    if (previousTopicId) leaveRoom(previousTopicId, RoomType.Topic);
    joinedTopicId.current = topicId;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId]);

  return null;
}
