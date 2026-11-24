import { User } from "@tim/db-types";
import { pgClient } from "./client";

export async function getUserSummary({ userId }: { userId: string }) {
  return await pgClient<User>("users")
    .select("id", "imageUrl", "name", "displayName")
    .where("id", userId)
    .first();
}

export type UserStatus = Pick<User, "status" | "lastStatusUpdate">;

export async function getUserStatus({
  userId,
}: {
  userId: string;
}): Promise<UserStatus | undefined> {
  return await pgClient<User>("users")
    .select("status", "lastStatusUpdate")
    .where("id", userId)
    .first();
}

/** Sets the status, but only while it's still `ifStatus` (when given); false if it had changed. */
export async function setUserStatus({
  userId,
  status,
  lastStatusUpdate,
  ifStatus,
}: UserStatus & { userId: string; ifStatus?: string }) {
  const query = pgClient<User>("users")
    .where("id", userId)
    .update({ status, lastStatusUpdate });
  if (ifStatus !== undefined) query.where("status", ifStatus);
  return (await query) > 0;
}
