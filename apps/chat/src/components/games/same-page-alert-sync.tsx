"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  SocketEvent,
  useSocketHandler,
} from "@/components/socket/use-socket";
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useGamesUiStore } from "@/components/games/games-ui-store";
import type { SamePageAlertPayload } from "@tim/socket-types";

function copyFor(kind: SamePageAlertPayload["kind"], prompt?: string) {
  if (kind === "prompt") {
    return {
      title: "Same Page is live",
      description: prompt
        ? `Today’s prompt: ${prompt}`
        : "Open Game Room to play.",
    };
  }
  if (kind === "nudge") {
    return {
      title: "Same Page locks at 4pm",
      description: "You haven’t answered yet — still time.",
    };
  }
  return {
    title: "Same Page results are in",
    description: "See who matched you.",
  };
}

/** Toast + badge refresh when the Same Page scheduler fires. */
export function SamePageAlertSync() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const openSamePage = useGamesUiStore((s) => s.openSamePage);

  useSocketHandler<SamePageAlertPayload>(
    SocketEvent.SamePageAlert,
    (payload) => {
      queryClient.invalidateQueries({
        queryKey: ["games-badge", payload.circleId],
      });
      queryClient.invalidateQueries({
        queryKey: ["same-page", payload.circleId],
      });

      const copy = copyFor(payload.kind, payload.prompt);
      const view = payload.kind === "reveal" ? "results" : "play";

      toast({
        title: copy.title,
        description: copy.description,
        action: (
          <ToastAction
            altText="Open Same Page"
            onClick={() => openSamePage(view)}
          >
            Open
          </ToastAction>
        ),
      });
    },
  );

  return null;
}
