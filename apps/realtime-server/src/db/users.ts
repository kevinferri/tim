import { User } from "@tim/db-types";
import { pgClient } from "./client";

export async function getUserSummary({ userId }: { userId: string }) {
  return await pgClient<User>("users")
    .select("id", "imageUrl", "name")
    .where("id", userId)
    .first();
}
