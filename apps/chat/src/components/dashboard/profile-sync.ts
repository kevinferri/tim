"use client";

import { useQueryClient } from "@tanstack/react-query";
import { SocketEvent, useSocketHandler } from "@/components/socket/use-socket";
import { useCoalescedRefresh } from "@/lib/hooks/use-coalesced-refresh";
import type { UserUpdatedProfilePayload } from "@/components/dashboard/active-circle-members-store";
import {
  updateUserProfileInCaches,
  withUserProfile,
} from "@/components/topics/provider/topic-query-cache";
import { updateNotificationActorsAndMessages } from "@/components/notifications/notification-query-cache";

export function useProfileSync() {
  const queryClient = useQueryClient();
  const refresh = useCoalescedRefresh();

  useSocketHandler<UserUpdatedProfilePayload>(
    SocketEvent.UserUpdatedProfile,
    ({ user: { id, ...profile } }) => {
      updateUserProfileInCaches(queryClient, id, profile);
      updateNotificationActorsAndMessages(queryClient, id, {
        actor: profile,
        message: withUserProfile(id, profile),
      });
      // Members list, self, etc. come from SSR props rather than the query cache.
      refresh();
    },
  );
}
